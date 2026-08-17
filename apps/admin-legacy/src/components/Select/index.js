import React, { useState } from "react";
import "./index.scss";
import {
  KeyboardArrowDownOutlined,
  KeyboardArrowUpOutlined
} from "@material-ui/icons";

const Option = ({ object, onSelect }) => {
  return (
    <div onClick={() => onSelect(object)}>
      <span>{object.title}</span>
    </div>
  );
};

const Select = ({
  values,
  onChange,
  selectedValue,
  leftText,
  rightText,
  position
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const height = document.getElementsByTagName("body")[0].scrollHeight;
  return (
    <>
      <div
        className="shadow-box select-wrapper"
        onClick={() => setIsVisible(!isVisible)}
      >
        <span>{leftText}</span>
        <span className="selected-value">{selectedValue}</span>
        {isVisible ? (
          <KeyboardArrowUpOutlined className="arrow-icon" />
        ) : (
          <KeyboardArrowDownOutlined className="arrow-icon" />
        )}
        <span>{rightText}</span>
        {isVisible && (
          <div className={`shadow-box options-wrapper ${position}`}>
            {values?.length &&
              values?.map(o => (
                <Option key={o.value} object={o} onSelect={onChange} />
              ))}
          </div>
        )}
      </div>
      {isVisible && (
        <div
          className="backdrop"
          style={{ height }}
          onClick={e => {
            e.stopPropagation();
            setIsVisible(false);
          }}
        />
      )}
    </>
  );
};

export default Select;
