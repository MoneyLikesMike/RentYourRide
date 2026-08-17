import React from "react";
import "./index.scss";

const returnNumbers = (sort, maxCount, take) => {
  const pagesCount = +(maxCount / take).toFixed(0);
  const count = pagesCount - sort.page;
  let result = [sort.page];
  if (count >= 2) {
    result = [sort.page, sort.page + 1, sort.page + 2];
  } else if (count === 1) {
    result = [sort.page - 1, sort.page, sort.page + 1];
  } else if (count === 0) {
    result = [sort.page - 2, sort.page - 1, sort.page];
  }
  if (pagesCount === 2) {
    return result.slice(1, 3);
  } else if (pagesCount === 1) {
    return [sort.page];
  } else {
    return result;
  }
};

const Pager = ({ state, maxCount, handleChange }) => (
  <div className="shadow-box pages-box">
    <span
      onClick={() => {
        if (state.sort.page > 1) {
          handleChange("page", state.sort.page - 1);
        }
      }}
      style={{ marginRight: "1vw" }}
      className="nav-but"
    >
      Previous
    </span>
    {returnNumbers(state.sort, maxCount, state.sort.take).map(i => (
      <span
        onClick={() => handleChange("page", i)}
        key={i}
        className={`${i === state.sort.page ? "active-number " : ""}number`}
      >
        {i}
      </span>
    ))}
    <span>out of</span>
    <span
      className="number"
      onClick={() => {
        handleChange("page", Math.ceil(maxCount / state.sort.take));
      }}
    >
      {Math.ceil(maxCount / state.sort.take)}
    </span>
    <span
      onClick={() => {
        if (state.sort.page < +Math.ceil(maxCount / state.sort.take)) {
          handleChange("page", state.sort.page + 1);
        }
      }}
      className="nav-but"
      style={{ marginLeft: "1vw" }}
    >
      Next
    </span>
  </div>
);

export default Pager;
