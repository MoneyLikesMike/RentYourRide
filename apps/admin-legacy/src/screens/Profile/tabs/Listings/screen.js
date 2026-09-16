import React, { useEffect } from "react";
import "./index.scss";
import Table from "../../../../components/Table";
import TableCellTypes from "../../../../services/tableCellTypes";

const ListingsScreen = ({ listings, getListings, params }) => {
  const id = params;

  useEffect(() => {
    getListings({ id: id });
  }, []);

  const parsedData = listings?.map(t => {
    return (
      <div className="table-row" key={t.id}>
        {TableCellTypes.viewVehicleButton(t.id)}
        {TableCellTypes.linkRide(t.vehicleInfo, t.id)}
        {TableCellTypes.date(t.uploadedTime, t.uploadedTime)}
        {TableCellTypes.spanIsVerified(t.isVerified)}
      </div>
    );
  });

  return (
    <div className="content-wrapper profile">
      {listings && (
        <Table
          parsedData={parsedData}
          tab="profileListings" // searching={true}
          // filters={["license", "uploadDate"]}
          filters={[]}
        />
      )}
    </div>
  );
};

export default ListingsScreen;
