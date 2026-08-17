import React from "react";
import { images } from "../../assets/images";
import "./index.scss";
import NoteContainer from "../../screens/Profile/modals/Note";
import CancelTripContainer from "../../screens/Trips/modals/CancelTrip";
import CheckInCheckOutContainer from "../../screens/CheckScreen";

const { close } = images;

const Screens = {
  cancelTrip: <CancelTripContainer />
};

class Modal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modalType: "",
      params: {}
    };
  }

  onModalChange = (modalType, params?) => {
    this.setState({
      ...this.state,
      modalType: modalType,
      params: params ? params : null
    });
  };

  render() {
    const { modalType, params } = this.state;

    return (
      modalType && (
        <div className="modal-wrapper">
          <div
            className="background-wrapper"
            onClick={() => this.onModalChange("")}
          />
          <div
            className={modalType === "checkInCheckOut" ? "modal big" : "modal"}
          >
            <div className="button-row">
              <button
                className="close-button"
                onClick={() => this.onModalChange("")}
              >
                <img src={close} alt="close" />
              </button>
            </div>
            <div className="modal-content">{Screens[modalType]}</div>
            {modalType === "checkInCheckOut" && (
              <CheckInCheckOutContainer params={params} />
            )}
            {modalType === "note" && <NoteContainer params={params} />}
          </div>
        </div>
      )
    );
  }
}

export default Modal;
