import { call, put, takeEvery } from "redux-saga/effects";
import { toResult } from "redux-saga-helpers";
import actions from "../actions";
import API from "../../api";
import LoaderService from "../../services/loader";

function* getTrips({ payload }) {
  const { pagination, phase } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.getTrips), {
    pagination,
    phase
  });

  if (data) {
    LoaderService.hide();
    yield put(actions.getTrips.success(data));
  } else {
    LoaderService.hide();
    yield put(actions.getTrips.error({...error, payload}));
  }
}

function* getTrip({ payload }) {
  const { id } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.getTrip), { id });

  if (data) {
    LoaderService.hide();
    yield put(actions.getTrip.success(data));
  } else {
    LoaderService.hide();
    yield put(actions.getTrip.error({...error, payload}));
  }
}

export default function*() {
  yield takeEvery(actions.getTrips.request, getTrips);
  yield takeEvery(actions.getTrip.request, getTrip);
}
