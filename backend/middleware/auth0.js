import { auth } from "express-oauth2-jwt-bearer";
import dotenv from "dotenv";

dotenv.config();

export const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE || "https://quiz-api.dev",
  issuerBaseURL:
    process.env.AUTH0_ISSUER_BASE_URL ||
    "https://dev-oz2aw2gea6l10gab.us.auth0.com/",
  tokenSigningAlg: "RS256",
});
