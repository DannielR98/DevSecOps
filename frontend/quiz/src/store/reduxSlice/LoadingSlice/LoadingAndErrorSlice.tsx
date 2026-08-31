import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";
interface LoadingErrorType {
  isLoading: boolean;
  error: string | null;
  fields: string[];
  isSuccess: boolean;
}

const initialState: LoadingErrorType = {
  isLoading: false,
  error: null,
  fields: [],
  isSuccess: false,
};

const LoadAndErrorSlice = createSlice({
  name: "LoadAndErrorSlice",
  initialState,
  reducers: {
    setLoading: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.isLoading = true;
      state.error = action.payload;
    },
    setClearLoading: (state) => {
      state.isLoading = false;
      state.error = null;
    },
    setFields: (state, action: PayloadAction<string[]>) => {
      state.fields = action.payload;
    },
    setSuccess: (state, action: PayloadAction<boolean>) => {
      state.isSuccess = action.payload;
    },
  },
});
export const { setLoading, setError, setClearLoading, setFields, setSuccess } =
  LoadAndErrorSlice.actions;

export default LoadAndErrorSlice.reducer;
