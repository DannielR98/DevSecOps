import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import { waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import userReducer from "../store/reduxSlice/userSlice/UserSlice";
import loadingReducer from "../store/reduxSlice/LoadingSlice/LoadingAndErrorSlice";
import { WatchFetchGetUsers } from "../store/reduxSaga/UserSaga/fetchGetUsers";
import { WatchFetchUserById } from "../store/reduxSaga/UserSaga/fetchGetUserById";
import { WatchFetchUpdateUser } from "../store/reduxSaga/UserSaga/fetchUpdateUser";
import { mockApiRequest } from "./setup";

describe("profile API contract", () => {
  it("uses bearer tokens and UUID profiles for serverless-compatible responses", async () => {
    const user = {
      user_id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      auth_id: "supabase-user",
      firstname: "Alice",
      surname: "Smith",
      username: "alice",
      email: "alice@example.com",
    };
    const updated = { ...user, firstname: "Alicia" };
    mockApiRequest.mockImplementation(async ({ api }: { api: string }) => {
      if (api === "users") { return { users: [user] }; }
      if (api === `user/${user.user_id}`) { return { user }; }
      if (api === `update-user/${user.user_id}`) { return { user: updated }; }
      throw new Error(`Unexpected API request: ${api}`);
    });

    const middleware = createSagaMiddleware();
    const store = configureStore({
      reducer: { userSlice: userReducer, loadingSlice: loadingReducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(middleware),
    });
    const tasks = [
      middleware.run(WatchFetchGetUsers),
      middleware.run(WatchFetchUserById),
      middleware.run(WatchFetchUpdateUser),
    ];

    try {
      store.dispatch({ type: "Fetch-USERS", payload: "access-token" });
      await waitFor(() => expect(store.getState().userSlice.users).toEqual([user]));
      expect(mockApiRequest).toHaveBeenCalledWith(expect.objectContaining({
        api: "users", method: "GET", token: "access-token",
      }));

      store.dispatch({ type: "Fetch-USER", payload: { id: user.user_id, token: "access-token" } });
      await waitFor(() => expect(store.getState().userSlice.userOne).toEqual(user));
      expect(mockApiRequest).toHaveBeenCalledWith(expect.objectContaining({
        api: `user/${user.user_id}`, method: "GET", token: "access-token",
      }));

      const body = { firstname: "Alicia", surname: "Smith", username: "alice", email: "alice@example.com" };
      store.dispatch({ type: "Fetch-UPDATE-USER", payload: { id: user.user_id, token: "access-token", data: body } });
      await waitFor(() => expect(store.getState().userSlice.userOne).toEqual(updated));
      expect(mockApiRequest).toHaveBeenCalledWith(expect.objectContaining({
        api: `update-user/${user.user_id}`, method: "PUT", token: "access-token", body,
      }));
    } finally {
      tasks.forEach((task) => task.cancel());
    }
  });
});
