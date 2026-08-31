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
import { setRegisterUser } from "../../reduxSlice/userSlice/UserSlice.js";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { UserType } from "../../../utilities/interfaces.js";
import { toast } from "react-toastify";
import type { AxiosError } from "axios";

/* ================= TYPES ================= */

type RegisterErrorResponse = {
  sms?: string[];
  emptyFields?: string[];
  error?: string;
};

/* ================= API ================= */

async function FetchUsersApi(action: PayloadAction<UserType>) {
  const response = await apiRequest({
    api: "register-user",
    method: "POST",
    endpoint: "",
    body: action.payload,
  });

  return response;
}

/* ================= SAGA WORKER ================= */

function* FetchRegisterUsers(action: PayloadAction<UserType>): SagaIterator {
  try {
    yield put(setSuccess(false));

    yield put(setLoading());

    const data = yield call(FetchUsersApi, action);

    console.log("SUCCESS DATA:", data);

    const user = data.user;

    if (user) {
      yield put(setRegisterUser(user));
    }

    yield put(setFields([]));
    yield put(setSuccess(true));

    toast.success(data.sms?.[0] || "User is successfully created");
  } catch (error: unknown) {
    console.log("REGISTER ERROR:", error);
    yield put(setSuccess(false));

    const err = error as AxiosError<RegisterErrorResponse>;

    const resData = err.response?.data;

    console.log("ERROR RESPONSE DATA:", resData);

    /* ================= TOAST ERROR ================= */

    if (resData?.sms?.length) {
      resData.sms.forEach((msg: string) => {
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

    yield put(setError("Something went wrong"));
  } finally {
    yield put(setClearLoading());
  }
}

/* ================= WATCHER ================= */

export function* WatchFetchRegisterUsers() {
  yield takeLatest("Fetch-REGISTER-USERS", FetchRegisterUsers);
}
