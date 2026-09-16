let loaderRef;

function init(ref) {
  loaderRef = ref;
}

function show() {
  if (loaderRef) {
    loaderRef.onLoadChange(true);
  }
}

function hide() {
  if (loaderRef) {
    loaderRef.onLoadChange(false);
  }
}

export default {
  init,
  show,
  hide
};
