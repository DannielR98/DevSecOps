import { all } from "redux-saga/effects";
import { WatchFetchGetUsers } from "./UserSaga/fetchGetUsers";
import { WatchFetchRegisterUsers } from "./UserSaga/fetchRegisterUserSaga";
import { WatchFetchLoginUser } from "./UserSaga/fetchLoginUser";
import { WatchFetchDeleteUser } from "./UserSaga/fetchDeleteUser";
import { WatchFetchUpdateUser } from "./UserSaga/fetchUpdateUser";
import { WatchFetchUserById } from "./UserSaga/fetchGetUserById";

export default function* RootSaga() {
  yield all([
    WatchFetchGetUsers(),
    WatchFetchRegisterUsers(),
    WatchFetchLoginUser(),
    WatchFetchDeleteUser(),
    WatchFetchUpdateUser(),
    WatchFetchUserById()
  ]);
}
