import React, { useEffect, useState } from "react";
import { withRouter } from "react-router";
import "./index.scss";
import Tabs from "../../components/Tabs";
import Button from "../../components/Button";
import InformationContainer from "./tabs/Information";
import TripsContainer from "./tabs/Trips";
import ListingsContainer from "./tabs/Listings";
import { Widget, addResponseMessage } from "react-chat-widget";
import "react-chat-widget/lib/styles.css";
import AlertsService from "../../services/alerts";
import { images } from "../../assets/images";
const { avatar } = images;

addResponseMessage("asdasdasdasd");

const messages = {
  title: "User Name",
  messagesArr: {
    text: "sadasdasdasd"
  }
};
const tabs = [
  {
    title: "Information",
    screen: InformationContainer
  },
  {
    title: "Trips",
    screen: TripsContainer
  },
  {
    title: "Listings",
    screen: ListingsContainer
  }
];

const ProfileScreen = ({
  selectedUser,
  match,
  getUser,
  deleteUser,
  deactivateUser,
  activateUser,
  history
}) => {
  const id = match.params.id;

  useEffect(() => {
    getUser({ id: id });
  }, []);

  const changeUserStatus = () => {
    const onChangeStatus = () => {
      selectedUser?.isBanned
        ? activateUser({ id })
        : deactivateUser({ id });
    };
    AlertsService.confirm({
      text: `You want to ${
        selectedUser?.isBanned ? "activate" : "deactivate"
      } user?`,
      confirmButtonText: selectedUser?.isBanned ? "Activate" : "Deactivate",
      func: onChangeStatus
    });
  };

  const onDeleteUser = () => {
    if (!selectedUser?.isBanned) {
      AlertsService.confirm({
        text: "Deactivate the user before deleting. Active users cannot be deleted.",
        confirmButtonText: "OK",
        func: () => {}
      });
      return;
    }
    const onDelete = () => {
      // Pass UUID string as-is — Nest uses ParseUUIDPipe (unary + turns UUIDs into NaN).
      deleteUser({ id });
      history.push("/members");
    };
    AlertsService.confirm({
      text: "You want to delete user?",
      confirmButtonText: "Delete",
      func: onDelete
    });
  };

  const handleNewUserMessage = newMessage => {
    // Now send the message throught the backend API
  };

  return (
    <div className="profile-wrapper">
      <div className="profile-header">
        <div className="name-navigation-route">
          <span className="full-name">
            {selectedUser?.fullName
              ? selectedUser?.fullName
              : selectedUser?.firstName && selectedUser?.lastName
              ? `${selectedUser?.firstName} ${selectedUser?.lastName}`
              : "No Name"}
          </span>
          <span className="navigation-route">
            {selectedUser?.fullName
              ? "Members / " + selectedUser?.fullName
              : selectedUser?.firstName && selectedUser?.lastName
              ? "Members / " +
                `${selectedUser?.firstName} ${selectedUser?.lastName}`
              : "Members / No Name"}
          </span>
        </div>
        <div className="functional">
          {/*  <div className="private-message">
            <span className="message-text">Private message</span>
            <Widget
              handleNewUserMessage={handleNewUserMessage}
              titleAvatar={avatar}
              title={messages.title}
              subtitle={false}
              profileAvatar={avatar}
              showTimeStamp={true}
            />
          </div>
          <div className="border" />
          <a href="https://rentyourride.ca/" className="href" target="_blank">
            <Button
              title="Sign In as user"
              type="transparent"
              color="green"
              style={{
                width: "100%",
                fontSize: ".9vw",
                padding: "0"
              }}
              onClick={() => {}}
            />
          </a>*/}
          <Button
            title={selectedUser?.isBanned ? "Activate User" : "Deactivate User"}
            type="outline"
            color="green"
            style={{
              width: "30%",
              fontSize: ".9vw",
              textTransform: "uppercase",
              marginRight: "1vw"
            }}
            onClick={changeUserStatus}
          />
          <Button
            title="Delete User"
            type="filled"
            color="green"
            icon="delete"
            iconPosition="left"
            style={{
              width: "30%",
              fontSize: ".9vw",
              textTransform: "uppercase"
            }}
            onClick={onDeleteUser}
          />
        </div>
      </div>
      <Tabs tabs={tabs} params={id} routeChange />
    </div>
  );
};

export default withRouter(ProfileScreen);
