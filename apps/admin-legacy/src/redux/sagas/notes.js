import { call, put, select, takeEvery } from "redux-saga/effects";
import { toResult } from "redux-saga-helpers";
import actions from "../actions";
import API from "../../api";
import LoaderService from "../../services/loader";
import { makeSelectUser } from "../selectors/members";

function* addNote({ payload }) {
  const { id, text } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.addNote), {
    id,
    text
  });

  const user = yield select(makeSelectUser());
  if (user.receivedNotes && user.receivedNotes.length) {
    user.receivedNotes.push(data);
  } else {
    user.receivedNotes = [data];
  }

  if (data) {
    LoaderService.hide();
    yield put(actions.addNote.success(data));
    yield put(actions.getUser.success(user));
  } else {
    LoaderService.hide();
    yield put(actions.addNote.error({...error, payload}));
  }
}

function* editNote({ payload }) {
  const { id, text, noteId } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.editNote), {
    id,
    noteId,
    text
  });

  const user = yield select(makeSelectUser());
  if (user.receivedNotes && user.receivedNotes.length) {
    const editIndex = user.receivedNotes.findIndex(n => n.id === noteId);
    user.receivedNotes[editIndex] = data;
  }

  if (data) {
    LoaderService.hide();
    yield put(actions.editNote.success(data));
    yield put(actions.getUser.success(user));
  } else {
    LoaderService.hide();
    yield put(actions.editNote.error({...error, payload}));
  }
}

function* deleteNote({ payload }) {
  const { id, noteId } = payload;
  LoaderService.show();
  const [data, error] = yield call(toResult(API.deleteNote), {
    id,
    noteId
  });

  const user = yield select(makeSelectUser());
  if (user.receivedNotes && user.receivedNotes.length) {
    user.receivedNotes = user.receivedNotes.filter(n => n.id !== noteId);
  }

  if (data) {
    LoaderService.hide();
    yield put(actions.deleteNote.success(data));
    yield put(actions.getUser.success(user));
  } else {
    LoaderService.hide();
    yield put(actions.deleteNote.error({...error, payload}));
  }
}

export default function*() {
  yield takeEvery(actions.addNote.request, addNote);
  yield takeEvery(actions.editNote.request, editNote);
  yield takeEvery(actions.deleteNote.request, deleteNote);
}
