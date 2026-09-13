import ScrollService from "./scroll";

let modalRef;

function init(ref) {
  modalRef = ref;
}

function show(modalType, params?) {
  ScrollService.toTop();
  if (modalRef) {
    modalRef.onModalChange(modalType, params);
  }
}

function close() {
  ScrollService.toTop();
  if (modalRef) {
    modalRef.onModalChange("");
  }
}

export default {
  init,
  show,
  close
};
