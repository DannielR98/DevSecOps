import { createUseStyles } from "react-jss";

const useStyles = createUseStyles({
  section: {
    minHeight: "70vh",
    padding: "100px 8%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "@media (max-width: 900px)": {
      padding: "50px 6%",
    },
  },

  content: {
    maxWidth: "800px",
    textAlign: "center",
  },

  title: {
    fontSize: "48px",
    marginBottom: "20px",
    "@media (max-width: 900px)": {
      fontSize: "30px",
    },
  },

  text: {
    fontSize: "19px",
    lineHeight: 1.7,
    marginBottom: "30px",
  },

  button: {
    padding: "14px 28px",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: 600,
    cursor: "pointer",
  },
});

export default function ChallengeSection() {
  const classes = useStyles();

  return (
    <section className={classes.section}>
      <div className={classes.content}>
        <h2 className={classes.title}>Utmana dina vänner</h2>

        <p className={classes.text}>
          Skapa en quizutmaning och se vem som får bäst resultat. Tävla mot
          andra medlemmar i din grupp och klättra på topplistan.
        </p>

        <button className={classes.button}>Börja tävla</button>
      </div>
    </section>
  );
}
