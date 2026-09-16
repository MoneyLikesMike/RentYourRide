import React from "react";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import EditContactInformationScreen from "./screen";
import { makeSelectUser } from "../../../../redux/selectors/members";
import actions from "../../../../redux/actions";
import { compose } from "redux";

const mapStateToProps = createStructuredSelector({
  user: makeSelectUser()
});

const mapDispatchToProps = {
  getUser: actions.getUser.request,
  editUser: actions.editUser.request
};

export default compose(connect(mapStateToProps, mapDispatchToProps))(
  EditContactInformationScreen
);
