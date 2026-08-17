import { createActionsSet } from "./helpers";

export default {
  addNote: createActionsSet("ADD_NOTE"),
  editNote: createActionsSet("EDIT_NOTE"),
  deleteNote: createActionsSet("DELETE_NOTE")
};
