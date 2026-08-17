import React from "react";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import InformationScreen from "./screen";
import { makeSelectUser } from "../../../../redux/selectors/members";
import { compose } from "redux";
import actions from "../../../../redux/actions";

const mapStateToProps = createStructuredSelector({
  selectedUser: makeSelectUser()
});

const mapDispatchToProps = {
  verifyEmail: actions.verifyEmail.request
};

export default compose(connect(mapStateToProps, mapDispatchToProps))(
  InformationScreen
);
