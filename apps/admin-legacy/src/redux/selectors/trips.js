import { createSelector } from "reselect";

const selectTrips = (state: Object) => state.trips;

const makeSelectTrips = () =>
  createSelector(selectTrips, reducer => reducer.trips);

const makeSelectMaxCount = () =>
  createSelector(selectTrips, reducer => reducer.maxCount);

const makeSelectTrip = () =>
  createSelector(selectTrips, reducer => reducer.selectedTrip);

export { makeSelectTrips, makeSelectTrip, makeSelectMaxCount };
