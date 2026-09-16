import { combineReducers } from "redux";

import auth from "./auth";
import members from "./members";
import trips from "./trips";
import rides from "./rides";
import licenses from "./licenses";
import loadings from "./loadings";

export default combineReducers({
  auth,
  members,
  trips,
  rides,
  licenses,
  loadings
});
