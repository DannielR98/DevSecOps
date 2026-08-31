import { all } from "redux-saga/effects";
import { WatchFetchGetUsers } from "./UserSaga/fetchGetUsers";
import { WatchFetchRegisterUsers } from "./UserSaga/fetchRegisterUserSaga";
import { WatchFetchLoginUser } from "./UserSaga/fetchLoginUser";

export default function* RootSaga() {
  yield all([
    WatchFetchGetUsers(),
    WatchFetchRegisterUsers(),
    WatchFetchLoginUser(),
  ]);
}
