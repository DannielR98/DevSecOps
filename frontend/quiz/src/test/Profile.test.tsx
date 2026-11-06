import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import UserInfoPage from "../page/UserPages/UserInfoPage/UserInfoPage";
import UpdateUserInfo from "../page/UserPages/UpdateUserInfo.tsx/UpdateUserInfo";
import { makeTestStore, renderWithProviders } from "./test-utils";

const user = {
  user_id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
  auth_id: "supabase-user",
  firstname: "Alice",
  surname: "Smith",
  username: "alice",
  email: "alice@example.com",
};

describe("profile pages", () => {
  it("requests a UUID profile using the current access token", async () => {
    const store = makeTestStore();
    const dispatch = vi.spyOn(store, "dispatch");
    renderWithProviders(
      <Routes><Route path="/user-info/:id" element={<UserInfoPage />} /></Routes>,
      { store, route: `/user-info/${user.user_id}` },
    );
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({
      type: "Fetch-USER",
      payload: { id: user.user_id, token: "test-token" },
    }));
  });

  it("edits a UUID profile using the access token without sending a password", async () => {
    const store = makeTestStore({
      userSlice: { users: [user], user: { userStoraged: null, token: null }, userOne: user },
    });
    const dispatch = vi.spyOn(store, "dispatch");
    const interaction = userEvent.setup();
    renderWithProviders(<UpdateUserInfo />, { store });
    await interaction.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("FirstName")).toHaveValue("Alice");
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    await interaction.clear(screen.getByLabelText("FirstName"));
    await interaction.type(screen.getByLabelText("FirstName"), "Alicia");
    await interaction.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({
      type: "Fetch-UPDATE-USER",
      payload: {
        id: user.user_id,
        token: "test-token",
        data: { firstname: "Alicia", surname: "Smith", username: "alice", email: "alice@example.com" },
      },
    }));
  });
});
