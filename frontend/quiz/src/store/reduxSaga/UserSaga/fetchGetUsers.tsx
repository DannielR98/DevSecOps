import { call, put, takeLatest } from "redux-saga/effects";

import type { SagaIterator } from "redux-saga";
import type { PayloadAction } from "@reduxjs/toolkit";
import { apiRequest } from "../../../utilities/HeaderFunction.js";
import {
  setClearLoading,
  setError,
  setLoading,
} from "../../reduxSlice/LoadingSlice/LoadingAndErrorSlice.js";
import { setUsers } from "../../reduxSlice/userSlice/UserSlice.js";

async function FetchApiUrl(token: string) {
  const data = await apiRequest({
    api: "users",
    method: "GET",
    endpoint: "",
    token,
  });
  const users = data.users;
  return users;
}

function* FetchGetUsers(action: PayloadAction<string>): SagaIterator {
  try {
    yield put(setLoading());

    const users = yield call(FetchApiUrl, action.payload);

    yield put(setUsers(users));
  } catch (error: unknown) {
    let message = "Something went wrong";

    if (error instanceof Error) {
      message = error.message;
    }

    yield put(setError(message));
  } finally {
    yield put(setClearLoading());
  }
}

export function* WatchFetchGetUsers() {
  yield takeLatest("Fetch-USERS", FetchGetUsers);
}
