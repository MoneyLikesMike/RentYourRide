import { createAction } from "redux-actions";

export const createActionsSet = (type: string) => ({
  request: createAction(type),
  success: createAction(type + "_SUCCESS"),
  error: createAction(type + "_ERROR")
});
