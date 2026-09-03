import { useParams } from "react-router-dom";
import type { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { createUseStyles } from "react-jss";

const useStyles = createUseStyles({
  page: {
    minHeight: "100vh",
    padding: "100px 20px 40px",
    background: "#f5f7fb",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    boxSizing: "border-box",
  },

  card: {
    width: "100%",
    maxWidth: 550,
    background: "#fff",
    borderRadius: 16,
    padding: "35px",
    boxSizing: "border-box",
    boxShadow: "0 10px 35px rgba(0, 0, 0, 0.08)",
  },

  header: {
    textAlign: "center",
    marginBottom: 30,
  },

  avatar: {
    width: 80,
    height: 80,
    margin: "0 auto 15px",
    borderRadius: "50%",
    background: "#222",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    fontWeight: 700,
    textTransform: "uppercase",
  },

  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: "#1f2937",
  },

  subtitle: {
    margin: "8px 0 0",
    fontSize: 14,
    color: "#6b7280",
  },

  infoContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  infoItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    background: "#f8f9fb",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    gap: 20,
  },

  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#6b7280",
  },

  value: {
    fontSize: 15,
    fontWeight: 500,
    color: "#111827",
    textAlign: "right",
    wordBreak: "break-word",
  },

  footer: {
    marginTop: 25,
    paddingTop: 20,
    borderTop: "1px solid #e5e7eb",
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 13,
  },

  loading: {
    minHeight: "100vh",
    paddingTop: 100,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    background: "#f5f7fb",
    color: "#6b7280",
    fontSize: 16,
  },

  "@media (max-width: 600px)": {
    page: {
      padding: "85px 15px 30px",
    },

    card: {
      padding: "25px 20px",
      borderRadius: 12,
    },

    avatar: {
      width: 70,
      height: 70,
      fontSize: 24,
    },

    title: {
      fontSize: 24,
    },

    infoItem: {
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 5,
    },

    value: {
      textAlign: "left",
    },
  },
});

export default function UserInfoPage() {
  const classes = useStyles();

  const { id } = useParams();

  const userId = Number(id);

  const { userById } = useSelector((state: RootState) => state.userSlice);

  const dispatch = useDispatch();
  /* ====================== functions =================================== */
  useEffect(() => {
    if (!id || Number.isNaN(userId)) return;

    dispatch({
      type: "Fetch-USER",
      payload: userId,
    });
  }, [dispatch, id, userId]);

  console.log("userById", userById);

  if (!userById) {
    return <div className={classes.loading}>Loading user information...</div>;
  }

  const initials =
    `${userById.firstname?.charAt(0) ?? ""}${userById.surname?.charAt(0) ?? ""}`.toUpperCase();

  return (
    <div className={classes.page}>
      <div className={classes.card}>
        <div className={classes.header}>
          <div className={classes.avatar}>{initials}</div>

          <h1 className={classes.title}>User Information</h1>

          <p className={classes.subtitle}>Your account details</p>
        </div>

        <div className={classes.infoContainer}>
          <div className={classes.infoItem}>
            <span className={classes.label}>First Name</span>

            <span className={classes.value}>{userById.firstname}</span>
          </div>

          <div className={classes.infoItem}>
            <span className={classes.label}>Surname</span>

            <span className={classes.value}>{userById.surname}</span>
          </div>

          <div className={classes.infoItem}>
            <span className={classes.label}>Username</span>

            <span className={classes.value}>{userById.username}</span>
          </div>

          <div className={classes.infoItem}>
            <span className={classes.label}>Email</span>

            <span className={classes.value}>{userById.email}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
