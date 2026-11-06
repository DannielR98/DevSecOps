$ErrorActionPreference = "Stop"
$serverlessDir = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path (Split-Path -Parent $serverlessDir) "frontend\quiz"
$configPath = Join-Path $PSScriptRoot "config.json"

if (-not (Test-Path $configPath)) {
  throw "Copy local\config.example.json to local\config.json and fill in the Supabase URL and public anon key."
}
$config = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
if (-not $config.supabaseUrl -or $config.supabaseUrl -notmatch '^https://[^/]+/?$' -or
    $config.supabaseUrl -match 'your-project' -or -not $config.supabaseAnonKey -or
    $config.supabaseAnonKey -match '^your-public-') {
  throw "Set a valid HTTPS Supabase URL and public anon key in local\config.json."
}
if ($null -ne $config.supabaseJwtSecret -and $config.supabaseJwtSecret -isnot [string]) {
  throw "supabaseJwtSecret must be a string in local\config.json."
}
if ($config.frontendOrigin -ne "http://localhost:3000") {
  throw "frontendOrigin must be http://localhost:3000 for this local setup."
}
if (-not (Test-Path (Join-Path $serverlessDir "node_modules\yaml")) -or
    -not (Test-Path (Join-Path $frontendDir "node_modules\vite\bin\vite.js"))) {
  throw "Run npm ci in both serverless and frontend\quiz before starting."
}
foreach ($tool in @("node", "npm", "docker", "sam")) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
    throw "Required tool not found: $tool"
  }
}
foreach ($port in @(3000, 3001)) {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
  try {
    $listener.Start()
  } catch {
    throw "Port $port is already in use. Stop the other service before starting the local environment."
  } finally {
    $listener.Stop()
  }
}

$suffix = [guid]::NewGuid().ToString("N").Substring(0, 12)
$network = "quiz-local-$suffix"
$container = "quiz-dynamodb-$suffix"
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "quiz-local-$suffix"
$tempEnv = Join-Path $tempDir "env.json"
$frontendProcess = $null
$networkCreated = $false
$containerStarted = $false
$savedEnv = @{}
$envNames = @("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN", "AWS_PROFILE", "AWS_DEFAULT_REGION", "AWS_REGION", "VITE_API_URL", "VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY")
foreach ($name in $envNames) {
  $savedEnv[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
}

try {
  Set-Location $serverlessDir
  & npm run build
  if ($LASTEXITCODE -ne 0) { throw "Serverless build failed." }

  & docker network create $network | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not create the local Docker network." }
  $networkCreated = $true

  & docker run -d --rm --name $container --network $network --network-alias dynamodb `
    -p "127.0.0.1::8000" amazon/dynamodb-local:latest -jar DynamoDBLocal.jar -inMemory -sharedDb | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not start DynamoDB Local." }
  $containerStarted = $true

  $binding = & docker port $container 8000
  if ($LASTEXITCODE -ne 0 -or $binding -notmatch '^127\.0\.0\.1:(\d+)$') {
    throw "Could not determine the DynamoDB Local port."
  }
  & node (Join-Path $PSScriptRoot "init-dynamodb.mjs") "http://127.0.0.1:$($Matches[1])"
  if ($LASTEXITCODE -ne 0) { throw "Could not initialize DynamoDB Local tables." }

  New-Item -ItemType Directory -Path $tempDir | Out-Null
  $localSecret = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
  $variables = @{
    Parameters = @{
      USERS_TABLE = "local-users"
      UNIQUES_TABLE = "local-unique-keys"
      GROUPS_TABLE = "local-groups"
      MEMBERS_TABLE = "local-group-members"
      QUIZZES_TABLE = "local-quizzes"
      RESULTS_TABLE = "local-quiz-results"
      DYNAMODB_ENDPOINT = "http://dynamodb:8000"
      JWT_SECRET = $localSecret
      SUPABASE_URL = $config.supabaseUrl.TrimEnd("/")
    }
  }
  if ($config.supabaseJwtSecret) {
    $variables.Parameters.SUPABASE_JWT_SECRET = $config.supabaseJwtSecret
  } elseif ($env:SUPABASE_JWT_SECRET) {
    $variables.Parameters.SUPABASE_JWT_SECRET = $env:SUPABASE_JWT_SECRET
  }
  $json = $variables | ConvertTo-Json -Depth 4
  [System.IO.File]::WriteAllText($tempEnv, $json, [System.Text.UTF8Encoding]::new($false))

  $env:AWS_ACCESS_KEY_ID = "local"
  $env:AWS_SECRET_ACCESS_KEY = "local"
  Remove-Item Env:\AWS_SESSION_TOKEN -ErrorAction SilentlyContinue
  Remove-Item Env:\AWS_PROFILE -ErrorAction SilentlyContinue
  $env:AWS_DEFAULT_REGION = "eu-north-1"
  $env:AWS_REGION = "eu-north-1"
  $env:VITE_API_URL = "http://localhost:3001/api/"
  $env:VITE_SUPABASE_URL = $config.supabaseUrl.TrimEnd("/")
  $env:VITE_SUPABASE_ANON_KEY = $config.supabaseAnonKey

  $vite = Join-Path $frontendDir "node_modules\vite\bin\vite.js"
  $frontendProcess = Start-Process -FilePath (Get-Command node).Source `
    -ArgumentList @("`"$vite`"", "--host", "127.0.0.1", "--port", "3000", "--strictPort") `
    -WorkingDirectory $frontendDir -NoNewWindow -PassThru
  $frontendReady = $false
  for ($i = 0; $i -lt 30; $i++) {
    if ($frontendProcess.HasExited) { throw "Frontend exited before becoming ready." }
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:3000/" -TimeoutSec 1
      if ($response.StatusCode -eq 200) { $frontendReady = $true; break }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  if (-not $frontendReady) { throw "Frontend did not become ready." }

  Write-Host "Frontend: http://localhost:3000"
  Write-Host "API: http://localhost:3001/api/ (Ctrl+C to stop; local database data will be lost)"
  $architecture = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x86_64" }
  & sam local start-api --template template.yaml --port 3001 --region eu-north-1 `
    --docker-network $network --env-vars $tempEnv `
    --parameter-overrides "JwtSecret=local-placeholder-at-least-32-characters" "AllowedOrigin=$($config.frontendOrigin)" `
      "FunctionArchitecture=$architecture" "FunctionTimeout=60"
  if ($LASTEXITCODE -ne 0) { throw "SAM local API exited with code $LASTEXITCODE." }
} finally {
  if ($frontendProcess -and -not $frontendProcess.HasExited) {
    Stop-Process -Id $frontendProcess.Id
  }
  if ($containerStarted) {
    & docker stop $container | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Warning "Could not stop container $container." }
  }
  if ($networkCreated) {
    & docker network rm $network | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Warning "Could not remove network $network." }
  }
  if (Test-Path $tempEnv) { Remove-Item -LiteralPath $tempEnv -Force }
  if (Test-Path $tempDir) { Remove-Item -LiteralPath $tempDir -Force }
  foreach ($name in $envNames) {
    [Environment]::SetEnvironmentVariable($name, $savedEnv[$name], "Process")
  }
}
