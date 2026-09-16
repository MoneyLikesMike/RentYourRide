import { handleActions } from "redux-actions";
import actions from "../actions";

type StateProps = {
  trips: Array<Object> | null,
  selectedTrip: Object | null,
  maxCount: number
};

export const initialState: StateProps = {
  trips: null,
  selectedTrip: null,
  maxCount: 0
};

const getTrips = {
  [actions.getTrips.request]: state => ({
    ...state
  }),
  [actions.getTrips.success]: (state, action) => ({
    trips: action.payload,
    maxCount: action.payload.meta.itemCount
  }),
  [actions.getTrips.error]: state => ({
    ...state
  })
};

const getTrip = {
  [actions.getTrip.request]: state => ({
    ...state
  }),
  [actions.getTrip.success]: (state, action) => ({
    ...state,
    selectedTrip: action.payload
  }),
  [actions.getTrip.error]: state => ({
    ...state
  })
};

export default handleActions(
  {
    ...getTrips,
    ...getTrip
  },
  initialState
);
