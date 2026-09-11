/* import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../utilities/HeaderFunction";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { setUser } from "../store/reduxSlice/userSlice/UserSlice";

export default function Navbar() {
  const {
    isAuthenticated,
    user,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
    isLoading,
  } = useAuth0();

  const { users, userOne } = useSelector((state: RootState) => state.userSlice);
  const dispatch = useDispatch();

  ////////////////

  useEffect(() => {
    dispatch({ type: "Fetch-USERS" });
  }, [dispatch]);

  useEffect(() => {
    if (user?.sub && users.length > 0) {
      dispatch(setUser(user.sub));
    }
  }, [user?.sub, users, dispatch]);
  console.log(userOne, users);
  const token = localStorage.getItem("auth0_token");
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


  //////

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
        ) : token && user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {user.picture && (
              <Link to={`/user-info/${userOne?.id}`}>
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
              </Link>
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
 */

import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import type { RootState } from "../store/store";

import { setUser } from "../store/reduxSlice/userSlice/UserSlice";
import {
  loadAuth,
  setAuth,
  clearAuth,
} from "../store/reduxSlice/userSlice/authSlice";

import { apiRequest } from "../utilities/HeaderFunction";
import { createUseStyles } from "react-jss";

const useStyles = createUseStyles({
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    border: "none",
    background: "#fff",
    color: "#222",
    fontSize: 16,
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textTransform: "uppercase",

    "&:hover": {
      opacity: 0.85,
    },
  },

  dropdown: {
    position: "absolute",
    top: 52,

    width: 190,
    background: "#222",
    borderRadius: 8,
    padding: 8,
    boxShadow: "0 5px 20px rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    left: "0px",
    zIndex: "1000",
  },

  dropdownLink: {
    color: "#fff",
    textDecoration: "none",
    padding: "10px 12px",
    borderRadius: 5,

    "&:hover": {
      background: "#444",
    },
  },

  dropdownButton: {
    width: "100%",
    border: "none",
    background: "transparent",
    color: "#fff",
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: 5,
    fontSize: 15,
    cursor: "pointer",

    "&:hover": {
      background: "#444",
    },
  },

  delete: {
    color: "#ff6b6b",

    "&:hover": {
      background: "#441f1f",
    },
  },

  "@media (max-width: 500px)": {
    navbar: {
      padding: "0 12px",
    },

    home: {
      fontSize: 18,
    },

    dropdown: {
      right: -5,
      width: 170,
    },

    link: {
      padding: "8px 10px",
    },
  },
});

export default function Navbar() {
  const classes = useStyles();
  const dropDownContainer = useRef<HTMLDivElement>(null);

  const {
    isAuthenticated,
    user: auth0User,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
    isLoading,
  } = useAuth0();

  const dispatch = useDispatch();
  const [menuOpen, setMenuOpen] = useState(false);
  const { users = [], userOne } = useSelector(
    (state: RootState) => state.userSlice ?? { users: [], userOne: null },
  );

  const { isAuth = false, token = null, userStorage = null } = useSelector(
    (state: RootState) => state.authSlice ?? { isAuth: false, token: null, userStorage: null },
  );

  /* functions */

  useEffect(() => {
    dispatch(loadAuth());
  }, [dispatch]);

  useEffect(() => {
    const saveAuth = async () => {
      if (!isAuthenticated || !auth0User) {
        return;
      }

      try {
        const freshToken = await getAccessTokenSilently();

        dispatch(
          setAuth({
            isAuth: true,
            token: freshToken,
            userStorage: auth0User,
          }),
        );
      } catch (error) {
        console.error("AUTH0 TOKEN ERROR:", error);
      }
    };

    saveAuth();
  }, [isAuthenticated, auth0User, getAccessTokenSilently, dispatch]);

  useEffect(() => {
    if (!isAuth || !token) {
      return;
    }

    dispatch({
      type: "Fetch-USERS",
      payload: token,
    });
  }, [isAuth, token, dispatch]);

  useEffect(() => {
    if (!userStorage?.sub) {
      return;
    }

    if (users.length === 0) {
      return;
    }

    dispatch(setUser(userStorage.sub));
  }, [userStorage?.sub, users, dispatch]);

  useEffect(() => {
    const syncUser = async () => {
      if (!isAuthenticated || !auth0User) {
        return;
      }

      try {
        const freshToken = await getAccessTokenSilently();

        dispatch(
          setAuth({
            isAuth: true,
            token: freshToken,
            userStorage: auth0User,
          }),
        );

        await apiRequest({
          api: "sync-user",
          method: "POST",
          token: freshToken,
          body: {
            email: auth0User.email,
            name: auth0User.name,
            nickname: auth0User.nickname,
          },
        });
      } catch (error) {
        console.error("SYNC USER ERROR:", error);
      }
    };

    syncUser();
  }, [isAuthenticated, auth0User, getAccessTokenSilently, dispatch]);

  const handleLogout = () => {
    dispatch(clearAuth());

    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  };
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropDownContainer.current &&
        !dropDownContainer.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

/*   const handleDeleteUser = () => {
   
    if (!userOne?.id) {
      console.log("User not loaded:", userOne);
      return;
    }

    dispatch({
      type: "Fetch-DELETE-USER",
      payload: userOne.id,
    });
  }; */

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
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
            {userStorage.picture && (
              <img
                src={userStorage.picture}
                alt={userStorage.name}
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
              {userOne?.username || userStorage.name || userStorage.email}
            </span>

            {/* LOGOUT */}

            <button
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
            <div>
              {menuOpen && (
                <div className={classes.dropdown} ref={dropDownContainer}>
                  <Link
                    className={classes.dropdownLink}
                    to={userOne?.id ? `/user-info/${userOne.id}` : "/"}
                    onClick={() => setMenuOpen(false)}
                  >
                    Användarinfo
                  </Link>
                  <button
                    className={`${classes.dropdownButton} ${classes.delete}`}
                  >
                    Ta bort
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
            }}
          >
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
              Logga in / Skapa konto
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
