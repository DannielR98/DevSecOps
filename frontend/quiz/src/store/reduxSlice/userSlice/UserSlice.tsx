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
  userById: UserType | null;
}

const initialState: InitialStateType = {
  users: [],
  user: parsedUser,
  userById: null,
};
const UserSlice = createSlice({
  name: "UserSlice",
  initialState,
  reducers: {
    setUsers: (state, action: PayloadAction<UserType[]>) => {
      state.users = action.payload;
    },
    setUser: (state, action: PayloadAction<UserType>) => {
      state.userById = action.payload;
    },

    setRegisterUser: (state, action: PayloadAction<UserType>) => {
      state.users.push(action.payload);
    },
    setLoginUser: (state, action: PayloadAction<StoragedUserType>) => {
      state.user = action.payload;
      localStorage.setItem("user", JSON.stringify(action.payload));
    },
    setDeleteUser: (state, action: PayloadAction<number>) => {
      state.users = state.users.filter(
        (u) => Number(u.id) !== Number(action.payload),
      );
    },
    setUpdateUser: (
      state,
      action: PayloadAction<{ data: UserType; id: number }>,
    ) => {
      const findUser = state.users.findIndex(
        (u) => Number(u.id) === Number(action.payload.id),
      );

      if (findUser !== -1) {
        state.users[findUser] = action.payload.data;
      }

      if (
        state.user.userStoraged &&
        Number(state.user.userStoraged.id) === Number(action.payload.id)
      ) {
        state.user.userStoraged = action.payload.data;
      }

      // 3. Update localStorage
      const storageUser = localStorage.getItem("user");

      if (storageUser) {
        const parsedUser = JSON.parse(storageUser);

        localStorage.setItem(
          "user",
          JSON.stringify({
            ...parsedUser,
            userStoraged: action.payload.data,
          }),
        );
      }
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
export const {
  setUsers,
  setRegisterUser,
  setLoginUser,
  logoutUser,
  setDeleteUser,
  setUpdateUser,
  setUser,
} = UserSlice.actions;

export default UserSlice.reducer;
