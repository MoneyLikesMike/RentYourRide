import React from "react";
import "./index.scss";
import Tabs from "../../components/Tabs";
import RequestsContainer from "./Tabs/Requests";
import ActiveContainer from "./Tabs/Active";
import CompletedContainer from "./Tabs/Completed";
import CanceledContainer from "./Tabs/Canceled";

const TripsScreen = () => {
  const tabs = [
    {
      title: "Requests",
      screen: RequestsContainer
    },
    {
      title: "Active",
      screen: ActiveContainer
    },
    {
      title: "Completed",
      screen: CompletedContainer
    },
    {
      title: "Canceled",
      screen: CanceledContainer
    }
  ];

  return (
    <div className="content-wrapper">
      <h1 className="caption">Trips</h1>
      <Tabs tabs={tabs} />
    </div>
  );
};

export default TripsScreen;
