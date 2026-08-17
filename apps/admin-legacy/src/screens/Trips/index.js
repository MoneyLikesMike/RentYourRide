import React from "react";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import TripsScreen from "./screen";
import { compose } from "redux";

const mapStateToProps = createStructuredSelector({});

const mapDispatchToProps = {};

export default compose(connect(mapStateToProps, mapDispatchToProps))(
  TripsScreen
);
