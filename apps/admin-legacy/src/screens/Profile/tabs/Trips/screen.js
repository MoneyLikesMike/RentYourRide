import React, { useEffect, useState } from "react";
import ScrollService from "../../../../services/scroll";
import "./index.scss";
import Button from "../../../../components/Button";
import Table from "../../../../components/Table";
import TableCellTypes from "../../../../services/tableCellTypes";

const filterButtons = [
  {
    title: "requests"
  },
  {
    title: "active"
  },
  {
    title: "history"
  }
];

const TripsScreen = ({ userTrips, getUserTrips, params }) => {
  useEffect(() => {
    getUserTrips({ id: params, phase: "requests" });
  }, []);
  const [filterValue, setFilterValue] = useState("requests");

  const onFilterClick = filter => {
    ScrollService.toTop();
    setFilterValue(filter);
    getUserTrips({ id: params, phase: filter });
  };
  const parsedData = userTrips?.map(t => {
    return (
      <div className="table-row" key={t.id}>
        {TableCellTypes.linkProfile(t.hostFullName, t.hostId)}
        {TableCellTypes.linkProfile(t.guestFullName, t.guestId)}
        {TableCellTypes.linkRide(t.vehicleInfo, t.vehicleId)}
        {TableCellTypes.date(t.requestedDate, t.requestedDate)}
        {TableCellTypes.date(t.submissionDate, t.submissionDate)}
      </div>
    );
  });

  return (
    <div className="trips-wrapper">
      <div className="buttons-row">
        {filterButtons.map(b => (
          <Button
            key={b.title}
            title={b.title}
            type={"filled"}
            style={{
              textTransform: "capitalize",
              width: "8vw",
              height: "3.5vw",
              fontSize: "0.9vw",
              color: filterValue === b.title ? "#4cb6b1" : "#17252a",
              border: "none",
              boxShadow: "0 0 2vw 0 rgba(0, 0, 0, 0.06)",
              marginRight: "1vw"
            }}
            onClick={() => onFilterClick(b.title)}
          />
        ))}
      </div>
      <div className="content-wrapper profile">
        {userTrips && (
          <Table
            parsedData={parsedData}
            tab="profileTrips"
            // searching={true}
            // filters={["license", "uploadDate"]}
            filters={[]}
          />
        )}
      </div>
    </div>
  );
};

export default TripsScreen;
