import { call, put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import { apiRequest } from "../../../utilities/HeaderFunction";
import {
  setClearLoading,
  setError,
  setFields,
  setLoading,
  setSuccess,
} from "../../reduxSlice/LoadingSlice/LoadingAndErrorSlice.js";
import { setLoginUser } from "../../reduxSlice/userSlice/UserSlice.js";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { UserType } from "../../../utilities/interfaces.js";
import { toast } from "react-toastify";
import type { AxiosError } from "axios";

/* ================= TYPES ================= */

type LoginErrorResponse = {
  sms?: string[];
  emptyFields?: string[];
  error?: string;
};

type LoginResponse = {
  user: UserType;
  token: string;
  sms?: string[];
};

/* ================= API ================= */

async function FetchUsersApi(action: PayloadAction<UserType>) {
  const response = await apiRequest({
    api: "login-user",
    method: "POST",
    endpoint: "",
    body: action.payload,
  });

  return response as LoginResponse;
}

/* ================= SAGA WORKER ================= */

function* FetchLoginUser(action: PayloadAction<UserType>): SagaIterator {
  try {
    yield put(setSuccess(false));
    yield put(setLoading());

    const data: LoginResponse = yield call(FetchUsersApi, action);

    console.log("LOGIN SUCCESS:", data);

    if (data.user && data.token) {
      yield put(
        setLoginUser({
          userStoraged: data.user,
          token: data.token,
        }),
      );
    }

    yield put(setFields([]));
    yield put(setSuccess(true));

    toast.success(data.sms?.[0] || "Login successfully");
  } catch (error: unknown) {
    console.log("LOGIN ERROR:", error);
    yield put(setSuccess(false));

    const err = error as AxiosError<LoginErrorResponse>;

    const resData = err.response?.data;

    console.log("LOGIN ERROR RESPONSE:", resData);

    /* ================= TOAST ERROR ================= */

    if (resData?.sms?.length) {
      resData.sms.forEach((msg) => {
        toast.error(msg);
      });
    } else if (resData?.error) {
      toast.error(resData.error);
    } else {
      toast.error("Something went wrong");
    }

    /* ================= FIELD ERRORS ================= */

    if (resData?.emptyFields) {
      yield put(setFields(resData.emptyFields));
    }

    yield put(setError(resData?.error || "Something went wrong"));
  } finally {
    yield put(setClearLoading());
  }
}

/* ================= WATCHER ================= */

export function* WatchFetchLoginUser() {
  yield takeLatest("Fetch-LOGIN-USERS", FetchLoginUser);
}
