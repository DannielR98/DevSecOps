export interface UserType {
  auth0_id?: string;
  supabase_id?: string;
  name?: string;
  id?: number;
  picture?: string;
  firstname: string;
  surname: string;
  username: string;
  email: string;
  password?: string;
}

export interface AuthUser {
  sub?: string;
  name?: string;
  email?: string;
  nickname?: string;
  picture?: string;
  [key: string]: unknown;
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

export interface UpdateUserInputType {
  name: string;
  type: string;
  label: string;
}

export interface UpdaterUserType {
  firstname: string;
  surname: string;
  username: string;
  email: string;
  password?: string;
}
