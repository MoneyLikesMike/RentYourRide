import { call, put, select, takeEvery } from "redux-saga/effects";
import { toResult } from "redux-saga-helpers";
import actions from "../actions";
import API from "../../api";
import LoaderService from "../../services/loader";
import { makeSelectRide } from "../selectors/rides";

const updateCoverImage = v => {
  if (v.images.length && v.coverImage && v.coverImage.id) {
    const tempImages = v.images.filter(i => i.id !== v.coverImage.id);
    tempImages.unshift(v.coverImage);
    v.images = tempImages;
  }
  return v;
};

function* getRides({ payload }) {
  const { order, page, take, query, field, isActivated } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.getRides), {
    order,
    page,
    take,
    query,
    field,
    isActivated
  });

  if (data) {
    LoaderService.hide();
    yield put(actions.getRides.success(data));
  } else {
    LoaderService.hide();
    yield put(actions.getRides.error({...error, payload}));
  }
}

function* getRide({ payload }) {
  const { id } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.getRide), { id });

  if (data) {
    LoaderService.hide();
    const parsedData = updateCoverImage(data);
    yield put(actions.getRide.success(parsedData));
  } else {
    LoaderService.hide();
    yield put(actions.getRide.error({...error, payload}));
  }
}

function* rideVerify({ payload }) {
  const { id } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.rideVerify), { id });
  const ride = yield select(makeSelectRide());
  const changedRide = {
    ...ride,
    isVerified: data.isVerified
  };
  if (data) {
    LoaderService.hide();
    yield put(actions.rideVerify.success(data));
    yield put(actions.getRide.success(changedRide));
  } else {
    LoaderService.hide();
    yield put(actions.rideVerify.error({...error, payload}));
  }
}

function* rideUnverify({ payload }) {
  const { id } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.rideUnverify), { id });
  const ride = yield select(makeSelectRide());
  const changedRide = {
    ...ride,
    isVerified: data.isVerified
  };
  if (data) {
    LoaderService.hide();
    yield put(actions.rideUnverify.success(data));
    yield put(actions.getRide.success(changedRide));
  } else {
    LoaderService.hide();
    yield put(actions.rideUnverify.error({...error, payload}));
  }
}

function* rideActivate({ payload }) {
  const { id } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.rideActivate), { id });
  const ride = yield select(makeSelectRide());
  const changedRide = {
    ...ride,
    isActivated: data.isActivated
  };
  if (data) {
    LoaderService.hide();
    yield put(actions.rideActivate.success(data));
    yield put(actions.getRide.success(changedRide));
  } else {
    LoaderService.hide();
    yield put(actions.rideActivate.error({...error, payload}));
  }
}

function* rideDeactivate({ payload }) {
  const { id } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.rideDeactivate), { id });
  const ride = yield select(makeSelectRide());
  const changedRide = {
    ...ride,
    isActivated: data.isActivated
  };
  if (data) {
    LoaderService.hide();
    yield put(actions.rideDeactivate.success(data));
    yield put(actions.getRide.success(changedRide));
  } else {
    LoaderService.hide();
    yield put(actions.rideDeactivate.error({...error, payload}));
  }
}

export default function*() {
  yield takeEvery(actions.getRides.request, getRides);
  yield takeEvery(actions.getRide.request, getRide);
  yield takeEvery(actions.rideVerify.request, rideVerify);
  yield takeEvery(actions.rideUnverify.request, rideUnverify);
  yield takeEvery(actions.rideActivate.request, rideActivate);
  yield takeEvery(actions.rideDeactivate.request, rideDeactivate);
}
