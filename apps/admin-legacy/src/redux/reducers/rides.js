import { handleActions } from "redux-actions";
import actions from "../actions";

type StateProps = {
  rides: Array<Object> | null,
  selectedRide: Object | null,
  maxCount: number
};

export const initialState: StateProps = {
  rides: null,
  selectedRide: null,
  maxCount: 0
};

const getRides = {
  [actions.getRides.request]: state => ({
    ...state
  }),
  [actions.getRides.success]: (state, action) => ({
    rides: action.payload,
    maxCount: action.payload.meta.itemCount
  }),
  [actions.getRides.error]: state => ({
    ...state
  })
};

const getRide = {
  [actions.getRide.request]: state => ({
    ...state
  }),
  [actions.getRide.success]: (state, action) => ({
    ...state,
    selectedRide: action.payload
  }),
  [actions.getRide.error]: state => ({
    ...state
  })
};

export default handleActions(
  {
    ...getRides,
    ...getRide
  },
  initialState
);
