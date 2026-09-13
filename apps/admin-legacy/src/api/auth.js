import { spost, parseResult } from "./helpers";
import { BASE_URL } from "./index";

export default {
  signIn: async data => {
    const route = "v1/auth/admin/login";
    const response = await spost({
      url: `${BASE_URL}${route}`,
      body: data
    });
    return parseResult(response);
  },
  refreshToken: async body => {
    const route = "v1/auth/refresh";
    const response = await spost({
      url: `${BASE_URL}${route}`,
      body
    });
    return parseResult(response);
  }
};
