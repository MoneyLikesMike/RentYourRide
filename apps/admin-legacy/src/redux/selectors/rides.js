import { createSelector } from "reselect";

const selectRides = (state: Object) => state.rides;

const makeSelectRides = () =>
  createSelector(selectRides, reducer => reducer.rides);

const makeSelectMaxCount = () =>
  createSelector(selectRides, reducer => reducer.maxCount);

const makeSelectRide = () =>
  createSelector(selectRides, reducer => reducer.selectedRide);

export { makeSelectRides, makeSelectRide, makeSelectMaxCount };
