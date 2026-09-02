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

import { setUpdateUser } from "../../reduxSlice/userSlice/UserSlice.js";

import type { UserType } from "../../../utilities/interfaces.js";

/* ================= TYPES ================= */

type UpdateUserPayload = {
  data: UserType;
  id: number;
};

type UpdateResponse = {
  sms?: string[];
  message?: string;
  user?: UserType;
};

type UpdateErrorResponse = {
  sms?: string[];
  emptyFields?: string[];
  error?: string;
  message?: string;
};

/* ================= API ================= */

async function UpdateUserApi(action: PayloadAction<UpdateUserPayload>) {
  const storageUser = localStorage.getItem("user");

  const token = storageUser ? JSON.parse(storageUser).token : null;

  const response = await apiRequest({
    api: `update-user/${action.payload.id}`,
    method: "PUT",
    endpoint: "",
    body: action.payload.data,
    token,
  });

  return response as UpdateResponse;
}

/* ================= SAGA WORKER ================= */

function* FetchUpdateUser(
  action: PayloadAction<UpdateUserPayload>,
): SagaIterator {
  try {
    yield put(setSuccess(false));
    yield put(setLoading());

    const data: UpdateResponse = yield call(UpdateUserApi, action);

    console.log("UPDATE SUCCESS:", data);

    /* ================= UPDATE REDUX ================= */

    if (data.user) {
      yield put(
        setUpdateUser({
          id: action.payload.id,
          data: data.user,
        }),
      );
    }

    /* ================= CLEAR FIELDS ================= */

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
      toast.success("User successfully updated");
    }
  } catch (error: unknown) {
    console.log("UPDATE ERROR:", error);

    yield put(setSuccess(false));

    const err = error as AxiosError<UpdateErrorResponse>;

    const resData = err.response?.data;

    console.log("UPDATE ERROR RESPONSE:", resData);

    /* ================= FIELD ERRORS ================= */

    if (resData?.emptyFields?.length) {
      yield put(setFields(resData.emptyFields));
    } else {
      yield put(setFields([]));
    }

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

    /* ================= ERROR ================= */

    yield put(
      setError(resData?.error || resData?.message || "Something went wrong"),
    );
  } finally {
    yield put(setClearLoading());
  }
}

/* ================= WATCHER ================= */

export function* WatchFetchUpdateUser(): SagaIterator {
  yield takeLatest("Fetch-UPDATE-USER", FetchUpdateUser);
}
