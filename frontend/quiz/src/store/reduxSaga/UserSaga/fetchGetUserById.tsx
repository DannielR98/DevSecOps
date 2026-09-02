import { call, put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import { toast } from "react-toastify";

import { apiRequest } from "../../../utilities/HeaderFunction.js";

import {
  setClearLoading,
  setError,
  setLoading,
} from "../../reduxSlice/LoadingSlice/LoadingAndErrorSlice.js";

import { setUser } from "../../reduxSlice/userSlice/UserSlice.js";

import type { UserType } from "../../../utilities/interfaces.js";

/* ================= TYPES ================= */

type GetUserResponse = {
  user?: UserType;
};

type GetUserErrorResponse = {
  error?: string;
  message?: string;
  sms?: string[];
};

/* ================= API ================= */

async function GetUserByIdApi(action: PayloadAction<number>) {
  const storageUser = localStorage.getItem("user");

  const token = storageUser ? JSON.parse(storageUser).token : null;

  const response = await apiRequest({
    api: `user/${action.payload}`,
    method: "GET",
    endpoint: "",
    token,
  });

  return response as GetUserResponse;
}

/* ================= SAGA WORKER ================= */

function* FetchUserById(action: PayloadAction<number>): SagaIterator {
  try {
    yield put(setLoading());

    const data: GetUserResponse = yield call(GetUserByIdApi, action);

    if (data.user) {
      yield put(setUser(data.user));
    }
  } catch (error: unknown) {
    console.log("GET USER ERROR:", error);

    const err = error as AxiosError<GetUserErrorResponse>;

    const resData = err.response?.data;

    console.log("GET USER ERROR RESPONSE:", resData);

    if (resData?.sms?.length) {
      resData.sms.forEach((msg) => {
        toast.error(msg);
      });
    } else if (resData?.error) {
      toast.error(resData.error);
    } else if (resData?.message) {
      toast.error(resData.message);
    } else {
      toast.error("Something went wrong");
    }

    yield put(
      setError(resData?.error || resData?.message || "Something went wrong"),
    );
  } finally {
    yield put(setClearLoading());
  }
}

/* ================= WATCHER ================= */

export function* WatchFetchUserById(): SagaIterator {
  yield takeLatest("Fetch-USER", FetchUserById);
}
