import { useEffect, useState } from "react";
import { logInputs } from "../../utilities/arrays";
import type { LoginUserType } from "../../utilities/interfaces";
import type { RootState } from "../../store/store";
import { useDispatch, useSelector } from "react-redux";

export default function LoginPage() {
  const [loginInputValue, setLoginInputValue] = useState<LoginUserType>({
    username: "",
    password: "",
  });
  const { user } = useSelector((state: RootState) => state.userSlice);
  const { isSuccess } = useSelector((state: RootState) => state.loadingSlice);

  const dispatch = useDispatch();

  console.log("user", user);
  /* function */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginInputValue((prev) => ({ ...prev, [name]: value }));
  };
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    console.log("REGISTER DATA:", JSON.stringify(loginInputValue, null, 2));

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
  console.log("isSuccess", isSuccess);

  /*  */

  return (
    <div>
      RegisterPage
      <form onSubmit={handleSubmit}>
        {logInputs &&
          logInputs.map((inp, ind) => {
            return (
              <label htmlFor={inp.label} key={ind}>
                <p>{inp.label}</p>
                <input
                  type={inp.type}
                  id={inp.label}
                  name={inp.name}
                  value={loginInputValue[inp.name as keyof LoginUserType]}
                  onChange={(e) => handleChange(e)}
                />
              </label>
            );
          })}
        <button> Register</button>
      </form>
    </div>
  );
}
