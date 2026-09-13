import React, { useEffect, useState } from "react";
import "./index.scss";
import TableCellTypes from "../../../../services/tableCellTypes";
import Table from "../../../../components/Table";

const LicenseScreen = ({ maxCount, licenses, getLicenses }) => {
  const [licencesState, setState] = useState({
    sort: {
      order: "ASC",
      page: 1,
      take: 10,
      query: ""
    }
  });
  const parsedData = licenses?.data?.map(t => {
    return (
      <div className="table-row" key={t.id}>
        {TableCellTypes.linkProfile(t.fullName, t.id)}
        {TableCellTypes.linkLicense(t.matiDashboardUrl)}
        {TableCellTypes.date(t.uploadDate, t.uploadDate)}
      </div>
    );
  });

  useEffect(() => {
    getLicenses({ order: "ASC", page: 1, take: 10, query: "" });
  }, []);

  useEffect(() => {
    if (licenses?.meta && Object.keys(licenses.meta).length) {
      setState({
        sort: {
          ...licencesState.sort,
          page:
            licenses.meta.take === licencesState.sort.take
              ? licenses.meta.page
              : 1,
          take: licenses.meta.take
        }
      });
    }
  }, [licenses]);

  return (
    <>
      {licenses && (
        <Table
          parsedData={parsedData}
          maxCount={maxCount}
          getValues={getLicenses}
          state={licencesState}
          setState={setState}
          tab="licenses"
          pager
          searching={true}
          filters={["license", "uploadDate"]}
        />
      )}
    </>
  );
};

export default LicenseScreen;
