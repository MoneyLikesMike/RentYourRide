import React, { useEffect, useState } from "react";
import "./index.scss";
import Table from "../../../../components/Table";
import TableCellTypesService from "../../../../services/tableCellTypes";
import TableCellTypes from "../../../../services/tableCellTypes";

const RequestsScreen = ({ maxCount, trips, getTrips }) => {
  const [requestsState, setState] = useState({
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
        {TableCellTypes.viewButton(t.id, "rentalAgreement")}
        {TableCellTypesService.linkProfile(t.hostFullName, t.hostId)}
        {TableCellTypesService.linkProfile(t.guestFullName, t.guestId)}
        {TableCellTypesService.linkRide(t.vehicleInfo, t.vehicleId)}
        {TableCellTypesService.date(t.requestTime, t.requestTime)}
        {TableCellTypesService.date(t.requestStart, t.requestStart)}
        {TableCellTypesService.date(t.requestEnd, t.requestEnd)}
        {/*{TableCellTypesService.span(t.subtotal / 100)}
          {TableCellTypesService.span(t.tripFee / 100)}
          {TableCellTypesService.span(t.deliveryFee / 100)}
          {TableCellTypesService.span(t.hostEarnings / 100)}*/}
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
      phase: "requests"
    });
  }, []);

  useEffect(() => {
    if (trips?.meta && Object.keys(trips.meta).length) {
      setState({
        sort: {
          ...requestsState.sort,
          page:
            trips.meta.take === requestsState.sort.take ? trips.meta.page : 1,
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
          state={requestsState}
          setState={setState}
          tab="requests"
          phase
          pager
          searching={true}
          filters={[
            "rentalAgreement",
            "subtotal",
            "tripFee",
            "deliveryFee",
            "hostEarnings",
            "vehicle"
          ]}
        />
      )}
    </>
  );
};

export default RequestsScreen;
