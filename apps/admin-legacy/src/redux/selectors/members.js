import { createSelector } from "reselect";

const selectMembers = (state: Object) => state.members;

const makeSelectMembers = () =>
  createSelector(selectMembers, reducer => reducer.members);

const makeSelectMaxCount = () =>
  createSelector(selectMembers, reducer => reducer.maxCount);

const makeSelectUser = () =>
  createSelector(selectMembers, reducer => ({
    ...reducer.selectedUser
  }));

const makeSelectUserTrips = () =>
  createSelector(selectMembers, reducer => reducer.userTrips);

const makeSelectListings = () =>
  createSelector(selectMembers, reducer => reducer.listings);

export {
  makeSelectMembers,
  makeSelectUser,
  makeSelectMaxCount,
  makeSelectUserTrips,
  makeSelectListings
};
