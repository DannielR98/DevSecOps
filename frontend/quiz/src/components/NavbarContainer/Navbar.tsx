import { useAuth0, User } from "@auth0/auth0-react";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useDispatch, useSelector } from "react-redux";

import type { RootState } from "../../store/store";

import { setUser } from "../../store/reduxSlice/userSlice/UserSlice";
import {
  loadAuth,
  setAuth,
  clearAuth,
} from "../../store/reduxSlice/userSlice/authSlice";

import { apiRequest } from "../../utilities/HeaderFunction";
import DesktopNavBar from "./DesktopNavBar";
import MobileNavBar from "./MobileNavBar";
import type { UserType } from "../../utilities/interfaces";

export interface NavProps {
  userStorage: User | null;
  userOne: UserType | null;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  handleLogout: () => void;
  menuOpen: boolean;
  isLoading: boolean;
  isAuth: boolean;
  token: string | null;
  loginWithRedirect: () => void;
}

export default function Navbar() {
  const dropDownContainer = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 700);

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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 700);
    };

    // Check initially
    handleResize();

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
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
    <div>
      {isMobile ? (
        <MobileNavBar
          userStorage={userStorage}
          setMenuOpen={setMenuOpen}
          userOne={userOne}
          handleLogout={handleLogout}
          menuOpen={menuOpen}
          isLoading={isLoading}
          isAuth={isAuth}
          token={token}
          loginWithRedirect={loginWithRedirect}
        />
      ) : (
        <DesktopNavBar
          userStorage={userStorage}
          dropDownContainer={dropDownContainer}
          setMenuOpen={setMenuOpen}
          userOne={userOne}
          handleLogout={handleLogout}
          menuOpen={menuOpen}
          isLoading={isLoading}
          isAuth={isAuth}
          token={token}
          loginWithRedirect={loginWithRedirect}
        />
      )}
    </div>
  );
}
