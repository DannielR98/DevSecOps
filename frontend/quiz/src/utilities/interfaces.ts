export interface UserType {
  id?: number;
  firstname: string;
  surname: string;
  username: string;
  email: string;
  password: string;
}

export interface RegisterUserType {
  firstname: string;
  surname: string;
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
}
export interface LoginUserType {
  username: string;
  password: string;
}

export interface RegisterInputType {
  name: string;
  type: string;
  label: string;
  placeholder: string;
}

export interface LoginInputType {
  name: string;
  type: string;
  label: string;
  placeholder: string;
}
