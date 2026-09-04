import { createUseStyles } from "react-jss";
import { useNavigate } from "react-router-dom";

const useStyles = createUseStyles({
  section: {
    padding: "120px 8%",
    textAlign: "center",
  },

  content: {
    maxWidth: "700px",
    margin: "0 auto",
  },

  title: {
    fontSize: "48px",
    fontWeight: 800,
    marginBottom: "20px",
  },

  description: {
    fontSize: "18px",
    lineHeight: 1.6,
    marginBottom: "32px",
  },

  actions: {
    display: "flex",
    justifyContent: "center",
    gap: "16px",

    "@media (max-width: 600px)": {
      flexDirection: "column",
      alignItems: "stretch",
    },
  },

  loginButton: {
    padding: "14px 30px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    background: "transparent",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 600,
  },

  registerButton: {
    padding: "14px 30px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 600,
  },
});

export default function StartSection() {
  const classes = useStyles();
  const navigate = useNavigate();

  return (
    <section id="start" className={classes.section}>
      <div className={classes.content}>
        <h2 className={classes.title}>Redo att börja tävla?</h2>

        <p className={classes.description}>
          Skapa ett konto eller logga in och börja skapa quiz, utmana dina
          vänner och tävla på topplistan.
        </p>

        <div className={classes.actions}>
          <button
            className={classes.loginButton}
            onClick={() => navigate("/login")}
          >
            Logga in
          </button>

          <button
            className={classes.registerButton}
            onClick={() => navigate("/register")}
          >
            Skapa konto
          </button>
        </div>
      </div>
    </section>
  );
}
