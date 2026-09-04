import { createUseStyles } from "react-jss";

const useStyles = createUseStyles({
  footer: {
    padding: "40px 8%",
    textAlign: "center",
    borderTop: "1px solid #eee",
  },

  text: {
    margin: 0,
  },
});

export default function Footer() {
  const classes = useStyles();

  return (
    <footer className={classes.footer}>
      <p className={classes.text}>
        © 2026 QuizApp. Alla rättigheter förbehållna.
      </p>
    </footer>
  );
}
