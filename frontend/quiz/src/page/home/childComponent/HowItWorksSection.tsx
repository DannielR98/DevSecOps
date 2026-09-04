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
    marginBottom: "60px",
    "@media (max-width: 900px)": {
      fontSize: "30px",
    },
  },

  steps: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "30px",

    "@media (max-width: 900px)": {
      gridTemplateColumns: "repeat(2, 1fr)",
    },

    "@media (max-width: 600px)": {
      gridTemplateColumns: "1fr",
    },
  },

  step: {
    textAlign: "center",
  },

  number: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    margin: "0 auto 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    fontWeight: 700,
    background: "#eee",
  },

  stepTitle: {
    fontSize: "22px",
    marginBottom: "12px",
  },

  text: {
    lineHeight: 1.6,
  },
});

const steps = [
  {
    number: "01",
    title: "Skapa en grupp",
    text: "Skapa en grupp och samla dina vänner eller andra deltagare.",
  },
  {
    number: "02",
    title: "Bjud in",
    text: "Generera en inbjudningslänk eller kod och dela den med andra.",
  },
  {
    number: "03",
    title: "Skapa quiz",
    text: "Skapa egna quiz med frågor och kategorier.",
  },
  {
    number: "04",
    title: "Tävla",
    text: "Spela quiz, utmana andra och tävla om topplaceringar.",
  },
];

export default function HowItWorksSection() {
  const classes = useStyles();

  return (
    <section className={classes.section} id="howWork">
      <h2 className={classes.title}>Så fungerar det</h2>

      <div className={classes.steps}>
        {steps.map((step) => (
          <div className={classes.step} key={step.number}>
            <div className={classes.number}>{step.number}</div>

            <h3 className={classes.stepTitle}>{step.title}</h3>

            <p className={classes.text}>{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
