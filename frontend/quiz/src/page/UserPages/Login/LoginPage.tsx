import { useEffect, useState } from "react";
import { logInputs } from "../../../utilities/arrays";
import type { LoginUserType } from "../../../utilities/interfaces";
import type { RootState } from "../../../store/store";
import { useDispatch, useSelector } from "react-redux";
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
      borderColor: "#6366f1",
      boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.12)",
    },

    "&::placeholder": {
      color: "#9ca3af",
    },
  },

  button: {
    marginTop: 8,
    width: "100%",
    height: 48,
    border: "none",
    borderRadius: 8,
    background: "#3b3b3b",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s, transform 0.1s",

    "&:hover": {
      background: "#5c5c5c",
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
  },
});

export default function LoginPage() {
  const classes = useStyles();

  const [loginInputValue, setLoginInputValue] = useState<LoginUserType>({
    username: "",
    password: "",
  });

  const { user } = useSelector((state: RootState) => state.userSlice);

  const { isSuccess } = useSelector((state: RootState) => state.loadingSlice);

  const dispatch = useDispatch();

  console.log("user", user);

  /* ================= FUNCTION ================= */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setLoginInputValue((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    dispatch({
      type: "Fetch-LOGIN-USERS",
      payload: loginInputValue,
    });
  };

  useEffect(() => {
    if (isSuccess) {
      setLoginInputValue({
        username: "",
        password: "",
      });
    }
  }, [isSuccess]);

  return (
    <div className={classes.page}>
      <div className={classes.card}>
        <h1 className={classes.title}>Login</h1>

        <p className={classes.subtitle}>Login to your account to continue</p>

        <form className={classes.form} onSubmit={handleSubmit}>
          {logInputs?.map((inp, ind) => (
            <label className={classes.field} htmlFor={inp.label} key={ind}>
              <span className={classes.label}>{inp.label}</span>

              <input
                className={classes.input}
                type={inp.type}
                id={inp.label}
                name={inp.name}
                value={loginInputValue[inp.name as keyof LoginUserType]}
                onChange={handleChange}
                placeholder={`Enter ${inp.label.toLowerCase()}`}
              />
            </label>
          ))}

          <button className={classes.button} type="submit">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
