import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RegisterUserType } from "../../../utilities/interfaces";

interface InitialStateType {
  users: RegisterUserType[];
}

const initialState: InitialStateType = {
  users: [],
};
const UserSlice = createSlice({
  name: "UserSlice",
  initialState,
  reducers: {
    setUsers: (state, action: PayloadAction<RegisterUserType[]>) => {
      state.users = action.payload;
    },
  },
});
export const { setUsers } = UserSlice.actions;

export default UserSlice.reducer;
