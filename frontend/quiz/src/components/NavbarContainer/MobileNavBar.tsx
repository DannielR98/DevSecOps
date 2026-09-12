import { Link } from "react-router-dom";
import { createUseStyles } from "react-jss";
import type { User } from "@auth0/auth0-react";
import type { UserType } from "../../utilities/interfaces";
import { useEffect } from "react";

interface PropsType {
  userStorage: User | null;
  userOne: UserType | null;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleLogout: () => void;
  menuOpen: boolean;
  isLoading: boolean;
  isAuth: boolean;
  token: string | null;
  loginWithRedirect: () => void;
}

const useStyles = createUseStyles({
  mobileMainContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",

    height: "60px",

    padding: "0 1rem",

    backgroundColor: "#1f2937",
    color: "#fff",

    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",

    position: "relative",
    zIndex: 1000,
  },

  mobileContainer: {
    width: "100%",
    height: "100%",

    display: "flex",
    alignItems: "center",
  },

  headerContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",

    width: "100%",
  },

  logo: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: "1.25rem",
    textDecoration: "none",
    "@media (max-width: 460px)": {
      fontSize: "15px",
    },
  },

  hamburgerButton: {
    width: "42px",
    height: "42px",

    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",

    gap: "5px",

    backgroundColor: "transparent",
    border: "none",

    cursor: "pointer",
    padding: 0,

    "& span": {
      display: "block",

      width: "24px",
      height: "2px",

      backgroundColor: "#fff",

      borderRadius: "2px",

      transition: "all 0.2s ease",
    },

    "&:hover": {
      opacity: 0.8,
    },
  },

  loginButton: {
    padding: "10px 16px",

    border: "none",
    borderRadius: "8px",

    backgroundColor: "#2563eb",
    color: "#ffffff",

    fontSize: "14px",
    fontWeight: 600,

    cursor: "pointer",

    transition: "background-color 0.2s ease",

    whiteSpace: "nowrap",

    "&:hover": {
      backgroundColor: "#1d4ed8",
    },
    "@media (max-width: 460px)": {
      fontSize: "12px",
      padding: "10px",
    },
  },

  overlay: {
    position: "fixed",

    top: 0,
    left: 0,

    width: "100%",
    height: "100dvh",

    backgroundColor: "rgba(0, 0, 0, 0.4)",

    backdropFilter: "blur(4px)",

    zIndex: 2000,

    transition: "opacity 0.5s ease",

    pointerEvents: "none",
  },

  overlayOpen: {
    opacity: 1,
    pointerEvents: "auto",
  },

  overlayClosed: {
    opacity: 0,
  },

  mobileNavBar: {
    position: "absolute",

    top: 0,
    left: "100%",

    width: "100%",
    height: "100dvh",

    backgroundColor: "#ffffff",

    padding: "20px 24px",

    boxSizing: "border-box",

    display: "flex",
    flexDirection: "column",

    boxShadow: "-8px 0 30px rgba(0, 0, 0, 0.15)",

    transition: "left 0.5s ease",

    overflowY: "auto",
  },

  mobileNavBarOpen: {
    left: 0,
  },

  closeButton: {
    alignSelf: "flex-end",

    width: "42px",
    height: "42px",

    border: "none",
    borderRadius: "50%",

    backgroundColor: "#f3f4f6",
    color: "#111827",

    fontSize: "28px",
    lineHeight: 1,

    cursor: "pointer",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    transition: "all 0.2s ease",

    "&:hover": {
      backgroundColor: "#e5e7eb",
      transform: "rotate(90deg)",
    },
  },

  navigation: {
    marginTop: "25px",
  },

  navLink: {
    display: "block",

    padding: "14px 12px",

    color: "#111827",
    textDecoration: "none",

    fontSize: "17px",
    fontWeight: 600,

    borderRadius: "10px",

    transition: "background-color 0.2s ease",

    "&:hover": {
      backgroundColor: "#f3f4f6",
    },
  },

  userInfoLink: {
    marginTop: "10px",
  },

  loading: {
    display: "block",

    padding: "14px 12px",

    color: "#6b7280",

    fontSize: "16px",
  },

  userSection: {
    marginTop: "20px",

    padding: "25px 12px",

    borderTop: "1px solid #e5e7eb",

    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  avatar: {
    width: "58px",
    height: "58px",

    borderRadius: "50%",

    backgroundColor: "#1f2937",
    color: "#ffffff",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    fontSize: "23px",
    fontWeight: 700,
  },

  username: {
    margin: "10px 0 0",

    color: "#374151",

    fontSize: "15px",
    fontWeight: 600,
  },

  logoutButton: {
    marginTop: "auto",

    width: "100%",

    padding: "14px",

    border: "none",
    borderRadius: "12px",

    backgroundColor: "#f3f4f6",
    color: "#374151",

    fontSize: "16px",
    fontWeight: 600,

    cursor: "pointer",

    transition: "all 0.2s ease",

    "&:hover": {
      backgroundColor: "#fee2e2",
      color: "#dc2626",
    },
  },
});

export default function MobileNavBar({
  userStorage,
  userOne,
  setMenuOpen,
  handleLogout,
  menuOpen,
  isLoading,
  isAuth,
  token,
  loginWithRedirect,
}: PropsType) {
  const classes = useStyles();



  const closeMenu = () => {
    setMenuOpen(false);
  };



  const handleMobileLogout = () => {
    handleLogout();

    setMenuOpen(false);
  };



  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [menuOpen]);

  return (
    <>


      <div className={classes.mobileMainContainer}>
        <div className={classes.mobileContainer}>
          <div className={classes.headerContent}>


            <Link to="/" className={classes.logo}>
              🔒 DevSecOps Quiz
            </Link>

            {isLoading ? (
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                className={classes.hamburgerButton}
              >
                <span />
                <span />
                <span />
              </button>
            ) : isAuth && token && userStorage ? (
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                className={classes.hamburgerButton}
              >
                <span />
                <span />
                <span />
              </button>
            ) : (
              <button
                type="button"
                className={classes.loginButton}
                onClick={() => loginWithRedirect()}
              >
                Logga in / Skapa konto
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        className={`${classes.overlay} ${
          menuOpen ? classes.overlayOpen : classes.overlayClosed
        }`}
        onClick={closeMenu}
      >
        <nav
          className={`${classes.mobileNavBar} ${
            menuOpen ? classes.mobileNavBarOpen : ""
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={classes.closeButton}
            onClick={closeMenu}
            aria-label="Close menu"
          >
            ×
          </button>

          <div className={classes.navigation}>
            <Link to="/" className={classes.navLink} onClick={closeMenu}>
              Home
            </Link>
          </div>

          {isLoading ? (
            <span className={classes.loading}>Laddar...</span>
          ) : isAuth && token && userStorage ? (
            <>
              <div className={classes.userSection}>
                <div className={classes.avatar}>
                  {userOne?.firstname?.charAt(0).toUpperCase() ||
                    userStorage?.name?.charAt(0).toUpperCase() ||
                    "?"}
                </div>

                <span className={classes.username}>
                  {userOne?.username || userStorage?.name || userStorage?.email}
                </span>
              </div>

              <Link
                to={userOne?.id ? `/user-info/${userOne.id}` : "/"}
                className={`${classes.navLink} ${classes.userInfoLink}`}
                onClick={closeMenu}
              >
                Användarinfo
              </Link>

              <button
                type="button"
                className={classes.logoutButton}
                onClick={handleMobileLogout}
              >
                Logga ut
              </button>
            </>
          ) : null}
        </nav>
      </div>
    </>
  );
}
