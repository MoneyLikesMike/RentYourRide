import React from "react";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import CheckScreen from "./screen";
import { makeSelectTrip } from "../../redux/selectors/trips";
import actions from "../../redux/actions";
import { compose } from "redux";

const mapStateToProps = createStructuredSelector({
  trip: makeSelectTrip()
});

const mapDispatchToProps = {
  getTrip: actions.getTrip.request
};

export default compose(connect(mapStateToProps, mapDispatchToProps))(
  CheckScreen
);
