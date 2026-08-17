import { createSelector } from "reselect";

const selectSignInReducer = (state: Object) => state.auth;

const selectLoggedIn = () =>
  createSelector(selectSignInReducer, reducer => reducer.isLoggedIn);
const selectUser = () =>
  createSelector(selectSignInReducer, reducer => reducer.user);
const selectErrorMessage = () =>
  createSelector(selectSignInReducer, reducer => reducer.errorStatus);
const selectAccessToken = () =>
  createSelector(selectSignInReducer, reducer => reducer.accessToken);
const selectRefreshToken = () =>
  createSelector(selectSignInReducer, reducer => reducer.refreshToken);

export {
  selectLoggedIn,
  selectUser,
  selectErrorMessage,
  selectAccessToken,
  selectRefreshToken
};
