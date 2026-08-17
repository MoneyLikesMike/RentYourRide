import React from "react";
import "./index.scss";
import Button from "../../../../components/Button";
import ModalService from "../../../../services/modals";

const CancelTripScreen = ({}) => {
  const onCancel = () => {
    ModalService.close();
  };

  return (
    <div className="cancel-trip-wrapper">
      <span className="caption">Do you want to cancel this trip?</span>
      <div className="buttons-row">
        <Button
          title="No"
          color="green"
          type="outline"
          style={{
            fontSize: ".8vw",
            padding: "0",
            width: "8vw",
            height: "2vw",
            textTransform: "uppercase"
          }}
          onClick={() => ModalService.close()}
        />
        <Button
          title="Cancel Trip"
          color="green"
          type="filled"
          style={{
            fontSize: ".8vw",
            padding: "0",
            width: "8vw",
            height: "2vw",
            textTransform: "uppercase"
          }}
          onClick={onCancel}
        />
      </div>
    </div>
  );
};

export default CancelTripScreen;
