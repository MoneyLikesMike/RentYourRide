import { sget, parseResult } from "./helpers";
import { BASE_URL } from "./index";
import queryString from "query-string";

export default {
  getLicenses: async data => {
    const licenses = queryString.stringify({ ...data });
    const route = `v1/admin/users/licenses`;
    const response = await sget({
      url: `${BASE_URL}${route}?${licenses}`
    });
    return parseResult(response);
  }
};
