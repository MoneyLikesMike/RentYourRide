import React, { useEffect, useState } from "react";
import { withRouter } from "react-router";
import "./index.scss";
import Autocomplete from "react-google-autocomplete";
import Button from "../../../../components/Button";
import PhoneInput from "react-phone-number-input";
import "sweetalert2/src/sweetalert2.scss";
import DropdownDate from "react-dropdown-date";
import {
  accountNumberValidation,
  addressOneValidation,
  addressTwoValidation,
  cityValidation,
  confirmAccountNumberValidation,
  emailValidation,
  firstNameValidation,
  lastNameValidation,
  phoneValidation,
  productDescriptionValidation,
  routingNumberValidation,
  socialSecurityValidation,
  stateValidation
} from "../../../../services/validations";
import useFormValidation from "../../../../hooks/useFormValidation";

const StripeScreen = ({ user, getUser, match, history }) => {
  const id = match.params.id;
  useEffect(() => {
    getUser({ id: id });
  }, []);
  const [stripePageState, setState] = useState({
    step: 1,
    user
  });

  // const initialStripeDataPersonal = {
  //   email: "",
  //   firstName: "",
  //   lastName: "",
  //   addressOne: "",
  //   addressTwo: "",
  //   city: "",
  //   state: "",
  //   phoneNumber: "",
  //   socialSecurity: ""
  // };
  // const initialStripeDataBusiness = {
  //   confirmAccountNumber: "",
  //   accountNumber: "",
  //   routingNumber: "",
  //   productDescription: ""
  // };

  const stripeDataValidations = values => {
    switch (stripePageState.step) {
      case 1: {
        return {
          ...emailValidation(values.email),
          ...firstNameValidation(values.firstName),
          ...lastNameValidation(values.lastName),
          ...addressOneValidation(values.addressOne),
          ...addressTwoValidation(values.addressTwo),
          ...cityValidation(values.city),
          ...stateValidation(values.state),
          ...socialSecurityValidation(values.socialSecurity),
          ...phoneValidation(values.phoneNumber)
        };
      }
      case 2: {
        return {
          ...productDescriptionValidation(values.productDescription),
          ...routingNumberValidation(values.routingNumber),
          ...accountNumberValidation(values.accountNumber),
          ...confirmAccountNumberValidation(values.confirmAccountNumber)
        };
      }
    }
  };

  const { handleSubmit, handleChange, values, errors } = useFormValidation(
    // stripePageState.step === 1
    //   ? initialStripeDataPersonal
    //   : initialStripeDataBusiness,
    // initialStripeDataBusiness
    user,
    stripeDataValidations
  );

  const onSave = () => {
    setState({
      ...stripePageState,
      user: {
        ...stripePageState.user,
        ...values
      }
    });
    history.goBack();
  };

  const onNext = () => {
    setState({
      ...stripePageState,
      user: {
        ...stripePageState.user,
        ...values
      },
      step: 2
    });
  };

  return (
    <div className="stripe-wrapper">
      <span className="step-caption">
        {stripePageState.step === 1 ? "Personal details" : "Business & Payout"}
      </span>
      <div className="step-borders">
        <div className="border active" />
        <div
          className={stripePageState.step !== 1 ? "border active" : "border"}
        />
      </div>
      {stripePageState.step === 1 ? (
        <div className="step-wrapper first-step">
          <div className="columns">
            <div className="column">
              <span className="column-caption">Legal Name</span>
              <div className="user-input-wrapper">
                <div className="user-verify-caption-row">
                  <span className="user-input-caption">First Name</span>
                </div>
                <input
                  required
                  placeholder="First Name"
                  className={
                    errors.firstName ? "user-input invalid" : "user-input"
                  }
                  value={values.firstName}
                  onChange={event => {
                    handleChange({
                      name: "firstName",
                      text: event.target.value
                    });
                  }}
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
                  placeholder="First Name"
                  className={
                    errors.lastName ? "user-input invalid" : "user-input"
                  }
                  value={values.lastName}
                  onChange={event => {
                    handleChange({
                      name: "lastName",
                      text: event.target.value
                    });
                  }}
                />
                {errors.lastName && (
                  <span className="error">{errors.lastName}</span>
                )}
              </div>
              <div className="user-input-wrapper">
                <div className="user-verify-caption-row">
                  <span className="user-input-caption">Email</span>
                </div>
                <input
                  required
                  placeholder="Email"
                  className={errors.email ? "user-input invalid" : "user-input"}
                  value={values.email}
                  onChange={event => {
                    handleChange({
                      name: "email",
                      text: event.target.value
                    });
                  }}
                />
                {errors.email && <span className="error">{errors.email}</span>}
              </div>
              <div className="user-input-wrapper">
                <div className="user-verify-caption-row">
                  <span className="user-input-caption">Date of birth</span>
                </div>
                <DropdownDate
                  startDate={"1960-01-01"}
                  endDate={new Date()}
                  selectedDate={stripePageState.user.birthdayDate}
                  order={["month", "day", "year"]}
                  onDateChange={date => {
                    setState({
                      ...stripePageState,
                      user: {
                        ...stripePageState.user,
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
            </div>
            <div className="column">
              <span className="column-caption">Home Address</span>
              <div className="user-input-wrapper">
                <div className="user-verify-caption-row">
                  <span className="user-input-caption">Address Line 1</span>
                </div>
                <Autocomplete
                  className={
                    errors.addressOne ? "user-input invalid" : "user-input"
                  }
                  componentRestrictions={{ country: ["us", "ca"] }}
                  placeholder={"Address"}
                  style={{}}
                  value={values.addressOne}
                  onChange={event => {
                    handleChange({
                      name: "addressOne",
                      text: event.target.value
                    });
                  }}
                  onPlaceSelected={place => {
                    handleChange({
                      name: "addressOne",
                      text: place.formatted_address
                    });
                  }}
                />
                {errors.addressOne && (
                  <span className="error">{errors.addressOne}</span>
                )}
              </div>
              <div className="user-input-wrapper">
                <div className="user-verify-caption-row">
                  <span className="user-input-caption">Address Line 2</span>
                </div>
                <Autocomplete
                  className={
                    errors.addressTwo ? "user-input invalid" : "user-input"
                  }
                  componentRestrictions={{ country: ["us", "ca"] }}
                  placeholder={"Address"}
                  style={{}}
                  value={values.addressTwo}
                  onChange={event => {
                    handleChange({
                      name: "addressTwo",
                      text: event.target.value
                    });
                  }}
                  onPlaceSelected={place => {
                    handleChange({
                      name: "addressOne",
                      text: place.formatted_address
                    });
                  }}
                />
                {errors.addressTwo && (
                  <span className="error">{errors.addressTwo}</span>
                )}
              </div>
              <div className="user-input-wrapper">
                <div className="user-verify-caption-row">
                  <span className="user-input-caption">City</span>
                </div>
                <Autocomplete
                  className={errors.city ? "user-input invalid" : "user-input"}
                  componentRestrictions={{ country: ["us", "ca"] }}
                  placeholder={"City"}
                  style={{}}
                  types={["(cities)"]}
                  value={values.city}
                  onChange={event => {
                    handleChange({
                      name: "city",
                      text: event.target.value
                    });
                  }}
                  onPlaceSelected={place => {
                    handleChange({
                      name: "city",
                      text: place.formatted_address
                    });
                  }}
                />
                {errors.city && <span className="error">{errors.city}</span>}
              </div>
              <div className="user-input-wrapper">
                <div className="user-verify-caption-row">
                  <span className="user-input-caption">State</span>
                </div>
                <input
                  required
                  className={errors.state ? "user-input invalid" : "user-input"}
                  placeholder="State"
                  value={values.state}
                  onChange={event => {
                    handleChange({
                      name: "state",
                      text: event.target.value
                    });
                  }}
                />
                {errors.state && <span className="error">{errors.state}</span>}
              </div>
            </div>
            <div className="column">
              <span className="column-caption" />
              <div className="user-input-wrapper">
                <div className="user-verify-caption-row">
                  <span className="user-input-caption">Mobile Phone</span>
                </div>
                <div
                  className={errors.phone ? "user-input invalid" : "user-input"}
                >
                  <PhoneInput
                    defaultCountry="US"
                    placeholder="Phone number"
                    value={values.phoneNumber}
                    onChange={event => {
                      handleChange({
                        name: "phoneNumber",
                        text: event
                      });
                    }}
                  />
                </div>
                {errors.phone && <span className="error">{errors.phone}</span>}
              </div>
              <div className="user-input-wrapper">
                <div className="user-verify-caption-row">
                  <span className="user-input-caption">
                    Last 4 digits of Social Security number
                  </span>
                </div>
                <input
                  required
                  className={
                    errors.socialSecurity ? "user-input invalid" : "user-input"
                  }
                  placeholder="Social security number"
                  value={values.socialSecurity}
                  onChange={event => {
                    handleChange({
                      name: "socialSecurity",
                      text: event.target.value
                    });
                  }}
                />
                {errors.socialSecurity && (
                  <span className="error">{errors.socialSecurity}</span>
                )}
              </div>
              <span className="link-row">
                By clicking next, you agree to the{" "}
                <a href="#" className="link">
                  Connected Account Agreement ,
                </a>
                to receiving autodialed text messages from Stripe, and you
                certify that the information you have provided to Stripe is
                complete and correct. Stripe, Inc. is a registered ISO of Wells
                Fargo Bank, N.A., Concord, CA
              </span>
            </div>
          </div>
          <Button
            title="Next"
            color="green"
            type="filled"
            style={{
              width: "10vw",
              fontSize: ".7vw",
              textTransform: "uppercase",
              marginTop: "2vw"
            }}
            onClick={() => handleSubmit(onNext)}
          />
        </div>
      ) : (
        <div className="step-wrapper second-step">
          <div className="columns">
            <div className="column product">
              <span className="column-caption">Business Details</span>
              <div className="user-input-wrapper">
                <div className="user-verify-caption-row">
                  <span className="user-input-caption">
                    Product Description
                  </span>
                </div>
                <textarea
                  required
                  className={
                    errors.productDescription
                      ? "user-textarea invalid"
                      : "user-textarea"
                  }
                  placeholder="Product Description"
                  value={values.productDescription}
                  onChange={event => {
                    handleChange({
                      name: "productDescription",
                      text: event.target.value
                    });
                  }}
                />
                {errors.productDescription && (
                  <span className="error textarea">
                    {errors.productDescription}
                  </span>
                )}
              </div>
              <span className="link-row">
                In a few sentences, describe your goods or services, your
                customers (e.g., during checkout, one day after a service, etc.)
              </span>
            </div>
            <div className="column payout">
              <span className="column-caption">Payout Details</span>
              <div className="user-input-wrapper">
                <div className="user-verify-caption-row">
                  <span className="user-input-caption">Routing number</span>
                </div>
                <input
                  required
                  className={
                    errors.routingNumber ? "user-input invalid" : "user-input"
                  }
                  placeholder="Routing number"
                  value={values.routingNumber}
                  onChange={event => {
                    handleChange({
                      name: "routingNumber",
                      text: event.target.value
                    });
                  }}
                />
                {errors.routingNumber && (
                  <span className="error">{errors.routingNumber}</span>
                )}
              </div>
              <div className="user-input-wrapper">
                <div className="user-verify-caption-row">
                  <span className="user-input-caption">Account number</span>
                </div>
                <input
                  required
                  className={
                    errors.accountNumber ? "user-input invalid" : "user-input"
                  }
                  placeholder="Account number"
                  value={values.accountNumber}
                  onChange={event => {
                    handleChange({
                      name: "accountNumber",
                      text: event.target.value
                    });
                  }}
                />
                {errors.accountNumber && (
                  <span className="error">{errors.accountNumber}</span>
                )}
                <span className="link-row account">
                  Your bank account must be a checking account
                </span>
              </div>
              <div className="user-input-wrapper">
                <div className="user-verify-caption-row">
                  <span className="user-input-caption">
                    Confirm Account number
                  </span>
                </div>
                <input
                  required
                  className={
                    errors.confirmAccountNumber
                      ? "user-input invalid"
                      : "user-input"
                  }
                  placeholder="Confirm account number"
                  value={values.confirmAccountNumber}
                  onChange={event => {
                    handleChange({
                      name: "confirmAccountNumber",
                      text: event.target.value
                    });
                  }}
                />
                {errors.confirmAccountNumber && (
                  <span className="error">{errors.confirmAccountNumber}</span>
                )}
              </div>
            </div>
          </div>
          <div className="buttons-row">
            <Button
              title="Back"
              color="green"
              type="outline"
              style={{
                width: "10vw",
                fontSize: ".7vw",
                textTransform: "uppercase",
                marginTop: "2vw"
              }}
              onClick={() =>
                setState({
                  ...stripePageState,
                  step: 1
                })
              }
            />
            <Button
              title="Save"
              color="green"
              type="filled"
              style={{
                width: "10vw",
                fontSize: ".7vw",
                textTransform: "uppercase",
                marginTop: "2vw"
              }}
              onClick={() => handleSubmit(onSave)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default withRouter(StripeScreen);
