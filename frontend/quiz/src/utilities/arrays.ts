import type { LoginInputType, RegisterInputType } from "./interfaces";

export const registerInputs: RegisterInputType[] = [
  {
    name: "firstname",
    type: "text",
    label: "firstName",
  },

  {
    name: "surname",
    type: "text",
    label: "surName",
  },
  {
    name: "username",
    type: "text",
    label: "userName",
  },
  {
    name: "email",
    type: "email",
    label: "Email",
  },
  {
    name: "password",
    type: "password",
    label: "Password",
  },
  {
    name: "confirmPassword",
    type: "password",
    label: "Confirm Password",
  },
].map((inp) => ({
  ...inp,
  placeholder:
    inp.name === "confirmPassword"
      ? `Please  Confirm Your  Password`
      : `Please Enter Your ${inp.label}`,
}));

export const logInputs: LoginInputType[] = [
  {
    name: "username",
    type: "text",
    label: "userName",
  },

  {
    name: "password",
    type: "password",
    label: "Password",
  },
].map((inp) => ({
  ...inp,
  placeholder: `Please Enter Your ${inp.label}`,
}));
