import { handleActions } from "redux-actions";
import actions from "../actions";

type StateProps = {
  members: Array<Object> | null,
  userTrips: Array<Object> | null,
  listings: Array<Object> | null,
  selectedUser: Object | null,
  maxCount: number
};

export const initialState: StateProps = {
  members: null,
  userTrips: null,
  listings: null,
  selectedUser: {},
  maxCount: 0
};

const getMembers = {
  [actions.getMembers.request]: state => ({
    ...state
  }),
  [actions.getMembers.success]: (state, action) => ({
    ...state,
    members: action.payload,
    maxCount: action.payload.meta.itemCount
  }),
  [actions.getMembers.error]: state => ({
    ...state
  })
};

const getUser = {
  [actions.getUser.request]: state => ({
    ...state
  }),
  [actions.getUser.success]: (state, action) => ({
    ...state,
    selectedUser: action.payload
  }),
  [actions.getUser.error]: state => ({
    ...state
  })
};

const getUserTrips = {
  [actions.getUserTrips.request]: state => ({
    ...state
  }),
  [actions.getUserTrips.success]: (state, action) => ({
    ...state,
    userTrips: action.payload
  }),
  [actions.getUserTrips.error]: state => ({
    ...state
  })
};

const getListings = {
  [actions.getListings.request]: state => ({
    ...state
  }),
  [actions.getListings.success]: (state, action) => ({
    ...state,
    listings: action.payload
  }),
  [actions.getListings.error]: state => ({
    ...state
  })
};

export default handleActions(
  {
    ...getMembers,
    ...getUserTrips,
    ...getListings,
    ...getUser
  },
  initialState
);
