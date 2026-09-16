import { createActionsSet } from "./helpers";

export default {
  getTrips: createActionsSet("GET_TRIPS"),
  getTrip: createActionsSet("GET_TRIP")
};
