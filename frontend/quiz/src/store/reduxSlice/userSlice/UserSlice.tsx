import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { UserType } from "../../../utilities/interfaces";

const storageUser = localStorage.getItem("user");
const parsedUser: StoragedUserType = storageUser
  ? JSON.parse(storageUser)
  : {
      userStoraged: null,
      token: null,
    };
interface StoragedUserType {
  userStoraged: UserType | null;
  token: string | null;
}

interface InitialStateType {
  users: UserType[];
  user: StoragedUserType;
}

const initialState: InitialStateType = {
  users: [],
  user: parsedUser,
};
const UserSlice = createSlice({
  name: "UserSlice",
  initialState,
  reducers: {
    setUsers: (state, action: PayloadAction<UserType[]>) => {
      state.users = action.payload;
    },
    setRegisterUser: (state, action: PayloadAction<UserType>) => {
      state.users.push(action.payload);
    },
    setLoginUser: (state, action: PayloadAction<StoragedUserType>) => {
      state.user = action.payload;
      localStorage.setItem("user", JSON.stringify(action.payload));
    },
    logoutUser: (state) => {
      state.user = {
        userStoraged: null,
        token: null,
      };

      localStorage.removeItem("user");
    },
  },
});
export const { setUsers, setRegisterUser, setLoginUser, logoutUser } =
  UserSlice.actions;

export default UserSlice.reducer;
