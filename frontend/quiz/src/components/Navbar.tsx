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
import { useEffect } from "react";
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

export default function Navbar() {
  const {
    isAuthenticated,
    user: auth0User,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
    isLoading,
  } = useAuth0();

  const dispatch = useDispatch();

  const { users, userOne } = useSelector((state: RootState) => state.userSlice);

  const { isAuth, token, userStorage } = useSelector(
    (state: RootState) => state.authSlice,
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
            Loading Auth...
          </span>
        ) : isAuth && token && userStorage ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            {userStorage.picture && (
              <Link to={userOne?.id ? `/user-info/${userOne.id}` : "/"}>
                <img
                  src={userStorage.picture}
                  alt={userStorage.name}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    border: "2px solid #3b82f6",
                    objectFit: "cover",
                  }}
                />
              </Link>
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
              Log Out
            </button>
          </div>
        ) : (
          /* ================= LOGGED OUT ================= */

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
              Log In / Register (Auth0)
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
