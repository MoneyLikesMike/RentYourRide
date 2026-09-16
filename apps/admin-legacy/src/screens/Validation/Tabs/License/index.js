import React from "react";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import LicenseScreen from "./screen";
import actions from "../../../../redux/actions";
import {
  makeSelectLicenses,
  makeSelectMaxCount
} from "../../../../redux/selectors/licenses";

const mapStateToProps = createStructuredSelector({
  licenses: makeSelectLicenses(),
  maxCount: makeSelectMaxCount()
});

const mapDispatchToProps = {
  getLicenses: actions.getLicenses.request
};

export default connect(mapStateToProps, mapDispatchToProps)(LicenseScreen);
