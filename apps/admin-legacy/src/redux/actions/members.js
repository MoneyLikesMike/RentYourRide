import { createActionsSet } from "./helpers";

export default {
  getMembers: createActionsSet("GET_MEMBERS"),
  getUserTrips: createActionsSet("GET_USER_TRIPS"),
  getListings: createActionsSet("GET_USER_LISTINGS"),
  getUser: createActionsSet("GET_USER"),
  editUser: createActionsSet("EDIT_USER"),
  deleteUser: createActionsSet("DELETE_USER"),
  deactivateUser: createActionsSet("DEACTIVATE_USER"),
  activateUser: createActionsSet("ACTIVATE_USER"),
  verifyEmail: createActionsSet("VERIFY_EMAIL")
};
