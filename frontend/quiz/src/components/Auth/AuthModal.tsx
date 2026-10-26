import { useState, type FormEvent } from "react";
import { supabase } from "../../supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = "login",
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name.trim() || email.split("@")[0],
              username: (name.trim() || email.split("@")[0])
                .toLowerCase()
                .replace(/\s+/g, "_"),
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          // Immediately authenticated (email confirmation disabled)
          onClose();
        } else {
          setSuccessMessage(
            "Konto skapat! Kolla din e-post om du behöver verifiera kontot, eller logga in.",
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        onClose();
      }
    } catch (err: unknown) {
      const errObj = err as { message?: string };
      setErrorMessage(
        errObj.message || "Ett fel uppstod under autentiseringen.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          margin: "1rem",
          background: "linear-gradient(145deg, #1e293b, #0f172a)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          color: "#f8fafc",
          padding: "2rem",
          position: "relative",
          animation: "fadeIn 0.2s ease-out",
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            fontSize: "1.25rem",
            cursor: "pointer",
            padding: "0.25rem 0.5rem",
            borderRadius: "6px",
          }}
          aria-label="Stäng"
        >
          ✕
        </button>

        {/* Header Tabs */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
              background: "linear-gradient(to right, #60a5fa, #a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {mode === "login" ? "Välkommen tillbaka" : "Skapa nytt konto"}
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
            Autentisering driven av Supabase
          </p>
        </div>

        {/* Tab switchers */}
        <div
          style={{
            display: "flex",
            background: "rgba(15, 23, 42, 0.6)",
            borderRadius: "8px",
            padding: "4px",
            marginBottom: "1.5rem",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "6px",
              border: "none",
              background: mode === "login" ? "#2563eb" : "transparent",
              color: mode === "login" ? "#fff" : "#94a3b8",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Logga in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "6px",
              border: "none",
              background: mode === "signup" ? "#2563eb" : "transparent",
              color: mode === "signup" ? "#fff" : "#94a3b8",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Skapa konto
          </button>
        </div>

        {/* Alert Messages */}
        {errorMessage && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#fca5a5",
              padding: "0.75rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              marginBottom: "1rem",
            }}
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              backgroundColor: "rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.4)",
              color: "#86efac",
              padding: "0.75rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              marginBottom: "1rem",
            }}
          >
            {successMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div style={{ marginBottom: "1rem" }}>
              <label
                htmlFor="auth-modal-name"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  color: "#cbd5e1",
                  marginBottom: "0.25rem",
                  fontWeight: 500,
                }}
              >
                Namn
              </label>
              <input
                id="auth-modal-name"
                type="text"
                placeholder="Ditt för- och efternamn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  color: "#f8fafc",
                  outline: "none",
                  fontSize: "0.95rem",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="auth-modal-email"
              style={{
                display: "block",
                fontSize: "0.875rem",
                color: "#cbd5e1",
                marginBottom: "0.25rem",
                fontWeight: 500,
              }}
            >
              E-postadress
            </label>
            <input
              id="auth-modal-email"
              type="email"
              placeholder="namn@exempel.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "8px",
                color: "#f8fafc",
                outline: "none",
                fontSize: "0.95rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="auth-modal-password"
              style={{
                display: "block",
                fontSize: "0.875rem",
                color: "#cbd5e1",
                marginBottom: "0.25rem",
                fontWeight: 500,
              }}
            >
              Lösenord
            </label>
            <input
              id="auth-modal-password"
              type="password"
              placeholder="Minst 6 tecken"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "8px",
                color: "#f8fafc",
                outline: "none",
                fontSize: "0.95rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
              transition: "transform 0.1s, opacity 0.2s",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "Vänligen vänta..."
              : mode === "login"
                ? "Logga in"
                : "Skapa konto"}
          </button>
        </form>
      </div>
    </div>
  );
}
