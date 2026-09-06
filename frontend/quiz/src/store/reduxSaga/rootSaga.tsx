import { all } from "redux-saga/effects";
import { WatchFetchGetUsers } from "./UserSaga/fetchGetUsers";
import { WatchFetchDeleteUser } from "./UserSaga/fetchDeleteUser";
import { WatchFetchUpdateUser } from "./UserSaga/fetchUpdateUser";
import { WatchFetchUserById } from "./UserSaga/fetchGetUserById";

export default function* RootSaga() {
  yield all([
    WatchFetchGetUsers(),
    WatchFetchDeleteUser(),
    WatchFetchUpdateUser(),
    WatchFetchUserById()
  ]);
}
