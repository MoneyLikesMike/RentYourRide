import { spost, sdelete, spatch, parseResult } from "./helpers";
import { BASE_URL } from "./index";

export default {
  addNote: async data => {
    const route = `v1/admin/users/${data.id}/notes`;
    const response = await spost({
      url: `${BASE_URL}${route}`,
      body: {
        text: data.text
      }
    });
    return parseResult(response);
  },

  deleteNote: async data => {
    const route = `v1/admin/users/${data.id}/notes/${data.noteId}`;
    const response = await sdelete({
      url: `${BASE_URL}${route}`
    });
    return parseResult(response);
  },

  editNote: async data => {
    const route = `v1/admin/users/${data.id}/notes/${data.noteId}`;
    const response = await spatch({
      url: `${BASE_URL}${route}`,
      body: {
        text: data.text
      }
    });
    return parseResult(response);
  }
};
