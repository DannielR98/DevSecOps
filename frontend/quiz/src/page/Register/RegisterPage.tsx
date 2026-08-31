import { useEffect, useState } from "react";
import { registerInputs } from "../../utilities/arrays";
import type { RegisterUserType } from "../../utilities/interfaces";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../store/store";

export default function RegisterPage() {
  const { isSuccess } = useSelector((state: RootState) => state.loadingSlice);

  const [registerInputValue, setRegisterInputValue] =
    useState<RegisterUserType>({
      firstname: "",
      surname: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
  const dispatch = useDispatch();

  /* function */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterInputValue((prev) => ({ ...prev, [name]: value }));
  };
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    dispatch({
      type: "Fetch-REGISTER-USERS",
      payload: registerInputValue,
    });
  };

  useEffect(() => {
    if (isSuccess) {
      setRegisterInputValue({
        firstname: "",
        surname: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    }
  }, [isSuccess]);
  /*  */

  return (
    <div>
      RegisterPage
      <form onSubmit={handleSubmit}>
        {registerInputs &&
          registerInputs.map((inp, ind) => {
            return (
              <label htmlFor={inp.label} key={ind}>
                <p>{inp.label}</p>
                <input
                  type={inp.type}
                  id={inp.label}
                  name={inp.name}
                  value={registerInputValue[inp.name as keyof RegisterUserType]}
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
