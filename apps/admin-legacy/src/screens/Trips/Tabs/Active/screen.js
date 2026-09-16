import React, { useEffect, useState } from "react";
import "./index.scss";
import Table from "../../../../components/Table";
import TableCellTypes from "../../../../services/tableCellTypes";

const ActiveScreen = ({ maxCount, trips, getTrips }) => {
  const [activeState, setState] = useState({
    sort: {
      order: "ASC",
      page: 1,
      take: 10,
      query: ""
    }
  });
  const parsedData = trips?.data.map(t => {
    return (
      <div className="table-row" key={t.id}>
        {TableCellTypes.viewButton(t.id, "checkIn")}
        {TableCellTypes.linkProfile(t.hostFullName, t.hostId)}
        {TableCellTypes.linkProfile(t.guestFullName, t.guestId)}
        {TableCellTypes.linkRide(t.vehicleInfo, t.vehicleId)}
        {TableCellTypes.date(t.requestTime, t.requestTime)}
        {/*{TableCellTypes.date(t.requestApproved, t.requestApproved)}*/}
        {TableCellTypes.date(t.requestStart, t.requestStart)}
        {TableCellTypes.date(t.requestEnd, t.requestEnd)}
        {/*{TableCellTypes.span(t.subtotal / 100)}
        {TableCellTypes.span(t.tripFee / 100)}
        {TableCellTypes.span(t.deliveryFee / 100)}
        {TableCellTypes.span(t.cleaningPrice / 100)}
        {TableCellTypes.span(t.unlimitedMilage / 100)}
        {TableCellTypes.span(t.hostEarnings / 100)}*/}
      </div>
    );
  });

  useEffect(() => {
    getTrips({
      pagination: {
        order: "DESC",
        page: 1,
        take: 10,
        query: "",
        field: "requestTime"
      },
      phase: "active"
    });
  }, []);

  useEffect(() => {
    if (trips?.meta && Object.keys(trips.meta).length) {
      setState({
        sort: {
          ...activeState.sort,
          page: trips.meta.take === activeState.sort.take ? trips.meta.page : 1,
          take: trips.meta.take
        }
      });
    }
  }, [trips]);

  return (
    <>
      {trips && (
        <Table
          parsedData={parsedData}
          maxCount={maxCount}
          getValues={getTrips}
          state={activeState}
          setState={setState}
          tab="active"
          phase
          pager
          searching={true}
          filters={[
            "rentalAgreement",
            "subtotal",
            "tripFee",
            "deliveryFee",
            "hostEarnings",
            "vehicle",
            "cleaningPrice",
            "unlimitedMilage",
            "requestApproved"
          ]}
        />
      )}
    </>
  );
};

export default ActiveScreen;
