import { call, put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AxiosError } from "axios";
import { toast } from "react-toastify";

import { apiRequest } from "../../../utilities/HeaderFunction.js";

import {
  setClearLoading,
  setError,
  setFields,
  setLoading,
  setSuccess,
} from "../../reduxSlice/LoadingSlice/LoadingAndErrorSlice.js";

import {
  logoutUser,
  setDeleteUser,
} from "../../reduxSlice/userSlice/UserSlice.js";

/* ================= TYPES ================= */

type DeleteErrorResponse = {
  sms?: string[];
  error?: string;
  message?: string;
};

type DeleteResponse = {
  sms?: string[];
  message?: string;
};

/* ================= API ================= */

async function DeleteUserApi(action: PayloadAction<number>) {
  const storageUser = localStorage.getItem("user");

  const token = storageUser ? JSON.parse(storageUser).token : null;

  const response = await apiRequest({
    api: `delete-user/${action.payload}`,
    method: "DELETE",
    endpoint: "",
    token,
  });

  return response as DeleteResponse;
}

/* ================= SAGA WORKER ================= */

function* FetchDeleteUser(action: PayloadAction<number>): SagaIterator {
  try {
    yield put(setSuccess(false));
    yield put(setLoading());

    const data: DeleteResponse = yield call(DeleteUserApi, action);


    // Remove deleted user from Redux
    yield put(setDeleteUser(action.payload));

    // Logout current user
    yield put(logoutUser());

    yield put(setFields([]));
    yield put(setSuccess(true));

    /* ================= SUCCESS TOAST ================= */

    if (data.sms?.length) {
      data.sms.forEach((msg) => {
        toast.success(msg);
      });
    } else if (data.message) {
      toast.success(data.message);
    } else {
      toast.success("User successfully deleted");
    }
  } catch (error: unknown) {

    yield put(setSuccess(false));

    const err = error as AxiosError<DeleteErrorResponse>;

    const resData = err.response?.data;

    console.log("DELETE ERROR RESPONSE:", resData);

    /* ================= ERROR TOAST ================= */

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

    /* ================= FIELD ERRORS ================= */

    yield put(
      setError(resData?.error || resData?.message || "Something went wrong"),
    );
  } finally {
    yield put(setClearLoading());
  }
}

/* ================= WATCHER ================= */

export function* WatchFetchDeleteUser() {
  yield takeLatest("Fetch-DELETE-USER", FetchDeleteUser);
}
