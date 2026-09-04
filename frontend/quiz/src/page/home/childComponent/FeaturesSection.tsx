import { createUseStyles } from "react-jss";

const useStyles = createUseStyles({
  section: {
    minHeight: "80vh",
    padding: "100px 8%",
    "@media (max-width: 900px)": {
      padding: "50px 6%",
    },
  },

  title: {
    textAlign: "center",
    fontSize: "42px",
    marginBottom: "50px",
    "@media (max-width: 900px)": {
      fontSize: "30px",
    },
  },

  features: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "24px",

    "@media (max-width: 768px)": {
      gridTemplateColumns: "1fr",
    },
  },

  card: {
    padding: "30px",
    borderRadius: "16px",
    background: "#f5f5f5",
  },

  cardTitle: {
    fontSize: "22px",
    marginBottom: "12px",
  },

  text: {
    lineHeight: 1.6,
  },
});

export default function FeaturesSection() {
  const classes = useStyles();

  return (
    <section className={classes.section}>
      <h2 className={classes.title}>Vad kan du göra?</h2>

      <div className={classes.features}>
        <div className={classes.card}>
          <h3 className={classes.cardTitle}>Skapa quiz</h3>

          <p className={classes.text}>
            Skapa egna quiz med frågor och kategorier.
          </p>
        </div>

        <div className={classes.card}>
          <h3 className={classes.cardTitle}>Utmana andra</h3>

          <p className={classes.text}>Utmana andra medlemmar i samma grupp.</p>
        </div>

        <div className={classes.card}>
          <h3 className={classes.cardTitle}>Tävla</h3>

          <p className={classes.text}>
            Se resultat och tävla om topplaceringar.
          </p>
        </div>
      </div>
    </section>
  );
}
