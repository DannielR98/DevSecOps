import { Link } from "react-router-dom";
import { createUseStyles } from "react-jss";
import type { User } from "@auth0/auth0-react";
import type { UserType } from "../../utilities/interfaces";

interface PropsType {
  userStorage: User | null;
  dropDownContainer: React.RefObject<HTMLDivElement | null>;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  userOne: UserType | null;
  handleLogout: () => void;
  menuOpen: boolean;

  isLoading: boolean;
  isAuth: boolean;
  token: string | null;
  loginWithRedirect: () => void;
}

const useStyles = createUseStyles({
  dropdown: {
    position: "absolute",

    top: "calc(100% + 10px)",
    left: 0,

    minWidth: "180px",

    backgroundColor: "#ffffff",

    borderRadius: "10px",

    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",

    border: "1px solid #e5e7eb",

    overflow: "hidden",

    zIndex: 100,
  },

  dropdownLink: {
    display: "block",

    padding: "12px 16px",

    color: "#111827",
    textDecoration: "none",

    fontSize: "14px",
    fontWeight: 500,

    transition: "background-color 0.2s ease",

    "&:hover": {
      backgroundColor: "#f3f4f6",
    },
  },

  dropdownButton: {
    width: "100%",

    padding: "12px 16px",

    border: "none",

    backgroundColor: "#ffffff",

    textAlign: "left",

    fontSize: "14px",
    fontWeight: 500,

    cursor: "pointer",

    transition: "background-color 0.2s ease",

    "&:hover": {
      backgroundColor: "#f3f4f6",
    },
  },

  delete: {
    color: "#dc2626",

    "&:hover": {
      backgroundColor: "#fee2e2",
    },
  },
});

export default function DesktopNavBar({
  userStorage,
  dropDownContainer,
  setMenuOpen,
  userOne,
  handleLogout,
  menuOpen,
  isLoading,
  isAuth,
  token,
  loginWithRedirect,
}: PropsType) {
  const classes = useStyles();

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
        height: "60px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexDirection: "column",
        }}
      >
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

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        {isLoading ? (
          <span
            style={{
              fontSize: "0.9rem",
              color: "#9ca3af",
            }}
          >
            Laddar...
          </span>
        ) : isAuth && token && userStorage ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              position: "relative",
            }}
            ref={dropDownContainer}
          >
            {/* Profile picture */}
            {userStorage?.picture && (
              <img
                src={userStorage.picture}
                alt={userStorage.name || "User"}
                style={{
                  width: "36px",
                  height: "36px",

                  borderRadius: "50%",

                  border: "2px solid #3b82f6",

                  objectFit: "cover",

                  cursor: "pointer",
                }}
                onClick={() => setMenuOpen(true)}
              />
            )}
            <span
              style={{
                fontSize: "0.95rem",
                fontWeight: 500,
              }}
            >
              {userOne?.username || userStorage?.name || userStorage?.email}
            </span>

            <button
              type="button"
              onClick={handleLogout}
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
              Logga ut
            </button>
            {menuOpen && (
              <div className={classes.dropdown}>
                <Link
                  className={classes.dropdownLink}
                  to={userOne?.id ? `/user-info/${userOne.id}` : "/"}
                  onClick={() => setMenuOpen(false)}
                >
                  Användarinfo
                </Link>

                <button
                  type="button"
                  className={`${classes.dropdownButton} ${classes.delete}`}
                >
                  Ta bort
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
            }}
          >
            <button
              type="button"
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
              Logga in / Skapa konto
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
