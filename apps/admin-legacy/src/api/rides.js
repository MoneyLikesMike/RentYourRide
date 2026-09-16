import { sget, parseResult, spatch } from "./helpers";
import { BASE_URL } from "./index";
import queryString from "query-string";

export default {
  getRides: async data => {
    const rides = queryString.stringify({ ...data });
    const route = "v1/admin/rides";
    const response = await sget({
      url: `${BASE_URL}${route}?${rides}`
    });
    return parseResult(response);
  },

  getRide: async data => {
    const route = `v1/admin/rides/${data.id}`;
    const response = await sget({
      url: `${BASE_URL}${route}`,
      body: data
    });
    return parseResult(response);
  },

  rideVerify: async data => {
    const route = `v1/admin/rides/${data.id}/verify`;
    const response = await spatch({
      url: `${BASE_URL}${route}`
    });
    return parseResult(response);
  },

  rideUnverify: async data => {
    const route = `v1/admin/rides/${data.id}/unverify`;
    const response = await spatch({
      url: `${BASE_URL}${route}`
    });
    return parseResult(response);
  },

  rideActivate: async data => {
    const route = `v1/admin/rides/${data.id}/activate`;
    const response = await spatch({
      url: `${BASE_URL}${route}`
    });
    return parseResult(response);
  },

  rideDeactivate: async data => {
    const route = `v1/admin/rides/${data.id}/deactivate`;
    const response = await spatch({
      url: `${BASE_URL}${route}`
    });
    return parseResult(response);
  }
};
