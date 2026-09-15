/* import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { createUseStyles } from "react-jss";
import DeskTopNavBar from "./DeskTopNavBar";
import MobileNavBar from "./MobileNavBar";

const useStyles = createUseStyles({
  navbar: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: 60,
    padding: "0 25px",
    background: "#222",
    display: "flex",
    alignItems: "center",
    boxSizing: "border-box",
    zIndex: 1000,
  },

  home: {
    color: "#fff",
    textDecoration: "none",
    fontSize: 20,
    fontWeight: "bold",
  },

  right: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    position: "relative",
  },

  authLinks: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  link: {
    color: "#fff",
    textDecoration: "none",
    padding: "10px 14px",
    borderRadius: 5,

    "&:hover": {
      background: "#444",
    },
  },

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
    right: 0,
    width: 190,
    background: "#222",
    borderRadius: 8,
    padding: 8,
    boxShadow: "0 5px 20px rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    gap: 4,
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

export default function Navigation() {
  const classes = useStyles();
  const dropDownContainer = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useSelector((state: RootState) => state.userSlice);
  const dispatch = useDispatch();

  const id = user?.userStoraged?.id;
  const token = user?.token;

  const isLoggedIn = Boolean(token);

  const firstname = user?.userStoraged?.firstname ?? "";
  const surname = user?.userStoraged?.surname ?? "";

  const userInitials =
    `${firstname.charAt(0)}${surname.charAt(0)}`.toUpperCase();

  // ================================== functions =============================== //
  const handleDelete = () => {
    if (!id) return;

    dispatch({
      type: "Fetch-DELETE-USER",
      payload: Number(id),
    });

    setMenuOpen(false);
  };

  const handleLogOut = () => {
    setMenuOpen(false);
    window.location.href = "/";
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

  return (
    <div>
      <DeskTopNavBar
        menuOpen={menuOpen}
        userInitials={userInitials}
        isLoggedIn={isLoggedIn}
        dropDownContainer={dropDownContainer}
        id={id}
        handleDelete={handleDelete}
        handleLogOut={handleLogOut}
        setMenuOpen={setMenuOpen}
      />
      <MobileNavBar />
      <h1>eferferferferferf</h1>
      <h1>eferferferferferf</h1>
      <h1>eferferferferferf</h1>
      <h1>eferferferferferf</h1>
      <h1>eferferferferferf</h1>
      <h1>eferferferferferf</h1>
      <h1>eferferferferferf</h1>
      <h1>eferferferferferf</h1>
      <h1>eferferferferferf</h1>
      <h1>eferferferferferf</h1>
      <h1>eferferferferferf</h1>
      <h1>eferferferferferf</h1>
      <h1>eferferferferferf</h1>
      <h1>eferferferferferf</h1>
      <h1>eferferferferferf</h1>
    </div>
  );
}
 */
