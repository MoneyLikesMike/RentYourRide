import { call, put, takeEvery } from "redux-saga/effects";
import { toResult } from "redux-saga-helpers";
import actions from "../actions";
import API from "../../api";
import LoaderService from "../../services/loader";

function* getMembers({ payload }) {
  const { order, page, take, query, field } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.getMembers), {
    order,
    page,
    take,
    field,
    query
  });

  if (data) {
    LoaderService.hide();
    yield put(actions.getMembers.success(data));
  } else {
    LoaderService.hide();
    yield put(actions.getMembers.error({...error, payload}));
  }
}

function* getUserTrips({ payload }) {
  const { id, phase } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.getUserTrips), { id, phase });
  if (data) {
    LoaderService.hide();
    yield put(actions.getUserTrips.success(data));
  } else {
    LoaderService.hide();
    yield put(actions.getUserTrips.error({...error, payload}));
  }
}

function* getListings({ payload }) {
  const { id } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.getListings), { id });

  if (data) {
    LoaderService.hide();
    yield put(actions.getListings.success(data));
  } else {
    LoaderService.hide();
    yield put(actions.getListings.error({...error, payload}));
  }
}

function* getUser({ payload }) {
  const { id } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.getUser), { id });

  if (data) {
    LoaderService.hide();
    yield put(actions.getUser.success(data));
  } else {
    LoaderService.hide();
    yield put(actions.getUser.error({...error, payload}));
  }
}

function* editUser({ payload }) {
  const { id, body } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.editUser), { id, body });

  if (data) {
    LoaderService.hide();
    yield put(actions.editUser.success(data));
  } else {
    LoaderService.hide();
    yield put(actions.editUser.error({...error, payload}));
  }
}

function* deleteUser({ payload }) {
  const { id } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.deleteUser), { id });
  if (data) {
    LoaderService.hide();
    yield put(actions.deleteUser.success(data));
  } else {
    LoaderService.hide();
    yield put(actions.deleteUser.error({...error, payload}));
  }
}

function* deactivateUser({ payload }) {
  const { id } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.deactivateUser), { id });
  if (data) {
    LoaderService.hide();
    yield put(actions.deactivateUser.success(data));
    yield put(actions.getUser.success(data));
  } else {
    LoaderService.hide();
    yield put(actions.deactivateUser.error({...error, payload}));
  }
}

function* activateUser({ payload }) {
  const { id } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.activateUser), { id });
  if (data) {
    LoaderService.hide();
    yield put(actions.activateUser.success(data));
    yield put(actions.getUser.success(data));
  } else {
    LoaderService.hide();
    yield put(actions.activateUser.error({...error, payload}));
  }
}

function* verifyEmail({ payload }) {
  const { id } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.verifyEmail), { id });
  if (data) {
    LoaderService.hide();
    yield put(actions.verifyEmail.success(data));
  } else {
    LoaderService.hide();
    yield put(actions.verifyEmail.error({...error, payload}));
  }
}

export default function*() {
  yield takeEvery(actions.getMembers.request, getMembers);
  yield takeEvery(actions.getUserTrips.request, getUserTrips);
  yield takeEvery(actions.getListings.request, getListings);
  yield takeEvery(actions.getUser.request, getUser);
  yield takeEvery(actions.editUser.request, editUser);
  yield takeEvery(actions.deleteUser.request, deleteUser);
  yield takeEvery(actions.verifyEmail.request, verifyEmail);
  yield takeEvery(actions.deactivateUser.request, deactivateUser);
  yield takeEvery(actions.activateUser.request, activateUser);
}
