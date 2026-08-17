import { sget, parseResult, sdelete, sput, spatch, spost } from "./helpers";
import { BASE_URL } from "./index";
import queryString from "query-string";

export default {
  getMembers: async data => {
    const members = queryString.stringify({ ...data });
    const route = "v1/admin/users";
    const response = await sget({
      url: `${BASE_URL}${route}?${members}`
    });
    return parseResult(response);
  },

  getUserTrips: async data => {
    const route = `v1/admin/users/${data.id}/bookings/${data.phase}`;
    const response = await sget({
      url: `${BASE_URL}${route}`,
      body: data
    });
    return parseResult(response);
  },

  getListings: async data => {
    const route = `v1/admin/users/${data.id}/rides`;
    const response = await sget({
      url: `${BASE_URL}${route}`,
      body: data
    });
    return parseResult(response);
  },

  getUser: async data => {
    const route = `v1/admin/users/${data.id}`;
    const response = await sget({
      url: `${BASE_URL}${route}`,
      body: data
    });
    return parseResult(response);
  },

  editUser: async data => {
    const { id, body } = data;
    const route = `v1/admin/users/${id}`;
    const response = await spatch({
      url: `${BASE_URL}${route}`,
      body
    });
    return parseResult(response);
  },

  deleteUser: async data => {
    const route = `v1/admin/users/${data.id}`;
    const response = await sdelete({
      url: `${BASE_URL}${route}`
    });
    return parseResult(response);
  },

  deactivateUser: async data => {
    const route = `v1/admin/users/block/${data.id}`;
    const response = await spost({
      url: `${BASE_URL}${route}`
    });
    return parseResult(response);
  },

  activateUser: async data => {
    const route = `v1/admin/users/unblock/${data.id}`;
    const response = await spost({
      url: `${BASE_URL}${route}`
    });
    return parseResult(response);
  },

  verifyEmail: async data => {
    const route = `v1/admin/users/${data.id}/verify-email`;
    const response = await spost({
      url: `${BASE_URL}${route}`
    });
    return parseResult(response);
  }
};
