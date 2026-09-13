import React, { useEffect, useState } from "react";
import "./index.scss";
import Autocomplete from "react-google-autocomplete";
import PhoneInput from "react-phone-number-input";
import Button from "../../../../components/Button";
import { withRouter } from "react-router";
import {
  addressValidation,
  cityValidation,
  countryValidation,
  firstNameValidation,
  lastNameValidation,
  phoneValidation
} from "../../../../services/validations";
import useFormValidation from "../../../../hooks/useFormValidation";

const EditContactInformation = ({
  params,
  user,
  getUser,
  history,
  editUser
}) => {
  const [editContactInformationPageState, setState] = useState({
    secure: true
  });

  useEffect(() => {
    getUser({ id: params });
  }, []);

  useEffect(() => {
    updateState({
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      address: user?.driverLicenseAddress?.address
        ? user?.driverLicenseAddress?.address
        : user?.address?.address,
      country: user?.driverLicenseAddress?.country
        ? user?.driverLicenseAddress?.country
        : user?.address?.country,
      city: user?.driverLicenseAddress?.city
        ? user?.driverLicenseAddress?.city
        : user?.address?.city
    });
  }, [user]);

  const editUserContactDataValidations = values => {
    return {
      ...firstNameValidation(values.firstName),
      ...lastNameValidation(values.lastName),
      ...phoneValidation(values.phoneNumber),
      ...addressValidation(values.address),
      ...cityValidation(values.city),
      ...countryValidation(values.country)
    };
  };

  const {
    handleSubmit,
    handleChange,
    values,
    errors,
    updateState
  } = useFormValidation(user, editUserContactDataValidations);

  const onSave = () => {
    editUser({
      id: params,
      body: values
    });
    history.goBack();
  };

  const contactInformation = [
    {
      title: "firstName",
      text: "First Name",
      value: values.firstName,
      type: "all"
    },
    {
      title: "lastName",
      text: "Last Name",
      value: values.lastName,
      type: "all"
    },
    {
      title: "phoneNumber",
      text: "Mobile Phone",
      value: values.phoneNumber,
      type: "phoneNumber"
    },
    {
      title: "address",
      text: "Address",
      value: values.address,
      type: "address"
    },
    {
      title: "country",
      text: "Country",
      value: values.country,
      type: "address"
    },
    {
      title: "city",
      text: "City",
      value: values.city,
      type: "address"
    }
  ];

  return (
    <div className="edit-contact-information-wrapper">
      <span className="caption">Account</span>
      <div className="columns">
        {contactInformation.map(c => (
          <div key={c.title} className="user-input-wrapper">
            <div className="user-verify-caption-row">
              <span className="user-input-caption">{c.text}</span>
            </div>
            {c.type === "all" && (
              <input
                required
                type={
                  editContactInformationPageState.secure &&
                  c.title === "password"
                    ? "password"
                    : "text"
                }
                className={errors[c.title] ? "input invalid" : "input"}
                placeholder={c.text}
                value={c.value}
                onChange={event => {
                  handleChange({
                    name: c.title,
                    text: event.target.value
                  });
                }}
              />
            )}
            {c.type === "phoneNumber" && (
              <div className={errors[c.title] ? "input invalid" : "input"}>
                <PhoneInput
                  defaultCountry="US"
                  placeholder={c.text}
                  value={values[c.title]}
                  onChange={event => {
                    handleChange({
                      name: c.title,
                      text: event
                    });
                  }}
                />
              </div>
            )}
            {c.type === "address" && (
              <Autocomplete
                className={errors[c.title] ? "input invalid" : "input"}
                componentRestrictions={{ country: ["us", "ca"] }}
                placeholder={c.text}
                value={values[c.title]}
                onChange={event => {
                  handleChange({
                    name: c.title,
                    text: event.target.value
                  });
                }}
                onPlaceSelected={place => {
                  handleChange({
                    name: c.title,
                    text:
                      c.title === "country"
                        ? place?.address_components?.pop().long_name
                        : place?.formatted_address
                  });
                }}
              />
            )}
            {errors[c.title] && (
              <span className="error">{errors[c.title]}</span>
            )}
          </div>
        ))}
      </div>
      <div className="buttons-row">
        <Button
          title="Cancel"
          color="green"
          type="transparent"
          style={{
            fontSize: ".8vw",
            padding: "0",
            margin: "0 1vw",
            width: "12vw",
            height: "3vw",
            textTransform: "uppercase"
          }}
          onClick={() => history.goBack()}
        />
        <Button
          title="Save"
          color="green"
          type="filled"
          style={{
            fontSize: "0.8vw",
            padding: "0",
            margin: "0 1vw",
            width: "12vw",
            height: "3vw",
            textTransform: "uppercase"
          }}
          onClick={() => handleSubmit(onSave)}
        />
      </div>
    </div>
  );
};

export default withRouter(EditContactInformation);
