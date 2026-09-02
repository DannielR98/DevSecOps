import type {
  LoginInputType,
  RegisterInputType,
  UpdateUserInputType,
} from "./interfaces";

export const registerInputs: RegisterInputType[] = [
  {
    name: "firstname",
    type: "text",
    label: "FirstName",
  },

  {
    name: "surname",
    type: "text",
    label: "SurName",
  },
  {
    name: "username",
    type: "text",
    label: "UserName",
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
    label: "UserName",
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

export const updateUserInputs: UpdateUserInputType[] = [
  {
    name: "firstname",
    type: "text",
    label: "FirstName",
  },

  {
    name: "surname",
    type: "text",
    label: "SurName",
  },
  {
    name: "username",
    type: "text",
    label: "UserName",
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
];
