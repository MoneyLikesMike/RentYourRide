import React from "react";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import TripsScreen from "./screen";
import { makeSelectUserTrips } from "../../../../redux/selectors/members";
import actions from "../../../../redux/actions";
import { compose } from "redux";

const mapStateToProps = createStructuredSelector({
  userTrips: makeSelectUserTrips()
});
const mapDispatchToProps = {
  getUserTrips: actions.getUserTrips.request
};

export default compose(connect(mapStateToProps, mapDispatchToProps))(
  TripsScreen
);
