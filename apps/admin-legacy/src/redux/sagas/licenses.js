import { call, put, takeEvery } from "redux-saga/effects";
import { toResult } from "redux-saga-helpers";
import actions from "../actions";
import API from "../../api";
import LoaderService from "../../services/loader";

function* getLicenses({ payload }) {
  const { order, page, take, query, field } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.getLicenses), {
    order,
    page,
    take,
    query,
    field
  });

  if (data) {
    LoaderService.hide();
    yield put(actions.getLicenses.success(data));
  } else {
    LoaderService.hide();
    yield put(actions.getLicenses.error({...error, payload}));
  }
}

export default function*() {
  yield takeEvery(actions.getLicenses.request, getLicenses);
}
