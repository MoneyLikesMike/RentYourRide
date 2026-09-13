import React, { useState } from "react";
import "./index.scss";
import { withRouter } from "react-router";
import Button from "../../components/Button";
import "react-datepicker/dist/react-datepicker.css";
import Autocomplete from "react-google-autocomplete";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import DropdownDate from "react-dropdown-date";
import {
  addressValidation,
  emailValidation,
  firstNameValidation,
  lastNameValidation,
  passwordValidation,
  phoneValidation
} from "../../services/validations";
import useFormValidation from "../../hooks/useFormValidation";

const initialState = {
  user: {
    birthdayDate: new Date(),
    facebook: false,
    google: false
  },
  secure: true
};
const initialAddUserData = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  address: "",
  phone: ""
};

const AddUser = ({ history }) => {
  const [addUserState, setState] = useState(initialState);

  const addUserValidations = values => {
    return {
      ...passwordValidation(values.password),
      ...emailValidation(values.email),
      ...firstNameValidation(values.firstName),
      ...lastNameValidation(values.lastName),
      ...addressValidation(values.address),
      ...phoneValidation(values.phone)
    };
  };

  const { handleSubmit, handleChange, values, errors } = useFormValidation(
    initialAddUserData,
    addUserValidations
  );

  const onSave = () => {
    setState({
      ...addUserState,
      user: {
        ...addUserState.user,
        ...values
      }
    });
    history.push("/members");
  };

  return (
    <div className="add-user-wrapper">
      <div className="add-user-header">
        <div className="page-caption-route">
          <span className="page-caption">Add user</span>
          <span className="route">Members / Add user</span>
        </div>
        <div className="actions-buttons">
          <Button
            title="cancel"
            type="outline"
            color="green"
            style={{
              width: "10vw",
              fontSize: ".7vw",
              textTransform: "uppercase",
              marginRight: "1vw"
            }}
            onClick={() => history.push("/members")}
          />
          <Button
            title="save"
            type="filled"
            color="green"
            icon="save"
            iconPosition="left"
            style={{
              width: "10vw",
              fontSize: ".5vw",
              textTransform: "uppercase"
            }}
            onClick={() => handleSubmit(onSave)}
          />
        </div>
      </div>
      <div className="user-info-wrapper">
        <div className="account-info">
          <span className="column-caption">Account</span>
          <div className="user-input-wrapper">
            <div className="user-verify-caption-row">
              <span className="user-input-caption">Email</span>
              <Button
                title="Verify"
                color="green"
                type="transparent"
                style={{
                  fontSize: ".75vw",
                  padding: "0",
                  width: "2vw",
                  height: "auto"
                }}
                onClick={() => {}}
              />
            </div>
            <input
              required
              placeholder="Email"
              className={errors.email ? "input invalid" : "input"}
              onChange={event =>
                handleChange({
                  name: "email",
                  text: event.target.value
                })
              }
            />
            {errors.email && <span className="error">{errors.email}</span>}
          </div>
          <div className="user-input-wrapper">
            <div className="user-verify-caption-row">
              <span className="user-input-caption">Password</span>
            </div>
            <div className="secure-wrapper">
              <input
                required
                type={addUserState.secure ? "password" : "text"}
                placeholder="Password"
                className={errors.password ? "input invalid" : "input"}
                onChange={event =>
                  handleChange({
                    name: "password",
                    text: event.target.value
                  })
                }
              />
              {errors.password && (
                <span className="error">{errors.password}</span>
              )}
              <button
                onClick={() =>
                  setState({
                    ...addUserState,
                    secure: !addUserState.secure
                  })
                }
                className="secure-button"
              >
                {initialState.secure ? (
                  <i className="far fa-eye-slash" />
                ) : (
                  <i className="far fa-eye" />
                )}
              </button>
            </div>
          </div>
          <div className="date-user-inputs">
            <span className="user-verify-caption-row user-input-caption">
              Date of birth
            </span>
            <DropdownDate
              startDate={"1960-01-01"}
              endDate={new Date()}
              selectedDate={addUserState.user.birthdayDate}
              order={["month", "day", "year"]}
              onDateChange={date => {
                setState({
                  ...addUserState,
                  user: {
                    ...addUserState.user,
                    birthdayDate: date
                  }
                });
              }}
              classes={{
                dateContainer: "dateContainer",
                yearContainer: "yearContainer",
                monthContainer: "yearContainer",
                dayContainer: "yearContainer",
                year: "year",
                month: "year",
                day: "year",
                yearOptions: "option",
                monthOptions: "option",
                dayOptions: "option"
              }}
            />
          </div>
          <div className="user-input-wrapper">
            <div className="user-verify-caption-row">
              <span className="user-input-caption">First Name</span>
            </div>
            <input
              required
              placeholder="First Name"
              className={errors.firstName ? "input invalid" : "input"}
              onChange={event =>
                handleChange({
                  name: "firstName",
                  text: event.target.value
                })
              }
            />
            {errors.firstName && (
              <span className="error">{errors.firstName}</span>
            )}
          </div>
          <div className="user-input-wrapper">
            <div className="user-verify-caption-row">
              <span className="user-input-caption">Last Name</span>
            </div>
            <input
              required
              placeholder="Last Name"
              className={errors.firstName ? "input invalid" : "input"}
              onChange={event =>
                handleChange({
                  name: "lastName",
                  text: event.target.value
                })
              }
            />
            {errors.lastName && (
              <span className="error">{errors.lastName}</span>
            )}
          </div>
        </div>
        <div className="profile-info">
          <span className="column-caption">Profile</span>
          <div className="user-input-wrapper">
            <div className="user-verify-caption-row">
              <span className="user-input-caption">Address</span>
            </div>
            <Autocomplete
              className={errors.address ? "input invalid" : "input"}
              componentRestrictions={{ country: ["us", "ca"] }}
              placeholder={"Address"}
              style={{}}
              onChange={event =>
                handleChange({
                  name: "address",
                  text: event.target.value
                })
              }
              onPlaceSelected={place =>
                handleChange({
                  name: "address",
                  text: place.formatted_address
                })
              }
            />
            {errors.address && <span className="error">{errors.address}</span>}
          </div>
          <div className="user-input-wrapper">
            <div className="user-verify-caption-row">
              <span className="user-input-caption">Mobile Phone</span>
              <Button
                title="Verify"
                color="green"
                type="transparent"
                style={{
                  fontSize: ".75vw",
                  padding: "0",
                  width: "2vw",
                  height: "auto"
                }}
                onClick={() => {}}
              />
            </div>
            <div className={errors.phone ? "input invalid" : "input"}>
              <PhoneInput
                defaultCountry="US"
                placeholder="Phone number"
                onChange={event =>
                  handleChange({
                    name: "phone",
                    text: event
                  })
                }
              />
            </div>
            {errors.phone && <span className="error">{errors.phone}</span>}
          </div>
          <div className="license-row">
            <span className="license-caption">License</span>
            <Button
              title="Verify"
              color="green"
              type="transparent"
              style={{
                fontSize: ".75vw",
                padding: "0",
                width: "2vw",
                height: "auto"
              }}
              onClick={() => {}}
            />
          </div>
          <span className="column-caption">Social</span>
          <div className="social-row">
            <div className="social-captions">
              <span className="caption">Facebook</span>
              <span className="status">Not connected</span>
            </div>
            <Button
              title="Connect"
              color="green"
              type="transparent"
              style={{
                fontSize: ".75vw",
                padding: "0",
                width: "2vw",
                height: "auto"
              }}
              onClick={() => {}}
            />
          </div>
          <div className="social-row">
            <div className="social-captions">
              <span className="caption">Google</span>
              <span className="status">Not connected</span>
            </div>
            <Button
              title="Connect"
              color="green"
              type="transparent"
              style={{
                fontSize: ".75vw",
                padding: "0",
                width: "2vw",
                height: "auto"
              }}
              onClick={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default withRouter(AddUser);
