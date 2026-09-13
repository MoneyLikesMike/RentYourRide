import React from "react";
import { withRouter } from "react-router-dom";
import "./index.scss";
import Button from "../Button";

import { images } from "../../assets/images";
import AlertsService from "../../services/alerts";
const { returnArrow } = images;

const Header = ({ history, logout, isLoggedIn }) => {
  const currLocation = history.location.pathname;
  const onLogout = () => {
    AlertsService.confirm({text: "You want to logout?", confirmButtonText: "Logout", func: () => logout()})
  };

  return (
    <div className="header-wrapper">
      {currLocation.includes("profile") && (
        <div className="go-back" onClick={history.goBack}>
          <img src={returnArrow} alt="go back" className="back-img" />
          Go back
        </div>
      )}
      <div />
      <div className="right-side">
        <img
          src="https://i.ya-webdesign.com/images/teacher-clip-filipino-3.png"
          alt="avatar"
          className="avatar"
        />
        {isLoggedIn && (
          <Button
            title="Logout"
            type="transparent"
            color="green"
            style={{
              width: "4vw",
              height: "2.2vw",
              fontSize: ".7vw",
              textTransform: "uppercase"
            }}
            onClick={onLogout}
          />
        )}
      </div>
    </div>
  );
};

export default withRouter(Header);
