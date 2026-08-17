import React, { useState } from "react";
import "./index.scss";
import Button from "../../../../components/Button";
import ModalService from "../../../../services/modals";

const NoteScreen = ({ addNote, editNote, deleteNote, params }) => {
  const { id, type } = params;
  const [addNoteState, setState] = useState({
    noteText: type === "add" ? "" : params.text,
    isText: true
  });

  const noteAdd = () => {
    addNote({ id: id, text: addNoteState.noteText });
    ModalService.close();
  };

  const noteEdit = () => {
    editNote({
      id,
      noteId: params.noteId,
      text: addNoteState.noteText
    });
    ModalService.close();
  };

  const onDelete = () => {
    deleteNote({ id: params.userId, noteId: params.noteId });
    ModalService.close();
  };

  return (
    <div className="add-note-wrapper">
      <span className="caption">
        {type === "add" ? "Add Note" : "Edit Note"}
      </span>
      <textarea
        name="note"
        id="note"
        cols="30"
        rows="10"
        placeholder="Enter your note"
        className={!addNoteState.isText ? "note-text error-note" : "note-text"}
        value={addNoteState.noteText}
        onBlur={() =>
          setState({
            ...addNoteState,
            isText: addNoteState.noteText.length
          })
        }
        onClick={() =>
          setState({
            ...addNoteState,
            noteText: addNoteState.noteText
          })
        }
        onChange={e => {
          setState({
            ...addNoteState,
            noteText: e.target.value
          });
        }}
      />
      {!addNoteState.isText && (
        <span className="error-text">Please enter note text!</span>
      )}
      <div className="buttons-row">
        {type === "add" && (
          <Button
            title="Cancel"
            color="green"
            type="transparent"
            style={{
              width: "50%",
              height: "2.5vw",
              fontSize: "0.8vw",
              textTransform: "uppercase",
              padding: 0
            }}
            onClick={() => ModalService.close()}
          />
        )}
        {type === "add" && (
          <Button
            disabled={!addNoteState.noteText.length}
            title="Add"
            color="green"
            type="filled"
            icon="add"
            iconPosition="left"
            style={{
              width: "50%",
              height: "2.5vw",
              fontSize: "0.8vw",
              textTransform: "uppercase",
              padding: 0
            }}
            onClick={() => noteAdd()}
          />
        )}
        {type === "edit" && (
          <Button
            title="Delete"
            color="green"
            type="outline"
            style={{
              width: "45%",
              height: "2.5vw",
              fontSize: "0.8vw",
              textTransform: "uppercase",
              padding: 0
            }}
            onClick={() => onDelete()}
          />
        )}
        {type === "edit" && (
          <Button
            disabled={!addNoteState.noteText.length}
            title="Save"
            color="green"
            type="filled"
            style={{
              width: "45%",
              height: "2.5vw",
              fontSize: "0.8vw",
              textTransform: "uppercase",
              padding: 0
            }}
            onClick={() => noteEdit()}
          />
        )}
      </div>
    </div>
  );
};

export default NoteScreen;
