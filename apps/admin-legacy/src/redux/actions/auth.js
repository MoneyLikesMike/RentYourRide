import { createActionsSet } from "./helpers";

export default {
  signIn: createActionsSet("SIGN_IN"),
  logout: createActionsSet("LOGOUT"),
  refreshToken: createActionsSet('REFRESH_TOKEN')
};
