import * as serviceWorker from "./serviceWorker";
import React from "react";
import ReactDOM from "react-dom";
import { configureStore } from "./redux/store";
import { Provider } from "react-redux";
import "./index.scss";

import AppContainer from "./screens/App";

export const store = configureStore();

ReactDOM.render(
  <Provider store={store}>
    <AppContainer />
  </Provider>,
  document.getElementById("root")
);

serviceWorker.unregister();
