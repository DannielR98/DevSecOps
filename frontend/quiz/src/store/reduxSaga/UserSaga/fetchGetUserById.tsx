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

import { setUserById } from "../../reduxSlice/userSlice/UserSlice.js";

import type { UserType } from "../../../utilities/interfaces.js";

type GetUserResponse = {
  user?: UserType;
};

type GetUserErrorResponse = {
  error?: string;
  message?: string;
  sms?: string[];
};

type GetUserPayload = {
  id: number;
  token: string;
};

// ================= API ================= //

async function GetUserByIdApi(payload: GetUserPayload) {
  const response = await apiRequest({
    api: `user/${payload.id}`,
    method: "GET",
    endpoint: "",
    token: payload.token,
  });

  return response as GetUserResponse;
}

// ================= WORKER ================= //

function* FetchUserById(action: PayloadAction<GetUserPayload>): SagaIterator {
  try {
    yield put(setLoading());

    const data: GetUserResponse = yield call(GetUserByIdApi, action.payload);

    console.log("GET USER DATA:", data);

    if (data.user?.id !== undefined) {
      yield put(setUserById(data.user.id));
    }
  } catch (error: unknown) {
    console.error("GET USER ERROR:", error);

    const err = error as AxiosError<GetUserErrorResponse>;

    const resData = err.response?.data;

    console.error("GET USER ERROR RESPONSE:", resData);

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

// ================= WATCHER ================= //

export function* WatchFetchUserById(): SagaIterator {
  yield takeLatest("Fetch-USER", FetchUserById);
}
