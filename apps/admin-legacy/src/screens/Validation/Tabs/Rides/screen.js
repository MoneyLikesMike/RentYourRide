import React, { useEffect, useState } from "react";
import "./index.scss";
import TableCellTypes from "../../../../services/tableCellTypes";
import Table from "../../../../components/Table";

const RidesScreen = ({ maxCount, rides, getRides }) => {
  const [ridesState, setState] = useState({
    sort: {
      order: "ASC",
      page: 1,
      take: 10,
      field: "userFullName",
      query: "",
      isActivated: true
    }
  });

  const parsedData = rides?.data?.map(t => {
    return (
      <div className="table-row" key={t.id}>
        {TableCellTypes.viewVehicleButton(t.id)}
        {TableCellTypes.linkProfile(t.userFullName, t.userId)}
        {TableCellTypes.linkRide(t.vehicleInfo, t.id)}
        {TableCellTypes.spanIsVerified(t.isActivated)}
        {TableCellTypes.date(t.uploadedTime, t.uploadedTime)}
      </div>
    );
  });

  useEffect(() => {
    getRides({
      order: "DESC",
      page: 1,
      take: 10,
      query: "",
      field: "uploadedTime",
      isActivated: true
    });
  }, []);

  useEffect(() => {
    if (rides?.meta && Object.keys(rides.meta).length) {
      setState({
        sort: {
          ...ridesState.sort,
          page: rides.meta.take === ridesState.sort.take ? rides.meta.page : 1,
          take: rides.meta.take
        }
      });
    }
  }, [rides]);

  return (
    <>
      {rides && (
        <Table
          parsedData={parsedData}
          maxCount={maxCount}
          getValues={getRides}
          state={ridesState}
          setState={setState}
          tab="rides"
          pager
          searching={true}
          filters={["overview", "vehicle", "status"]}
          status
        />
      )}
    </>
  );
};

export default RidesScreen;
