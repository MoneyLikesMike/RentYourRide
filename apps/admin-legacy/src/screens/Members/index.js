import React from "react";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import MembersScreen from "./screen";
import actions from "../../redux/actions";
import {
  makeSelectMembers,
  makeSelectMaxCount
} from "../../redux/selectors/members";

const mapStateToProps = createStructuredSelector({
  members: makeSelectMembers(),
  maxCount: makeSelectMaxCount()
});

const mapDispatchToProps = {
  getMembers: actions.getMembers.request
};

export default connect(mapStateToProps, mapDispatchToProps)(MembersScreen);
