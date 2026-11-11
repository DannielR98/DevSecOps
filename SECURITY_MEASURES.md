# SECURITY_MEASURES.md

# Security Measures – Completed Work

## 1. Authentication

Authentication is required for protected API endpoints.

The following tests were performed using Postman:

- Requests without an access token were rejected.
- Requests with an invalid or expired token were rejected.
- Requests with a valid access token were accepted by the tested endpoint.

**Result:** Authentication checks passed for the tested endpoints.

## 2. Input Validation

Zod schemas are used to validate incoming API requests.

The following tests were performed:

- Empty group names were rejected.
- Group names exceeding 100 characters were rejected.
- Valid group names were accepted, and groups were created successfully.

The quiz creation handler also validates incoming data using `createQuizSchema`.

**Result:** Input validation is implemented and the tested invalid inputs were rejected.

## 3. User Data Protection

The `publicUser()` function removes the password field before returning user information.

The following tests were performed:

- A valid UUID returned the corresponding user profile.
- An invalid user ID was rejected.
- The tested response did not contain a password or password hash.

**Result:** Basic user-data protection was verified. Authorization restrictions for accessing other users' profiles and the complete user list still need verification.

## 4. Authorization, User Roles and Quiz Administrators

The application uses authentication and group membership checks to control access to certain operations.

### A. Implemented Authorization in Quiz Creation

The `createQuiz.js` handler includes several security checks:

- Authentication is required through the `route()` wrapper.
- Incoming quiz data is validated using `createQuizSchema`.
- The handler verifies that the requested group exists.
- Only users who belong to the group can create quizzes.
- The creator ID is taken from the authenticated user (`user.user_id`) instead of trusting an ID supplied by the client.

If the group does not exist, the API returns HTTP 404.

If the authenticated user is not a member of the group, the API returns HTTP 403.

**Result:** Authentication, input validation, group existence checks and group membership authorization are implemented in the quiz creation handler.

**Limitation:** Any group member can currently create a quiz. The handler does not distinguish between ordinary members and Quiz Admins.

### B. User Roles and Quiz Administrators

The planned role structure distinguishes between users and administrators assigned to individual quizzes.

- **User:** A registered user who can participate in quizzes.
- **Quiz Admin:** A user who has administrative permissions for a specific quiz.
- **Multiple Quiz Admins:** A quiz can have more than one administrator.

Quiz administrator permissions should be associated with a quiz and a user rather than automatically assigned as a global user role.

Two possible database designs have been identified:

1. **Separate quiz administrators table:** Stores `quiz_id` and `user_id` for each administrator.
2. **Administrator ID array:** Stores multiple user IDs in an administrator array within the quiz record.

A separate table is the recommended approach because it makes permissions easier to manage and maintain.

The proposed database table is `QuizAdmins`:

| Column | Purpose |
|---|---|
| `id` | Unique record ID |
| `quiz_id` | Identifies the quiz |
| `user_id` | Identifies the administrator |
| `createdAt` | Date assigned |

A unique constraint on `quiz_id` and `user_id` should prevent duplicate administrator assignments.

**Result:** The Quiz Admin role structure has been identified as a design requirement. Its database implementation and authorization checks are not yet verified.

## 5. Environment Variables and Secrets

Environment files are excluded using `.gitignore`.

The following checks were performed:

- Actual `.env` files are excluded from Git.
- Git tracking was checked.
- Only `.env.example` files were found in the tracked files.
- Example environment files contain placeholder values rather than actual secrets.

Frontend environment variables beginning with `VITE_` are exposed to the browser. Therefore, they must never contain private secrets such as service-role keys or database passwords.

**Result:** Environment-file protection was verified.

## 6. Logging and Monitoring

Logging is used to help identify application errors and monitor system activity.

The following measures were taken:

- Access-token logging was removed from `frontend/quiz/src/App.tsx`.
- Backend `console.log` statements were removed or commented out.
- Sensitive information should not be written to application logs.
- Application logs can be inspected using Docker Compose.
- AWS CloudWatch can be used for monitoring after deployment.

**Result:** Frontend access-token logging and backend `console.log` statements have been removed. Runtime log verification is still required to confirm that no sensitive information is exposed through other logging mechanisms.

## 7. Containerization and Infrastructure

Docker and Docker Compose are used to containerize the application and its supporting services.

The Docker Compose configuration includes:

- Frontend container.
- Backend container.
- PostgreSQL database container.
- pgAdmin container.
- Persistent volumes for database and application dependencies.
- Database health checks and service dependencies.

Separate Dockerfiles are available for frontend development and production builds.

**Result:** Dockerfiles and Docker Compose configuration are implemented. A final runtime demonstration should confirm that all services start and work correctly together.

## 8. Linting and Code Quality

Linting is used to check the source code for potential errors, syntax issues and code-style problems.

The linting process helps to:

- Identify unused variables and imports.
- Detect potential coding errors.
- Maintain consistent code style.
- Improve code readability and maintainability.

**Result:** Linting is included in the project's code-quality checks. The final lint command must be executed to confirm that it passes.

## 9. Automated Testing

Automated tests are used to verify that the application's main features and security controls work as expected.

The tests cover:

- Authentication and access control.
- User profile operations.
- Group creation and membership.
- Quiz creation, retrieval and updates.
- Quiz results and permissions.
- Input validation.
- Error handling.

The project uses Vitest for automated testing.

The latest test run reported:

- 11 test files executed.
- 10 test files passed.
- 134 tests passed.
- 1 test failed because it expected `console.error` to be called after a database error.

The failed test needs to be reviewed. Removing `console.log` does not automatically remove `console.error`; these are separate logging methods.

**Result:** Automated tests cover the main application functionality and security checks. The remaining failing test must be investigated, followed by another complete test run.

## 10. Conclusion

The project includes several implemented security measures:

- Authentication using access tokens.
- Input validation using Zod.
- Group membership checks when creating quizzes.
- Creator identity taken from the authenticated user.
- Password exclusion from public user responses.
- Environment-file protection using `.gitignore`.
- Removal of access-token logging.
- Docker-based containerization and infrastructure configuration.
- Linting and code-quality checks.
- Automated testing of application functionality and security controls.

Postman testing confirmed that missing and invalid tokens are rejected and that invalid input is handled correctly.

The quiz creation handler verifies group membership before allowing a user to create a quiz. However, it currently allows any group member to create quizzes.

A separate Quiz Admin role structure has been proposed to support multiple administrators per quiz. This functionality still needs to be implemented and tested.

The following tasks remain part of the final security verification:

- Verify authorization for user profiles and user-list endpoints.
- Implement and test Quiz Admin permissions if required.
- Run the final lint checks.
- Fix the remaining failing automated test and rerun the complete test suite.
- Verify application logs at runtime.
- Demonstrate that Docker Compose services work correctly.
- Complete the AWS deployment and monitoring demonstration.
- Perform the incident-response exercise using a leaked test token and document detection, containment and lessons learned.