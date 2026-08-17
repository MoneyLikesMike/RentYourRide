import React from "react";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import AppScreen from "./screen";
import { selectLoggedIn, selectUser } from "../../redux/selectors/tokens";
import actions from "../../redux/actions";
import { compose } from "redux";

const mapStateToProps = createStructuredSelector({
  isLoggedIn: selectLoggedIn(),
  user: selectUser()
});

const mapDispatchToProps = {
  logout: actions.logout.request
};

export default compose(connect(mapStateToProps, mapDispatchToProps))(AppScreen);
