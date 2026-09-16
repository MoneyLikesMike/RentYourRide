import { handleActions } from "redux-actions";
import actions from "../actions";

type StateProps = {
  licenses: Array<Object> | null,
  maxCount: number
};

export const initialState: StateProps = {
  licenses: null,
  maxCount: 0
};

const getLicenses = {
  [actions.getLicenses.request]: state => ({
    ...state
  }),
  [actions.getLicenses.success]: (state, action) => ({
    licenses: action.payload,
    maxCount: action.payload.meta.itemCount
  }),
  [actions.getLicenses.error]: state => ({
    ...state
  })
};

export default handleActions(
  {
    ...getLicenses
  },
  initialState
);
