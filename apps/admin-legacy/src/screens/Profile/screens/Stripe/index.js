import React from "react";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import StripeScreen from "./screen";
import { makeSelectUser } from "../../../../redux/selectors/members";
import actions from "../../../../redux/actions";
import { compose } from "redux";

const mapStateToProps = createStructuredSelector({
  user: makeSelectUser()
});

const mapDispatchToProps = {
  getUser: actions.getUser.request
};

export default compose(connect(mapStateToProps, mapDispatchToProps))(
  StripeScreen
);
