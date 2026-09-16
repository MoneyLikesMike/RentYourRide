import React from "react";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import RequestsScreen from "./screen";
import {
  makeSelectMaxCount,
  makeSelectTrips
} from "../../../../redux/selectors/trips";
import actions from "../../../../redux/actions";

const mapStateToProps = createStructuredSelector({
  trips: makeSelectTrips(),
  maxCount: makeSelectMaxCount()
});

const mapDispatchToProps = {
  getTrips: actions.getTrips.request
};

export default connect(mapStateToProps, mapDispatchToProps)(RequestsScreen);
