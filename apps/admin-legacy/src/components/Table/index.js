import React, { useEffect, useState } from "react";
import "./index.scss";
import Select from "../Select";
import Pager from "../Pager";
import ScrollService from "../../services/scroll";
import { images } from "../../assets/images";
import DebouncedSearch from "../../helpers/debouncedSearch";

const { search } = images;

const HeaderValues = {
  members: [
    {
      value: "fullName",
      title: "Name"
    },
    {
      value: "email",
      title: "Email"
    },
    {
      value: "createdAt",
      title: "Signup Date"
    },
    {
      value: "status",
      title: "Status"
    }
  ],

  requests: [
    {
      value: "rentalAgreement",
      title: "Rental agreement"
    },
    {
      value: "hostName",
      title: "Host"
    },
    {
      value: "guestName",
      title: "Guest"
    },
    {
      value: "vehicle",
      title: "Vehicle"
    },
    {
      value: "requestTime",
      title: "Request time"
    },
    {
      value: "requestStart",
      title: "Requested start"
    },
    {
      value: "requestEnd",
      title: "Requested end"
    }
    /*{
      value: "subtotal",
      title: "Subtotal"
    },
    {
      value: "tripFee",
      title: "Trip fee"
    },
    {
      value: "deliveryFee",
      title: "Delivery fee"
    },
    {
      value: "hostEarnings",
      title: "Host earnings"
    }*/
  ],
  active: [
    {
      value: "rentalAgreement",
      title: "Rental agreement"
    },
    {
      value: "hostName",
      title: "Host"
    },
    {
      value: "guestName",
      title: "Guest"
    },
    {
      value: "vehicle",
      title: "Vehicle"
    },
    {
      value: "requestTime",
      title: "Request time"
    },
    // {
    //   value: "requestApproved",
    //   title: "Request approved"
    // },
    {
      value: "requestStart",
      title: "Requested start"
    },
    {
      value: "requestEnd",
      title: "Requested end"
    }
    /* {
      value: "subtotal",
      title: "Subtotal"
    },
    {
      value: "tripFee",
      title: "Trip fee"
    },
    {
      value: "deliveryFee",
      title: "Delivery fee"
    },
    {
      value: "cleaningPrice",
      title: "Cleaning price"
    },
    {
      value: "unlimitedMilage",
      title: "Unlimited Milage"
    },
    {
      value: "hostEarnings",
      title: "Host earnings"
    }*/
  ],
  successfullyFinished: [
    {
      value: "rentalAgreement",
      title: "Rental agreement"
    },
    {
      value: "hostName",
      title: "Host"
    },
    {
      value: "guestName",
      title: "Guest"
    },
    {
      value: "vehicle",
      title: "Vehicle"
    },
    {
      value: "requestTime",
      title: "Request time"
    },
    // {
    //   value: "requestApproved",
    //   title: "Request approved"
    // },
    {
      value: "requestStart",
      title: "Requested start"
    },
    {
      value: "requestEnd",
      title: "Requested end"
    }
    /* {
      value: "subtotal",
      title: "Subtotal"
    },
    {
      value: "tripFee",
      title: "Trip fee"
    },
    {
      value: "deliveryFee",
      title: "Delivery fee"
    },
    {
      value: "cleaningPrice",
      title: "Cleaning price"
    },
    {
      value: "unlimitedMilage",
      title: "Unlimited Milage"
    },
    {
      value: "hostEarnings",
      title: "Host earnings"
    }*/
  ],
  canceled: [
    {
      value: "rentalAgreement",
      title: "Rental agreement"
    },
    {
      value: "hostName",
      title: "Host"
    },
    {
      value: "guestName",
      title: "Guest"
    },
    {
      value: "vehicle",
      title: "Vehicle"
    },
    {
      value: "requestTime",
      title: "Request time"
    },
    // {
    //   value: "requestDenied",
    //   title: "Request denied"
    // },
    {
      value: "requestStart",
      title: "Requested start"
    },
    {
      value: "requestEnd",
      title: "Requested end"
    }
    /*{
      value: "subtotal",
      title: "Subtotal"
    },
    {
      value: "tripFee",
      title: "Trip fee"
    },
    {
      value: "deliveryFee",
      title: "Delivery fee"
    },
    {
      value: "cleaningPrice",
      title: "Cleaning price"
    },
    {
      value: "unlimitedMilage",
      title: "Unlimited Milage"
    },
    {
      value: "hostEarnings",
      title: "Host earnings"
    }*/
  ],

  licenses: [
    {
      value: "fullName",
      title: "Name"
    },
    {
      value: "license",
      title: "License"
    },
    {
      value: "uploadDate",
      title: "Upload date"
    }
  ],
  rides: [
    {
      value: "overview",
      title: "Overview"
    },
    {
      value: "userFullName",
      title: "Name"
    },
    {
      value: "vehicle",
      title: "Vehicle"
    },
    {
      value: "status",
      title: "Status"
    },
    {
      value: "uploadedTime",
      title: "Upload time"
    }
  ],

  profileListings: [
    {
      value: "overview",
      title: "Overview"
    },
    {
      value: "vehicle",
      title: "Vehicle"
    },
    {
      value: "uploaded time",
      title: "Uploaded time"
    },
    {
      value: "status",
      title: "Status"
    }
  ],
  profileTrips: [
    {
      value: "host",
      title: "Host"
    },
    {
      value: "guest",
      title: "Guest"
    },
    {
      value: "vehicle",
      title: "Vehicle"
    },
    {
      value: "requested date",
      title: "Requested Date"
    },
    {
      value: "submission date",
      title: "Submission Date"
    }
  ]
};

