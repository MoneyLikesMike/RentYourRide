import React from "react";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import ListingsScreen from "./screen";
import { makeSelectListings } from "../../../../redux/selectors/members";
import actions from "../../../../redux/actions";
import { compose } from "redux";

const mapStateToProps = createStructuredSelector({
  listings: makeSelectListings()
});

const mapDispatchToProps = {
  getListings: actions.getListings.request
};

export default compose(connect(mapStateToProps, mapDispatchToProps))(
  ListingsScreen
);
