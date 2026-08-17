const isLoggedIn = () => {
  return !!localStorage.getItem("user");
};

const getUser = () => {
  const user = localStorage.getItem("user");
  return user && typeof user === Object ? JSON.parse(user) : null;
};

export { isLoggedIn, getUser };
