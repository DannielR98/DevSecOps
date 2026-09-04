import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../utilities/HeaderFunction";

export default function Navbar() {
  const {
    isAuthenticated,
    user,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
    isLoading,
  } = useAuth0();

  useEffect(() => {
    const syncUserWithBackend = async () => {
      if (isAuthenticated && user) {
        try {
          const token = await getAccessTokenSilently();
          await apiRequest({
            api: "sync-user",
            method: "POST",
            token,
            body: {
              email: user.email,
              name: user.name,
              nickname: user.nickname,
            },
          });
        } catch (err) {
          console.error("Error syncing Auth0 user with backend:", err);
        }
      }
    };

    syncUserWithBackend();
  }, [isAuthenticated, user, getAccessTokenSilently]);

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 2rem",
        backgroundColor: "#1f2937",
        color: "#fff",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <Link
          to="/"
          style={{
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1.25rem",
            textDecoration: "none",
          }}
        >
          🔒 DevSecOps Quiz
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {isLoading ? (
          <span style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
            Loading Auth...
          </span>
        ) : isAuthenticated && user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {user.picture && (
              <img
                src={user.picture}
                alt={user.name || "User"}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "2px solid #3b82f6",
                }}
              />
            )}
            <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>
              {user.name || user.email}
            </span>
            <button
              onClick={() =>
                logout({ logoutParams: { returnTo: window.location.origin } })
              }
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Log Out
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => loginWithRedirect()}
              style={{
                padding: "0.5rem 1.2rem",
                backgroundColor: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Log In / Register (Auth0)
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
