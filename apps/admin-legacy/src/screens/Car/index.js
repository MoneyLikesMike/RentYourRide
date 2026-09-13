import React from "react";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import CarScreen from "./screen";
import actions from "../../redux/actions";
import { makeSelectRide } from "../../redux/selectors/rides";
import { compose } from "redux";

const mapStateToProps = createStructuredSelector({
  selectedRide: makeSelectRide()
});

const mapDispatchToProps = {
  getRide: actions.getRide.request,
  rideVerify: actions.rideVerify.request,
  rideUnverify: actions.rideUnverify.request,
  rideDeactivate: actions.rideDeactivate.request,
  rideActivate: actions.rideActivate.request
};

export default compose(connect(mapStateToProps, mapDispatchToProps))(CarScreen);
