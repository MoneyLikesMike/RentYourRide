import React from "react";
import "./index.scss";
import Tabs from "../../components/Tabs";
import LicenseContainer from "./Tabs/License";
import RidesContainer from "./Tabs/Rides";

const ValidationScreen = () => {
  const tabs = [
    {
      title: "License",
      screen: LicenseContainer
    },
    {
      title: "Rides",
      screen: RidesContainer
    }
  ];

  return (
    <div className="content-wrapper validation">
      <h1 className="caption">Validation</h1>
      <Tabs tabs={tabs} />
    </div>
  );
};

export default ValidationScreen;
