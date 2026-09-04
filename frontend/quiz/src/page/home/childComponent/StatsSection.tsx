import { createUseStyles } from "react-jss";

const useStyles = createUseStyles({
  section: {
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

  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "30px",

    "@media (max-width: 700px)": {
      gridTemplateColumns: "1fr",
      gap: "15px",
    },
  },

  stat: {
    textAlign: "center",
    padding: "30px",
  },

  number: {
    fontSize: "48px",
    fontWeight: 800,
    marginBottom: "10px",
  },

  label: {
    fontSize: "18px",
  },
});

const stats = [
  {
    number: "100+",
    label: "Quiz",
  },
  {
    number: "500+",
    label: "Frågor",
  },
  {
    number: "1000+",
    label: "Genomförda quiz",
  },
];

export default function StatsSection() {
  const classes = useStyles();

  return (
    <section className={classes.section}>
      <h2 className={classes.title}>Tävla och utvecklas</h2>

      <div className={classes.stats}>
        {stats.map((stat) => (
          <div className={classes.stat} key={stat.label}>
            <div className={classes.number}>{stat.number}</div>

            <div className={classes.label}>{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
