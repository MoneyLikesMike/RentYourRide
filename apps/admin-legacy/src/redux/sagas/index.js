import { spawn } from "redux-saga/effects";
import authSaga from "./auth";
import membersSaga from "./members";
import tripsSaga from "./trips";
import ridesSaga from "./rides";
import licensesSaga from "./licenses";
import notesSaga from "./notes";

export default function*() {
  yield spawn(authSaga);
  yield spawn(membersSaga);
  yield spawn(tripsSaga);
  yield spawn(ridesSaga);
  yield spawn(licensesSaga);
  yield spawn(notesSaga);
}
