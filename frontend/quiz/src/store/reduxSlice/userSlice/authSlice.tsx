import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@auth0/auth0-react";

type AuthState = {
  isAuth: boolean;
  token: string | null;
  userStorage: User | null;
};

const initialState: AuthState = {
  isAuth: false,
  token: null,
  userStorage: null,
};

const authSlice = createSlice({
  name: "authSlice",
  initialState,

  reducers: {
    // Save Auth0 data
    setAuth: (
      state,
      action: PayloadAction<{
        isAuth: boolean;
        token: string;
        userStorage: User;
      }>,
    ) => {
      state.isAuth = action.payload.isAuth;
      state.token = action.payload.token;
      state.userStorage = action.payload.userStorage;

      // Save to localStorage
      localStorage.setItem(
        "storedUser",
        JSON.stringify({
          token: action.payload.token,
          user: action.payload.userStorage,
        }),
      );
    },

    // Load Auth0 data after refresh
    loadAuth: (state) => {
      const storedUser = localStorage.getItem("storedUser");

      if (!storedUser) {
        return;
      }

      try {
        const data = JSON.parse(storedUser);

        state.isAuth = !!data.token;
        state.token = data.token ?? null;
        state.userStorage = data.user ?? null;
      } catch (error) {
        console.error("LOAD AUTH ERROR:", error);

        localStorage.removeItem("storedUser");
      }
    },

    // Clear Auth0 data
    clearAuth: (state) => {
      state.isAuth = false;
      state.token = null;
      state.userStorage = null;

      localStorage.removeItem("storedUser");
    },
  },
});

export const { setAuth, loadAuth, clearAuth } = authSlice.actions;

export default authSlice.reducer;
