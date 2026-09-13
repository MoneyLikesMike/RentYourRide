import React from "react";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import ProfileScreen from "./screen";
import { makeSelectUser } from "../../redux/selectors/members";
import actions from "../../redux/actions";
import { compose } from "redux";

const mapStateToProps = createStructuredSelector({
  selectedUser: makeSelectUser()
});

const mapDispatchToProps = {
  getUser: actions.getUser.request,
  deleteUser: actions.deleteUser.request,
  deactivateUser: actions.deactivateUser.request,
  activateUser: actions.activateUser.request
};

export default compose(connect(mapStateToProps, mapDispatchToProps))(
  ProfileScreen
);
