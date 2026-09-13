import { createActionsSet } from "./helpers";

export default {
  getRides: createActionsSet("GET_RIDES"),
  getRide: createActionsSet("GET_RIDE"),
  rideVerify: createActionsSet("RIDE_VERIFY"),
  rideUnverify: createActionsSet("RIDE_UNVERIFY"),
  rideActivate: createActionsSet("RIDE_ACTIVATE"),
  rideDeactivate: createActionsSet("RIDE_DEACTIVATE")
};
