import React from "react";
import { BrowserRouter, Route } from "react-router-dom";

import "./index.scss";

import LoginContainer from "../Login";
import MembersContainer from "../Members";
import SidebarContainer from "../Sidebar";
import TripsContainer from "../Trips";
import CarContainer from "../Car";
import ProfileContainer from "../Profile";
import EditProfileContainer from "../EditProfile";
import ValidationContainer from "../Validation";
import AddUserContainer from "../AddUser";
import StripeContainer from "../Profile/screens/Stripe";

import LoaderService from "../../services/loader";
import ModalsService from "../../services/modals";

import LoaderSpinner from "../../components/Loader";
import Modal from "../../components/Modal";
import Header from "../../components/Header";

const App = ({ isLoggedIn, user, logout }) => {
  return (
    <BrowserRouter>
      <LoaderSpinner ref={LoaderService.init} />
      <Modal ref={ModalsService.init} />
      {isLoggedIn ? (
        <div className="main-container">
          <SidebarContainer />
          <div className="content-container">
            <Header logout={logout} isLoggedIn={isLoggedIn} user={user} />
            <Route exact path={"/members"} component={MembersContainer} />
            <Route exact path={"/trips"} component={TripsContainer} />
            <Route
              exact
              path={"/members/add-user"}
              component={AddUserContainer}
            />
            <Route exact path={"/validation"} component={ValidationContainer} />
            <Route
              exact
              path={"/members/profile/info/:id"}
              component={ProfileContainer}
            />
            <Route
              exact
              path={"/members/profile/:id/edit/:type"}
              component={EditProfileContainer}
            />
            <Route
              exact
              path={"/members/profile/car/info/:id"}
              component={CarContainer}
            />
            <Route
              exact
              path={"/members/profile/stripe/:id"}
              component={StripeContainer}
            />
            <Route exact path={"/"} component={MembersContainer} />
          </div>
        </div>
      ) : (
        <LoginContainer />
      )}
    </BrowserRouter>
  );
};

export default App;
