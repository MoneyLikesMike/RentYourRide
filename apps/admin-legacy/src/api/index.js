import auth from "./auth";
import members from "./members";
import trips from "./trips";
import rides from "./rides";
import licenses from "./licenses";
import notes from "./notes";

export const BASE_URL = process.env.REACT_APP_API_ENDPOINT;

export default {
  ...auth,
  ...members,
  ...trips,
  ...rides,
  ...licenses,
  ...notes
};