const RowsValues = [
  {
    value: 10,
    title: "10"
  },
  {
    value: 20,
    title: "20"
  },
  {
    value: 30,
    title: "30"
  },
  {
    value: 40,
    title: "40"
  },
  {
    value: 50,
    title: "50"
  }
];

const HeaderItem = ({ title }) => {
  return (
    <div style={{ width: "9.71vw" }} className="header-item">
      <span className="header-title">{title}</span>
    </div>
  );
};

const Table = ({
  parsedData,
  maxCount,
  getValues,
  state,
  setState,
  tab,
  phase,
  pager,
  searching,
  filters,
  status
}) => {
  const [tableState, setTableState] = useState({
    take: "10",
    field: "Please select value",
    order: "ASC",
    isActivated: true
  });

  const handleChange = (type, value, title?) => {
    if (value !== tableState[type]) {
      const newSort = {
        ...state.sort,
        page: 1,
        [type]: value
      };
      setState({
        sort: newSort
      });
      setTableState({
        ...tableState,
        [type]: type === "field" ? title : value
      });
      getValues(phase ? { pagination: newSort, phase: tab } : newSort);
      return;
    }

    if (value) {
      ScrollService.toTop();
      const newSort = {
        ...state.sort,
        [type]: value
      };
      setState({
        sort: newSort
      });
      getValues(phase ? { pagination: newSort, phase: tab } : newSort);
    } else if (type === "query" && !value) {
      getValues(phase ? { pagination: state.sort, phase: tab } : state.sort);
    }
  };

  const onEnter = e => {
    if (e.key === "Enter") {
      handleChange("query", e.target.value);
    }
  };

  const filterSelectValues = () => {
    return HeaderValues[tab].filter(i => !filters.includes(i.value));
  };

  const handleSearchChange = e => {
    const value = e.target.value;
    setState({
      ...state,
      sort: {
        ...state.sort,
        query: value
      }
    });
    DebouncedSearch(() => handleChange("query", value));
  };

  return (
    <div className="tab-table-wrapper">
      <div className="content-box">
        <div className="search-bar-wrapper">
          {searching && (
            <div className="bar-left-content">
              <div className="search-input-wrapper">
                <input
                  onKeyPress={onEnter}
                  placeholder="Search"
                  className="search-input"
                  onChange={handleSearchChange}
                />
                <div
                  className="search-icon-wrapper"
                  onClick={() => handleChange("query", state.sort.query)}
                >
                  <img src={search} alt="search" className="search-icon" />
                </div>
              </div>
              <Select
                position="bottom"
                leftText="Sort by: "
                values={filterSelectValues()}
                onChange={e => handleChange("field", e.value, e.title)}
                selectedValue={tableState.field}
              />
              <div className="order-wrapper">
                <div
                  className={
                    tableState.order === "ASC"
                      ? "order-value left active"
                      : "order-value left"
                  }
                  onClick={() => handleChange("order", "ASC")}
                >
                  A-Z
                </div>
                <div
                  className={
                    tableState.order === "DESC"
                      ? "order-value active right"
                      : "order-value right"
                  }
                  onClick={() => handleChange("order", "DESC")}
                >
                  Z-A
                </div>
              </div>
              {status && (
                <div className="order-wrapper">
                  <div
                    className={
                      tableState.isActivated
                        ? "order-value left active"
                        : "order-value left"
                    }
                    onClick={() => handleChange("isActivated", true)}
                  >
                    Active
                  </div>
                  <div
                    className={
                      !tableState.isActivated
                        ? "order-value active right"
                        : "order-value right"
                    }
                    onClick={() => handleChange("isActivated", false)}
                  >
                    Inactive
                  </div>
                </div>
              )}
            </div>
          )}
          {pager && maxCount / state.sort.take > 1 && (
            <Pager
              state={state}
              maxCount={maxCount}
              handleChange={handleChange}
            />
          )}
        </div>
      </div>
      <div className="scroll-wrapper">
        <div className="table-wrapper">
          <div className="table-header">
            {HeaderValues[tab].map((h, index) => (
              <HeaderItem key={index} title={h.title} />
            ))}
          </div>
          <div className="table-content">
            {parsedData.length ? (
              parsedData
            ) : (
              <span className="no-data">No data!</span>
            )}
          </div>
        </div>
      </div>
      {pager && maxCount / state.sort.take > 1 && (
        <div className="bottom-wrapper">
          <Select
            position="top"
            leftText="Rows per page "
            rightText={`out of ${maxCount}`}
            values={RowsValues.filter(i => i.value <= maxCount)}
            onChange={e => handleChange("take", e.value)}
            selectedValue={state.sort.take}
          />
          <Pager
            state={state}
            maxCount={maxCount}
            handleChange={handleChange}
          />
        </div>
      )}
    </div>
  );
};

export default Table;
