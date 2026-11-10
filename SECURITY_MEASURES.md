# SECURITY_MEASURES.md

# Security Measures – Completed Work

## 1. Authentication

Authentication is required for protected API endpoints.

The following tests were performed using Postman:

- Requests without an access token were rejected.
- Requests with an invalid or expired token were rejected.
- Requests with a valid access token were accepted by the tested endpoint.

**Result:** Authentication checks passed.

## 2. Input Validation

Zod schemas are used to validate incoming API requests.

The following tests were performed:

- Empty group names were rejected.
- Group names exceeding 100 characters were rejected.
- Valid group names were accepted, and groups were created successfully.

**Result:** Input validation tests passed.

## 3. User Data Protection

The `publicUser()` function removes the password field before returning user information.

The following tests were performed:

- A valid UUID returned the corresponding user profile.
- An invalid user ID was rejected.
- The tested response did not contain a password or password hash.

**Result:** Basic user-data validation passed. Authorization restrictions for accessing other users' profiles and the complete user list still need verification.

## 4. Authorization and Access Control

The quiz creation handler:

- Requires authentication.
- Checks that the requested group exists.
- Checks that the authenticated user belongs to the group.
- Uses the authenticated user's ID as the quiz creator ID.

**Result:** Group membership checks are implemented in the reviewed quiz creation handler. Other group, quiz and result operations require separate authorization verification.

## 5. Environment Variables and Secrets

- Actual `.env` files are excluded using `.gitignore`.
- Git tracking was checked.
- Only `.env.example` files were found in the tracked files.
- Example environment files contain placeholder values rather than actual secrets.

**Result:** Environment-file protection was verified.

## 6. Logging and Monitoring

- Access-token logging was removed from `frontend/quiz/src/App.tsx`.
- Backend logging statements were reviewed.
- Sensitive information should not be written to application logs.
- Application logs can be inspected using Docker Compose and AWS CloudWatch.

Result: Frontend access-token logging and backend console.log statements have been removed. Runtime log verification is still required to confirm that no sensitive information is exposed through other logging mechanisms.

## 7. Conclusion

The project includes several implemented security measures:

- Authentication using access tokens.
- Input validation using Zod.
- Group membership checks when creating quizzes.
- Password exclusion from public user responses.
- Environment-file protection using `.gitignore`.
- Removal of access-token logging.

Postman testing confirmed that missing and invalid tokens are rejected and that invalid input is handled correctly.

Additional authorization tests and the incident-response exercise remain part of the final security verification.
