import { createUseStyles } from "react-jss";

const useStyles = createUseStyles({
  section: {
    minHeight: "80vh",
    padding: "100px 8%",
    "@media (max-width: 900px)": {
      padding: "50px 6%",
    },
  },

  header: {
    textAlign: "center",
    maxWidth: "700px",
    margin: "0 auto 50px",
  },

  title: {
    fontSize: "42px",
    marginBottom: "16px",
    "@media (max-width: 900px)": {
      fontSize: "30px",
    },
  },

  description: {
    fontSize: "18px",
    lineHeight: 1.6,
  },

  roles: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "24px",

    "@media (max-width: 1000px)": {
      gridTemplateColumns: "repeat(2, 1fr)",
    },

    "@media (max-width: 600px)": {
      gridTemplateColumns: "1fr",
    },
  },

  card: {
    padding: "30px",
    borderRadius: "16px",
    background: "#f5f5f5",
  },

  roleTitle: {
    fontSize: "22px",
    marginBottom: "16px",
  },

  roleDescription: {
    lineHeight: 1.6,
  },
});

const roles = [
  {
    title: "QuizÄgare",
    description:
      "Skapa, redigera och ta bort dina egna quiz. Se statistik och utmana andra medlemmar.",
  },
  {
    title: "GruppÄgare",
    description:
      "Skapa grupper, hantera medlemmar, generera inbjudningar och administrera gruppen.",
  },
  {
    title: "GruppMedlem",
    description:
      "Delta i quiz, skapa egna quiz, se topplistan och utmana andra medlemmar.",
  },
  {
    title: "IckeMedlem",
    description:
      "Kan inte se gruppens innehåll och kan endast gå med via en giltig inbjudan.",
  },
];

export default function RolesSection() {
  const classes = useStyles();

  return (
    <section className={classes.section} id="role">
      <div className={classes.header}>
        <h2 className={classes.title}>Roller i gruppen</h2>

        <p className={classes.description}>
          Alla användare har tydliga rättigheter beroende på vilken roll de har
          i gruppen.
        </p>
      </div>

      <div className={classes.roles}>
        {roles.map((role) => (
          <div className={classes.card} key={role.title}>
            <h3 className={classes.roleTitle}>{role.title}</h3>

            <p className={classes.roleDescription}>{role.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
