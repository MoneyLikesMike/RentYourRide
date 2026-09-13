import actions from "../redux/actions";
import { store } from "../index";

const isUnauthorized = response => {
  const { status, statusCode } = response;
  const refreshToken = localStorage.getItem("refreshToken");
  if (status === 401 || statusCode === 401) {
    store.dispatch(actions.refreshToken.request({ refreshToken }));
  }
};

export const parseResult = async (response: Object) => {
  let result;
  try {
    result = await response.json();
    isUnauthorized(result);
  } catch (e) {
    isUnauthorized(response);
    const error = {};
    error.message = "error.API.parseResult";
    throw error;
  }

  if (!response.ok) {
    const error = {};
    error.status = response.status;
    error.message = result.message;
    throw error;
  }

  return result;
};

export const sfetch = async ({
  method,
  url,
  body
}: {
  method: "GET" | "POST",
  url: string,
  body: ?Object
}) => {
  const headers: { [key: string]: string } = {
    Accept: "application/json",
    "Content-Type": "application/json; charset=utf-8"
  };
  const accessToken = localStorage.getItem("accessToken");
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const request: { [key: string]: any } = {
    method,
    headers
  };
  if (body) {
    request.body = JSON.stringify(body);
  }

  return fetch(url, request);
};

export const sget = ({ url }: { url: string }) =>
  sfetch({ method: "GET", url, body: null });
export const spost = ({ url, body }: { url: string, body: Object }) =>
  sfetch({ method: "POST", url, body });
export const sput = ({ url, body }: { url: string, body: Object }) =>
  sfetch({ method: "PUT", url, body });
export const sdelete = ({ url, body }: { url: string, body: Object }) =>
  sfetch({ method: "DELETE", url, body });
export const spatch = ({ url, body }: { url: string, body: Object }) =>
  sfetch({ method: "PATCH", url, body });
