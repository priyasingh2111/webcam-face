import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define the initial state and its type
interface WebcamState {
  isWebcamActive: boolean;
}

const initialState: WebcamState = {
  isWebcamActive: false,
};

const webcamSlice = createSlice({
  name: 'webcam',
  initialState,
  reducers: {
    // Action to set webcam active status
    setWebcamActive(state, action: PayloadAction<boolean>) {
      state.isWebcamActive = action.payload;
    },
  },
});

export const { setWebcamActive } = webcamSlice.actions;
export default webcamSlice.reducer;
