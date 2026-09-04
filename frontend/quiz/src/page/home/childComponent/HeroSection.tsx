import { createUseStyles } from "react-jss";

const useStyles = createUseStyles({
  section: {
    minHeight: "90vh",
    display: "flex",
    alignItems: "center",
    padding: "80px 8%",
    "@media (max-width: 900px)": {
      padding: "50px 6%",
    },
  },

  container: {
    width: "100%",
    maxWidth: "1400px",
    margin: "0 auto",

    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "60px",
    alignItems: "center",

    "@media (max-width: 900px)": {
      gridTemplateColumns: "1fr",
      textAlign: "center",
    },
  },

  content: {
    maxWidth: "650px",
  },

  title: {
    fontSize: "50px",
    fontWeight: 800,
    lineHeight: 1.2,
    margin: "0 0 24px",

    "@media (max-width: 900px)": {
      fontSize: "40px",
    },

    "@media (max-width: 500px)": {
      fontSize: "30px",
    },
  },

  highlight: {
    display: "block",
  },

  description: {
    fontSize: "20px",
    lineHeight: 1.6,
    marginBottom: "32px",
    maxWidth: "600px",

    "@media (max-width: 900px)": {
      marginLeft: "auto",
      marginRight: "auto",
    },

    "@media (max-width: 500px)": {
      fontSize: "17px",
    },
  },

  actions: {
    display: "flex",
    gap: "16px",

    "@media (max-width: 900px)": {
      justifyContent: "center",
    },

    "@media (max-width: 500px)": {
      flexDirection: "column",
    },
  },

  primaryButton: {
    padding: "15px 30px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 600,
  },

  secondaryButton: {
    padding: "15px 30px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 600,
    background: "transparent",
    border: "0.9px solid #ccc",
  },

  visual: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  image: {
    width: "100%",
    maxWidth: "550px",
    height: "auto",
    borderRadius: "24px",
    objectFit: "cover",
    minHeight: "350px",

    "@media (max-width: 900px)": {
      maxWidth: "500px",
      marginTop: "30px",
    },
  },
});

export default function HeroSection() {
  const classes = useStyles();

  const scrollToRole = () => {
    const roleSection = document.getElementById("role");

    if (roleSection) {
      roleSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };
  const scrollToHowWork = () => {
    const howWork = document.getElementById("howWork");
    if (howWork) {
      howWork.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <section className={classes.section}>
      <div className={classes.container}>
        <div className={classes.content}>
          <h1 className={classes.title}>
            Skapa Quiz
            <span className={classes.highlight}>Utmana Vänner</span>
            Tävla
          </h1>

          <p className={classes.description}>
            Skapa egna quiz i dina grupper, utmana andra medlemmar och tävla om
            en plats på topplistan.
          </p>

          <div className={classes.actions}>
            <button className={classes.primaryButton} onClick={scrollToHowWork}>
              Hur fungerar
            </button>

            <button className={classes.secondaryButton} onClick={scrollToRole}>
              Läs mer
            </button>
          </div>
        </div>

        <div className={classes.visual}>
          <img
            className={classes.image}
            src="https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?auto=format&fit=crop&w=1200&q=80"
            alt="Quiz application preview"
          />
        </div>
      </div>
    </section>
  );
}
