import React from "react";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import LoginScreen from "./screen";
import actions from "../../redux/actions";
import { selectErrorMessage } from "../../redux/selectors/tokens";
import { compose } from "redux";

const mapStateToProps = createStructuredSelector({
  errorStatus: selectErrorMessage()
});

const mapDispatchToProps = {
  signIn: actions.signIn.request
};

export default compose(connect(mapStateToProps, mapDispatchToProps))(
  LoginScreen
);
