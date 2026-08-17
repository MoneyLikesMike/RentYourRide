import React from "react";
import { CheckOutlined } from "@material-ui/icons";
import "./index.scss";

const Checkbox = ({ isSelected, onToggle, containerStyles }) => {
  return (
    <div
      className={isSelected ? "selected" : "unselected"}
      onClick={onToggle}
      style={containerStyles}
    >
      {isSelected && <CheckOutlined className="checkbox-icon" />}
    </div>
  );
};

export default Checkbox;
