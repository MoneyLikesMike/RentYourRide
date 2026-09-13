import React, { useEffect, useState } from "react";
import "./index.scss";
import { images } from "../../../../assets/images";
import Button from "../../../../components/Button";
import { withRouter } from "react-router";
import DropdownDate from "react-dropdown-date";
import { aboutValidation } from "../../../../services/validations";
import useFormValidation from "../../../../hooks/useFormValidation";

const { trash, confirmStatus } = images;

const Notifications = ({ values, handleChange }) => {
  const notificationsValues = [
    {
      title: "isEmailNotificationsTurnOn",
      text: "Email",
      value: values?.isEmailNotificationsTurnOn
    },
    {
      title: "isTextNotificationsTurnOn",
      text: "Text",
      value: values?.isTextNotificationsTurnOn
    },
    {
      title: "isPushNotificationsTurnOn",
      text: "Push",
      value: values?.isPushNotificationsTurnOn
    }
  ];
  return (
    values && (
      <div className="notifications">
        {notificationsValues.map(n => (
          <div
            key={n.title}
            className="notification"
            onClick={() =>
              handleChange({
                name: n.title,
                text: !n.value
              })
            }
          >
            {n.value ? (
              <img src={confirmStatus} alt="confirm" className="checked" />
            ) : (
              <div className="unchecked" />
            )}
            <span className="notification-title">{n.text}</span>
          </div>
        ))}
      </div>
    )
  );
};

const EditProfileInformation = ({
  history,
  user = {},
  params,
  getUser,
  editUser
}) => {
  useEffect(() => {
    getUser({ id: params });
  }, []);

  useEffect(() => {
    updateState({
      avatar: user?.avatar?.imageUrl,
      about: user.about,
      isEmailNotificationsTurnOn: user.isEmailNotificationsTurnOn,
      isPushNotificationsTurnOn: user.isPushNotificationsTurnOn,
      isTextNotificationsTurnOn: user.isTextNotificationsTurnOn,
      driverLicenseDateOfBirth: user.driverLicenseDateOfBirth
    });
  }, [user]);

  const editUserProfileValidations = values => {
    return {
      ...aboutValidation(values.about)
    };
  };

  const {
    handleSubmit,
    handleChange,
    values,
    updateState,
    errors
  } = useFormValidation(user, editUserProfileValidations);

  const onSave = () => {
    editUser({ id: params, body: values });
    history.goBack();
  };

  return (
    <div className="edit-profile-information-wrapper">
      <div className="detail-information-row">
        <div className="detail-info photo">
          <span className="detail-caption">Photo</span>
          <div className="edit-avatar">
            <img
              src={
                values.avatar
                  ? values.avatar
                  : "https://i.ya-webdesign.com/images/teacher-clip-filipino-3.png"
              }
              alt="avatar"
              className="avatar"
            />
            {values.avatar && (
              <button className="delete-button">
                <img src={trash} alt="" className="delete" />
              </button>
            )}
          </div>
        </div>
        <div className="detail-info date">
          <span className="detail-caption">Date of birth</span>
          <DropdownDate
            startDate={"1960-01-01"}
            endDate={new Date()}
            selectedDate={
              values.driverLicenseDateOfBirth
                ? values.driverLicenseDateOfBirth
                : new Date()
            }
            order={["month", "day", "year"]}
            onDateChange={date => {
              handleChange({
                name: "driverLicenseDateOfBirth",
                text: date
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
        <div className="detail-info notifications">
          <span className="detail-caption">Notifications</span>
          <span className="detail-title">Allow notifications</span>
          <Notifications values={values} handleChange={handleChange} />
        </div>
      </div>
      <div className="border" />
      <div className="detail-info">
        <span className="detail-caption">About</span>
        <textarea
          placeholder="About"
          name="About"
          id="About"
          cols="30"
          rows="10"
          className={errors.about ? "about invalid" : "about"}
          value={values.about}
          onChange={event => {
            handleChange({
              name: "about",
              text: event.target.value
            });
          }}
        />
        {errors.about && <span className="error">{errors.about}</span>}
      </div>
      <div className="buttons-row">
        <Button
          title="Cancel"
          color="green"
          type="transparent"
          style={{
            fontSize: "0.8vw",
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

export default withRouter(EditProfileInformation);
