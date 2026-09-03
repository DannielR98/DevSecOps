import type {
  UpdaterUserType,
  UpdateUserInputType,
} from "../../../../utilities/interfaces";
import { createUseStyles } from "react-jss";

interface PropsType {
  isEdit: boolean;
  updateUserInputs: UpdateUserInputType[];
  updateInputValue: UpdaterUserType;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleEdit: () => void;
  handleSave: () => void;
}

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
    maxWidth: 500,
    background: "#fff",
    padding: "35px",
    borderRadius: 16,
    boxShadow: "0 10px 35px rgba(0, 0, 0, 0.08)",
    boxSizing: "border-box",
  },

  title: {
    margin: 0,
    marginBottom: 8,
    fontSize: 28,
    fontWeight: 700,
    color: "#1f2937",
    textAlign: "center",
  },

  subtitle: {
    margin: "0 0 30px",
    color: "#6b7280",
    textAlign: "center",
    fontSize: 14,
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },

  label: {
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
  },

  input: {
    width: "100%",
    height: 46,
    padding: "0 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    outline: "none",
    fontSize: 15,
    color: "#111827",
    background: "#fff",
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",

    "&:focus": {
      borderColor: "#222",
      boxShadow: "0 0 0 3px rgba(34, 34, 34, 0.12)",
    },

    "&::placeholder": {
      color: "#9ca3af",
    },
  },

  buttons: {
    display: "flex",
    gap: 12,
    marginTop: 8,
  },

  button: {
    flex: 1,
    height: 48,
    border: "none",
    borderRadius: 8,
    background: "#222",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s, transform 0.1s",

    "&:hover": {
      background: "#444",
    },

    "&:active": {
      transform: "scale(0.98)",
    },
  },

  "@media (max-width: 600px)": {
    page: {
      padding: "85px 15px 30px",
    },

    card: {
      padding: "25px 20px",
      borderRadius: 12,
    },

    title: {
      fontSize: 24,
    },

    buttons: {
      flexDirection: "column",
    },
  },
});

export default function EditSection({
  isEdit,
  updateUserInputs,
  updateInputValue,
  handleChange,
  handleEdit,
  handleSave,
}: PropsType) {
  const classes = useStyles();

  return (
    <div className={classes.page}>
      <div className={classes.card}>
        <h1 className={classes.title}>Edit User</h1>

        <p className={classes.subtitle}>Update your account information</p>

        <div className={classes.form}>
          {updateUserInputs?.map((inp, ind) => (
            <label className={classes.field} htmlFor={inp.label} key={ind}>
              <span className={classes.label}>{inp.label}</span>

              <input
                className={classes.input}
                type={inp.type}
                id={inp.label}
                name={inp.name}
                value={updateInputValue[inp.name as keyof UpdaterUserType]}
                onChange={handleChange}
                placeholder={`Enter ${inp.label.toLowerCase()}`}
              />
            </label>
          ))}

          <div className={classes.buttons}>
            {!isEdit ? (
              <button className={classes.button} onClick={handleEdit}>
                Edit
              </button>
            ) : (
              <button className={classes.button} onClick={handleSave}>
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
