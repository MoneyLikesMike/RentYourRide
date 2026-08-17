import { call, put, takeEvery, select } from "redux-saga/effects";
import { toResult } from "redux-saga-helpers";
import actions from "../actions";
import API from "../../api";
import LoaderService from "../../services/loader";
import selectLoading from '../reducers/loadings';
import {selectRefreshToken} from '../selectors/auth';

function* signIn({ payload }) {
  const { email, password } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.signIn), { email, password });

  if (data) {
    LoaderService.hide();
    localStorage.setItem("accessToken", data.token.accessToken);
    localStorage.setItem("refreshToken", data.token.refreshToken);
    localStorage.setItem("user", JSON.stringify(data));
    yield put(actions.signIn.success(data));
  } else {
    LoaderService.hide();
    yield put(actions.signIn.error({...error, payload}));
  }
}

function* logout() {
  localStorage.clear();
  yield put(actions.logout.success());
}

// function* refreshToken({ payload }) {
//   const { refreshToken } = payload;
//   LoaderService.show();
//   const [data, error] = yield call(toResult(API.refreshToken), {
//     refreshToken
//   });
//
//   if (data) {
//     LoaderService.hide();
//     localStorage.setItem("accessToken", data.accessToken);
//     localStorage.setItem("refreshToken", data.refreshToken);
//     yield put(actions.refreshToken.success(data));
//     window.location.reload(true);
//   } else {
//     LoaderService.hide();
//     yield put(actions.refreshToken.error(error));
//     yield put(actions.logout());
//   }
// }

const parseAction = text => {
  let newText = '';
  let upperCaseLetter = null;
  for (let i = 0; i < text.length; i++) {
    if (upperCaseLetter === i) {
      newText += text[i];
    } else if (text[i] !== '_') {
      newText += text[i].toLowerCase();
    } else {
      upperCaseLetter = i + 1;
    }
  }
  return newText;
};


function* handleRefreshToken({payload = {}, type}) {
  // const isRefreshing = yield select(selectLoading('REFRESH_TOKEN'));
  // console.log({isRefreshing});
  // if (!isRefreshing) {
    LoaderService.show();
  const refreshToken = localStorage.getItem("refreshToken");

    // const refreshToken = yield select(selectRefreshToken);
    const [data, error] = yield call(toResult(API.refreshToken), {
      refreshToken,
    });
    console.log({data});
    LoaderService.hide();
    if (!error) {
      yield put(actions.refreshToken.success(data));
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      const actionPayload = payload && payload.payload ? payload.payload : {};

      const errorAction = type.replace('_ERROR', '');

      if (actions[parseAction(errorAction)]) {
        yield put(
            actions[parseAction(errorAction)].request
                ? actions[parseAction(errorAction)].request(actionPayload)
                : actions[parseAction(errorAction)],
        );
      }
      // }
    } else {
      yield put(actions.refreshToken.error(error));
      yield put(actions.logout.request());
    }
  // }
}


export default function*() {
  yield takeEvery(actions.signIn.request, signIn);
  yield takeEvery(actions.logout.request, logout);
  yield takeEvery(
      action => {
        return action && action.payload && action.payload.status === 401;
      },
      handleRefreshToken,
  );
}
