import React from "react";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import RidesScreen from "./screen";
import actions from "../../../../redux/actions";
import {
  makeSelectRides,
  makeSelectMaxCount
} from "../../../../redux/selectors/rides";

const mapStateToProps = createStructuredSelector({
  rides: makeSelectRides(),
  maxCount: makeSelectMaxCount()
});

const mapDispatchToProps = {
  getRides: actions.getRides.request
};

export default connect(mapStateToProps, mapDispatchToProps)(RidesScreen);
