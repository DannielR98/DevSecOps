import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import rootSaga from "./reduxSaga/rootSaga";
import UserSliceReducer from "./reduxSlice/userSlice/UserSlice.js";

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    userSlice: UserSliceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
