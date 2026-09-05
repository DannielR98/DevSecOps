/* import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
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
  userOne: UserType | null;
}

const initialState: InitialStateType = {
  users: [],
  user: parsedUser,
  userOne: null,
};
const UserSlice = createSlice({
  name: "UserSlice",
  initialState,
  reducers: {
    setUsers: (state, action: PayloadAction<UserType[]>) => {
      state.users = action.payload;
    },
    setUser: (state, action: PayloadAction<string>) => {
      const findUser = state.users.find((u) => u.auth0_id === action.payload);

      if (findUser) {
        state.userOne = findUser;
      }
    },
    setUserById: (state, action: PayloadAction<number>) => {
      const findUser = state.users.find((u) => u.id === action.payload);

      if (findUser) {
        state.userOne = findUser;
      }
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
  setUserById,
} = UserSlice.actions;

export default UserSlice.reducer;
 */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { UserType } from "../../../utilities/interfaces.js";

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
  userOne: UserType | null;
}

const initialState: InitialStateType = {
  users: [],
  userOne: null,
  user: parsedUser,
};

const userSlice = createSlice({
  name: "userSlice",
  initialState,

  reducers: {
    setUsers: (state, action: PayloadAction<UserType[]>) => {
      state.users = action.payload;
    },

    // Find user by Auth0 ID
    setUser: (state, action: PayloadAction<string>) => {
      const findUser = state.users.find((u) => u.auth0_id === action.payload);

      if (findUser) {
        state.userOne = findUser;
      }
    },

    // Find user by database ID
    setUserById: (state, action: PayloadAction<number>) => {
      const findUser = state.users.find((u) => u.id === action.payload);

      if (findUser) {
        state.userOne = findUser;
      }
    },

    /*  old */

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

    /*  */
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
  setUserById,
} = userSlice.actions;

export default userSlice.reducer;
