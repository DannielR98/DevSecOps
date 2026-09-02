import { useAuth0 } from "@auth0/auth0-react";
import GroupDashboard from "../../components/GroupDashboard";
import QuizManager from "../../components/QuizManager";

export default function HomePage() {
  const { isAuthenticated, user, loginWithRedirect } = useAuth0();

  return (
    <div style={{ padding: "3rem 2rem", fontFamily: "sans-serif", textAlign: "center" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
        Welcome to the DevSecOps Quiz Platform
      </h1>
      {isAuthenticated && user ? (
        <div>
          <div style={{ backgroundColor: "#f3f4f6", padding: "1.5rem", borderRadius: "8px", maxWidth: "600px", margin: "0 auto" }}>
            <h2>Hello, {user.name || user.nickname || "User"}! 👋</h2>
            <p style={{ color: "#4b5563", marginTop: "0.25rem" }}>Logged in as: {user.email}</p>
            <p style={{ color: "#10b981", fontWeight: "bold", marginTop: "0.5rem" }}>
              ✓ Authenticated securely via Auth0 (OAuth 2.0 / OIDC)
            </p>
          </div>

          <GroupDashboard />
          <QuizManager />
        </div>
      ) : (
        <div>
          <p style={{ marginBottom: "1.5rem", color: "#6b7280", fontSize: "1.1rem" }}>
            Secure identity management powered by Auth0. Log in to access quizzes and groups.
          </p>
          <button
            onClick={() => loginWithRedirect()}
            style={{
              padding: "0.75rem 2rem",
              backgroundColor: "#2563eb",
              color: "#fff",
              fontSize: "1.1rem",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            Log In / Sign Up with Auth0
          </button>
        </div>
      )}
    </div>
  );
}

