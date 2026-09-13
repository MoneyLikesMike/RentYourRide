import { createSelector } from "reselect";

const selectLicenses = (state: Object) => state.licenses;

const makeSelectLicenses = () =>
  createSelector(selectLicenses, reducer => reducer.licenses);

const makeSelectMaxCount = () =>
  createSelector(selectLicenses, reducer => reducer.maxCount);

export { makeSelectLicenses, makeSelectMaxCount };
