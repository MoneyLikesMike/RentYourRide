import React, { useEffect, useState } from "react";
import "./index.scss";
import { withRouter } from "react-router-dom";
import Table from "../../components/Table";
import TableCellTypes from "../../services/tableCellTypes";

const MembersScreen = ({ maxCount, getMembers, members }) => {
  const [membersState, setState] = useState({
    sort: {
      order: "DESC",
      page: 1,
      take: 10,
      query: "",
      field: "createdAt"
    }
  });

  const parsedData = members?.data?.map(t => {
    return (
      <div className="table-row" key={t.id}>
        {TableCellTypes.linkProfile(t.fullName, t.id)}
        {TableCellTypes.spanEmail(t.email)}
        {TableCellTypes.date(t.signUpDate, t.signUpDate)}
        {TableCellTypes.spanIsVerified(t.isActive)}
      </div>
    );
  });

  useEffect(() => {
    getMembers({
      order: "DESC",
      page: 1,
      take: 10,
      query: "",
      field: "createdAt"
    });
  }, []);

  useEffect(() => {
    if (members?.meta && Object.keys(members.meta).length) {
      setState({
        sort: {
          ...membersState.sort,
          page:
            members.meta.take === membersState.sort.take
              ? members.meta.page
              : 1,
          take: members.meta.take
        }
      });
    }
  }, [members]);

  return (
    <div className="content-wrapper members">
      <h1 className="caption">Members</h1>
      {members && (
        <Table
          searching={true}
          parsedData={parsedData}
          maxCount={maxCount}
          getValues={getMembers}
          state={membersState}
          setState={setState}
          tab="members"
          pager
          filters={["status"]}
        />
      )}
    </div>
  );
};

export default withRouter(MembersScreen);
