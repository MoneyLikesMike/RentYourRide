import { createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";
import rootSaga from "../sagas";
import reducer from "../reducers";
import { composeWithDevTools } from 'redux-devtools-extension';

const sagaMiddleware = createSagaMiddleware();

export const configureStore = () => {
  const store = createStore(reducer, composeWithDevTools(
      applyMiddleware(sagaMiddleware),
  ));
  sagaMiddleware.run(rootSaga);
  return store;
};
