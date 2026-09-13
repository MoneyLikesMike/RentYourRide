let timer = null;

export default (callback: Function, timeout = 500) => {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(() => {
    callback();
  }, timeout);
};
