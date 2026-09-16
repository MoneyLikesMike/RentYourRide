import React from "react";
import "./index.scss";
import Tabs from "../../components/Tabs";
import EditProfileInformationContainer from "./tabs/EditProfileInformation";
import EditContactInformationContainer from "./tabs/EditContactInformation";

const EditProfileScreen = ({ match }) => {
  const { type, id } = match.params;
  const tabs = [
    {
      title: "Profile Information",
      screen: EditProfileInformationContainer
    },
    {
      title: "Contact Information",
      screen: EditContactInformationContainer
    }
  ];

  return (
    <div className="edit-profile-wrapper">
      <span className="edit-profile-header">Edit Information</span>
      <Tabs tabs={tabs} params={id} selected={type} />
    </div>
  );
};

export default EditProfileScreen;
