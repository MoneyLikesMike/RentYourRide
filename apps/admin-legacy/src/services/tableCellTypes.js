import { Link } from "react-router-dom";
import moment from "moment";
import Button from "../components/Button";
import ModalService from "./modals";
import React from "react";

const TableCellTypes = {
  span: title => (
    <span className="header-title">{title ? `$ ${title}` : `-`}</span>
  ),
  spanEmail: title => (
    <span className="header-title">{title ? title : `-`}</span>
  ),
  spanIsVerified: status => (
    <span className="header-title">{status ? "Active" : `Not Active`}</span>
  ),
  linkProfile: (title, id) => (
    <Link
      to={`/members/profile/info/${id}`}
      className="header-title email"
      onClick={() => (window.location.pathname = `/members/profile/info/${id}`)}
    >
      {title === "null null" ? "No name" : title}
    </Link>
  ),
  linkRide: (title, id) => (
    <Link
      to={`/members/profile/car/info/${id}`}
      className={`header-title email`}
    >
      {title}
    </Link>
  ),
  linkLicense: url => (
    <a
      href={url}
      className={url ? `header-title email` : "header-title"}
      target="_blank"
    >
      {url ? "Open Link" : "No License URL"}
    </a>
  ),
  viewVehicleButton: id => (
    <Link
      to={`/members/profile/car/info/${id}`}
      className={`header-title email`}
    >
      <Button
        title="View"
        color="green"
        type="transparent"
        icon="searchGreen"
        iconPosition="left"
        style={{
          fontSize: ".8vw",
          padding: "0",
          width: "3vw",
          margin: "0 3vw 0 0"
        }}
        onClick={() => {}}
      />
    </Link>
  ),
  date: (title, subtitle) => (
    <span className="header-title">
      {title && subtitle ? (
        <>
          <span className="date">{moment(title).format("l")}</span>
          <span className="date">{moment(subtitle).format("LT")}</span>
        </>
      ) : (
        <span className="date">No date</span>
      )}
    </span>
  ),
  viewButton: (id, type) => (
    <Button
      title="View"
      color="green"
      type="transparent"
      icon="searchGreen"
      iconPosition="left"
      style={{
        fontSize: ".8vw",
        padding: "0",
        width: "7vw",
        margin: "0 2.7vw 0 0"
      }}
      onClick={() =>
        ModalService.show("checkInCheckOut", {
          id: id,
          type: type
        })
      }
    />
  ),
  cancelButton: id => (
    <Button
      title="Cancel"
      color="green"
      type="transparent"
      style={{
        fontSize: ".8vw",
        padding: "0",
        width: "7vw",
        margin: "0 3vw 0 0"
      }}
      onClick={() => ModalService.show("cancelTrip", id)}
    />
  )
};

export default TableCellTypes;
