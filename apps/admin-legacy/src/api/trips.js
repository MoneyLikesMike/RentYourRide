import { sget, parseResult } from "./helpers";
import { BASE_URL } from "./index";
import queryString from "query-string";

export default {
  getTrips: async data => {
    const trips = queryString.stringify({ ...data.pagination });
    const route = `v1/admin/bookings/phase/${data.phase}`;
    const response = await sget({
      url: `${BASE_URL}${route}?${trips}`
    });
    return parseResult(response);
  },

  getTrip: async data => {
    const route = `v1/admin/bookings/${data.id}`;
    const response = await sget({
      url: `${BASE_URL}${route}`,
      body: data
    });
    return parseResult(response);
  }
};
