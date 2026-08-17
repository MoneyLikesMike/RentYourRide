import React from "react";

import "./index.scss";

import CallIcon from "@material-ui/icons/Call";
import ArrowBackIosIcon from "@material-ui/icons/ArrowBackIos";
import ArrowForwardIosIcon from "@material-ui/icons/ArrowForwardIos";
import EditIcon from "@material-ui/icons/Edit";
import LocationOnIcon from "@material-ui/icons/LocationOn";
import CloseIcon from "@material-ui/icons/Close";
import PersonAddIcon from "@material-ui/icons/PersonAdd";
import SaveIcon from "@material-ui/icons/Save";
import AddIcon from "@material-ui/icons/Add";
import DoneIcon from "@material-ui/icons/Done";
import MarkunreadMailboxIcon from "@material-ui/icons/MarkunreadMailbox";

import { images } from "../../assets/images";
const {
  play,
  returnArrow,
  message,
  arrow,
  change,
  search,
  disabled,
  searchGreen
} = images;

const Icons = {
  forwardArrow: (
    <ArrowForwardIosIcon className="btn-icon forward" alt="forward" />
  ),
  play: <img src={play} className="btn-icon play" alt="play" />,
  searchGreen: (
    <img src={searchGreen} className="btn-icon searchGreen" alt="searchGreen" />
  ),
  personAdd: <PersonAddIcon className="btn-icon add" alt="add" />,
  save: <SaveIcon className="btn-icon save" alt="save" />,
  done: <DoneIcon className="btn-icon done" alt="done" />,
  add: <AddIcon className="btn-icon add" alt="add" />,
  return: <img src={returnArrow} className="btn-icon" alt="add" />,
  message: <img src={message} className="btn-icon" alt="delete" />,
  arrow: <img src={arrow} className="btn-icon arrow" alt="delete" />,
  delete: <CloseIcon className="btn-icon cross" alt="delete" />,
  change: <img src={change} className="btn-icon arrow" alt="change" />,
  call: <CallIcon className="btn-icon call" alt="call" />,
  edit: <EditIcon className="btn-icon edit" alt="edit" />,
  back: <ArrowBackIosIcon className="btn-icon back" alt="back" />,
  resendEmail: (
    <MarkunreadMailboxIcon className="btn-icon resendEmail" alt="resendEmail" />
  ),
  search: <img src={search} className="btn-icon search" alt="delete" />,
  disabled: <img src={disabled} className="btn-icon disabled" alt="disabled" />,
  location: <LocationOnIcon className="btn-icon location" alt="location" />
};

const Button = ({
  title,
  onClick,
  type,
  color,
  icon,
  iconPosition,
  style,
  disabled
}) => {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`button ${type} ${!disabled ? color : "grey"}`}
      style={style}
    >
      {iconPosition === "left" && icon && Icons[icon]}
      {title}
      {iconPosition === "right" && icon && Icons[icon]}
    </button>
  );
};

export default Button;
