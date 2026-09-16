import { handleActions } from "redux-actions";
import actions from "../actions";
import { isLoggedIn, getUser } from "../../services/auth";

type StateProps = {
  accessToken: string | null,
  refreshToken: string | null,
  isLoggedIn: boolean,
  errorStatus: string | null
};

const initialState: StateProps = {
  accessToken: null,
  refreshToken: null,
  isLoggedIn: isLoggedIn(),
  user: getUser(),
  errorStatus: ""
};

const auth = {
  [actions.signIn.request]: state => ({
    ...state
  }),

  [actions.signIn.success]: (state, action) => {
    return {
      accessToken: action.payload.token.accessToken,
      refreshToken: action.payload.token.refreshToken,
      user: action.payload.user,
      isLoggedIn: true
    };
  },
  [actions.signIn.error]: (state, error) => ({
    ...state,
    errorStatus: error.payload.status + ""
  })
};

const logout = {
  [actions.logout.request]: state => ({
    ...state
  }),
  [actions.logout.success]: state => {
    return {
      ...state,
      isLoggedIn: false
    };
  },
  [actions.logout.error]: state => ({
    ...state
  })
};

const refreshToken = {
  [actions.refreshToken.request]: state => ({
    ...state
  }),

  [actions.refreshToken.success]: (state, action) => {
    return {
      accessToken: action.payload.accessToken,
      refreshToken: action.payload.refreshToken,
      isLoggedIn: true
    };
  },
  [actions.refreshToken.error]: (state, error) => ({
    ...state,
    errorStatus: error.payload.status + ""
  })
};

export default handleActions(
  {
    ...auth,
    ...logout,
    ...refreshToken
  },
  initialState
);
