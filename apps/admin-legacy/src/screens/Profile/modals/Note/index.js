import React from "react";
import { connect } from "react-redux";
import { createStructuredSelector } from "reselect";
import NoteScreen from "./screen";
import actions from "../../../../redux/actions";
import { compose } from "redux";

const mapStateToProps = createStructuredSelector({});

const mapDispatchToProps = {
  addNote: actions.addNote.request,
  editNote: actions.editNote.request,
  deleteNote: actions.deleteNote.request
};

export default compose(connect(mapStateToProps, mapDispatchToProps))(
  NoteScreen
);
