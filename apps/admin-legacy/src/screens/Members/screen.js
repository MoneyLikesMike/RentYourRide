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
        <span className="header-title">
          {t.email || "-"}
          {t.emailDomainTypo ? (
            <span
              className="ryr-email-typo"
              title={`Possible email typo. Did you mean ${t.emailDomainTypo.suggestedEmail}?`}
              style={{
                marginLeft: 6,
                padding: "1px 6px",
                borderRadius: 10,
                background: "#fff4e5",
                color: "#b26a00",
                border: "1px solid #ffb74d",
                fontSize: 11,
                whiteSpace: "nowrap"
              }}
            >
              {`\u26a0 \u2192 ${t.emailDomainTypo.suggestion}`}
            </span>
          ) : null}
        </span>
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
      <label
        className="ryr-email-typo-filter"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          margin: "0 0 12px",
          cursor: "pointer",
          fontSize: 14
        }}
      >
        <input
          type="checkbox"
          checked={!!membersState.sort.emailTypo}
          onChange={ev => {
            // Stored in sort state because Table spreads state.sort into every getValues call.
            const sort = {
              ...membersState.sort,
              page: 1,
              emailTypo: ev.target.checked ? true : undefined
            };
            setState({ sort });
            getMembers(sort);
          }}
        />
        Email typos only
      </label>
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
