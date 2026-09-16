import React, { useState } from "react";
import moment from "moment";
import "./index.scss";
import { images } from "../../../../assets/images";
import ModalService from "../../../../services/modals";
import Button from "../../../../components/Button";
import { Link } from "react-router-dom";

const { trash, group, processing, searchGreen, confirm, EditIcon } = images;

const Notifications = ({ selectedUser }) => {
  const notifications = [
    {
      title: "Email",
      value: selectedUser?.isEmailNotificationsTurnOn
    },
    {
      title: "Text",
      value: selectedUser?.isTextNotificationsTurnOn
    },
    {
      title: "Push",
      value: selectedUser?.isPushNotificationsTurnOn
    }
  ];
  return (
    <div className="notifications">
      {notifications.map(n => {
        return (
          <span className={n.value ? "data" : "passive-data"} key={n.title}>
            <div className={n.value ? "active-checkbox" : "checkbox"}>
              {n.value && (
                <img src={confirm} alt="checkbox" className="checkbox-image" />
              )}
            </div>
            {n.title}
          </span>
        );
      })}
    </div>
  );
};

const Notes = ({ selectedUser }) => {
  const notes = selectedUser?.receivedNotes ? selectedUser?.receivedNotes : [];
  const [noteEdit, setEdit] = useState(false);
  const handleMouseHover = () => {
    setEdit(!noteEdit);
  };
  return (
    <div className="notes">
      {notes?.length ? (
        notes.map((note, index) => {
          return (
            <div
              onMouseEnter={handleMouseHover}
              onMouseLeave={handleMouseHover}
              className="note"
              key={index}
              onClick={() =>
                ModalService.show("note", {
                  userId: selectedUser.id,
                  noteId: note.id,
                  text: note.text,
                  type: "edit"
                })
              }
            >
              <div className="date-time">
                <span className="date">
                  {moment(note.createdAt).format("L")}{" "}
                </span>
                <span className="date">
                  {moment(note.updatedAt).format("LT")}
                </span>
              </div>
              <span className="note-title">{note.text}</span>
              {noteEdit && <EditIcon className="edit-note" />}
            </div>
          );
        })
      ) : (
        <span className="no-notes">No notes!</span>
      )}
    </div>
  );
};

const UserContactInformation = ({ selectedUser }) => {
  const userInfo = [
    {
      title: "first name",
      value: selectedUser?.firstName
    },
    {
      title: "last name",
      value: selectedUser?.lastName
    },
    {
      title: "email",
      value: selectedUser?.email
    },
    {
      title: "phone number",
      value: selectedUser?.phoneNumber
    },
    {
      title: "address",
      value: selectedUser?.driverLicenseAddress?.address
        ? selectedUser?.driverLicenseAddress?.address
        : selectedUser?.address?.address
    },
    {
      title: "city",
      value: selectedUser?.driverLicenseAddress?.city
        ? selectedUser?.driverLicenseAddress?.city
        : selectedUser?.address?.city
    },
    {
      title: "province/state",
      value: selectedUser?.driverLicenseAddress?.province
        ? selectedUser?.driverLicenseAddress?.province
        : selectedUser?.address?.province
    },
    {
      title: "postal code",
      value: selectedUser?.driverLicenseAddress?.postalCode
        ? selectedUser?.driverLicenseAddress?.postalCode
        : selectedUser?.address?.postalCode
    },
    {
      title: "country",
      value: selectedUser?.driverLicenseAddress?.country
        ? selectedUser?.driverLicenseAddress?.country
        : selectedUser?.address?.country
    },
    {
      title: "date of birth",
      value: selectedUser?.driverLicenseDateOfBirth
    },
    {
      title: "gender",
      value: selectedUser?.gender
    }
  ];

  return (
    <div className="block-wrapper information-columns">
      {userInfo.map(i => {
        return (
          <div className="data-block" key={i.title}>
            <span className="data-caption">{i.title}</span>
            <span className="data">{i.value || "—"}</span>
          </div>
        );
      })}
    </div>
  );
};

const Verifications = ({ selectedUser }) => {
  const licenseStatus = selectedUser?.licenceVerificationStatus;
  const licenseVerified =
    licenseStatus === "Verified" || licenseStatus === "verified";
  const verifications = [
    {
      title: "email",
      value: selectedUser?.isEmailVerified
    },
    {
      title: "phone",
      value: selectedUser?.isPhoneVerified
    },
    {
      title: "license",
      value: licenseStatus,
      verified: licenseVerified,
      href: selectedUser?.matiDashboardUrl
    }
  ];
  return (
    <div className="block-wrapper verification-wrapper">
      {verifications.map(v => {
        return v.title === "license" ? (
          <div className="verification" key={v.title}>
            <span className="verification-caption data">
              <img
                src={v.verified ? group : processing}
                alt="verification status"
                className="verification-image"
              />
              {v.href ? (
                <a href={v.href} target={"_blank"} rel="noopener noreferrer" className="photo-button">
                  LICENSE
                </a>
              ) : (
                "LICENSE"
              )}
            </span>
            <span className="verification-status">{v.value || "Not verified"}</span>
          </div>
        ) : (
          <div className="verification" key={v.title}>
            <span className="verification-caption data">
              <img
                src={v.value ? group : processing}
                alt="verification status"
                className="verification-image"
              />
              {v.title === "license" && v.value === "verified" && v.href ? (
                <a href={v.href} target={"_blank"} className="photo-button">
                  LICENSE
                </a>
              ) : (
                v.title
              )}
            </span>
            <span className="verification-status">
              {v.value ? "Verified" : "Not Verified"}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const InformationScreen = ({ selectedUser, verifyEmail }) => {
  const id = selectedUser ? selectedUser?.id : "";
  return (
    <div className="profile-information-wrapper">
      <div className="profile-notes-block">
        <div className="profile-block">
          <span className="block-caption">
            Profile
            <Link
              className="edit-link"
              to={`/members/profile/${id}/edit/Profile Information`}
            >
              <Button
                title="Edit"
                color="green"
                icon="edit"
                iconPosition="left"
                type="transparent"
                style={{
                  fontSize: "0.8vw",
                  textTransform: "uppercase",
                  paddingRight: "5vw"
                }}
                onClick={() => {}}
              />
            </Link>
          </span>
          <div className="block-wrapper profile-wrapper">
            <div className="profile-photo">
              <img
                src={
                  selectedUser?.avatar
                    ? selectedUser.avatar.imageUrl
                    : "https://i.ya-webdesign.com/images/teacher-clip-filipino-3.png"
                }
                alt="profile "
                className="photo"
              />
              {/*<button className="delete-photo">*/}
              {/*  <img src={trash} alt="delete" className="delete-icon" />*/}
              {/*</button>*/}
            </div>
            <div className="profile-data">
              <div className="age-notifications">
                {selectedUser?.driverLicenseDateOfBirth && (
                  <div className="data-block age">
                    <span className="data-caption age">AGE</span>
                    <span className="data age">
                      {moment().diff(
                        selectedUser.driverLicenseDateOfBirth,
                        "years",
                        false
                      )}
                    </span>
                  </div>
                )}
                {selectedUser?.driverLicenseDateOfBirth && (
                  <div className="data-block age">
                    <span className="data-caption age">DATE OF BIRTH</span>
                    <span className="data age">
                      {selectedUser.driverLicenseDateOfBirth}
                    </span>
                  </div>
                )}
                {selectedUser?.gender && (
                  <div className="data-block age">
                    <span className="data-caption age">GENDER</span>
                    <span className="data age">{selectedUser.gender}</span>
                  </div>
                )}
                <div className="data-block">
                  <span className="data-caption">NOTIFICATIONS</span>
                  <Notifications selectedUser={selectedUser} />
                </div>
              </div>
              {selectedUser?.about ? (
                <div className="data-block">
                  <span className="data-caption">BIO</span>
                  <span className="data">
                    {selectedUser?.about ? selectedUser.about : "-"}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="notes-block">
          <span className="block-caption">Notes</span>
          <div className="block-wrapper notes-wrapper">
            <Notes selectedUser={selectedUser} />
            <Button
              title="Add Note"
              color="green"
              type="transparent"
              icon="add"
              iconPosition="left"
              style={{
                width: "7.1vw",
                fontSize: "0.8vw",
                textTransform: "uppercase",
                padding: 0
              }}
              onClick={() =>
                ModalService.show("note", { id: selectedUser.id, type: "add" })
              }
            />
          </div>
        </div>
      </div>
      <div className="contact-information-verification-payments-block">
        <div className="contact-information-block">
          <span className="block-caption">
            Contact Information
            <Link
              className="edit-link"
              to={`/members/profile/${id}/edit/Contact Information`}
            >
              <Button
                title="Edit"
                color="green"
                icon="edit"
                iconPosition="left"
                type="transparent"
                style={{
                  fontSize: "0.8vw",
                  textTransform: "uppercase",
                  padding: 0
                }}
                onClick={() => {}}
              />
            </Link>
          </span>
          <UserContactInformation selectedUser={selectedUser} />
          <Button
            title="resend verification email"
            color="green"
            icon="resendEmail"
            iconPosition="left"
            type="filled"
            style={{
              width: "auto",
              fontSize: "0.8vw",
              textTransform: "uppercase",
              padding: "0 1vw",
              margin: "1vw 0"
            }}
            onClick={() => verifyEmail({ id })}
          />
        </div>
        <div className="verification-payments-block">
          <div className="verification-block">
            <span className="block-caption">Verifications</span>
            <Verifications selectedUser={selectedUser} />
          </div>

          {selectedUser?.stripeCustomerLink && (
            <div className="payments-block">
              <span className="block-caption">
                Payments
                {/*<Link
                  to={`/members/profile/stripe/${id}`}
                  className="edit-link"
                >
                  <Button
                    title="Edit"
                    color="green"
                    icon="edit"
                    iconPosition="left"
                    type="transparent"
                    style={{
                      fontSize: "0.8vw",
                      textTransform: "uppercase",
                      padding: 0
                    }}
                    onClick={() => {}}
                  />
                </Link>*/}
              </span>
              <div className="block-wrapper payment-wrapper">
                <a
                  href={selectedUser.stripeCustomerLink}
                  className="link"
                  target={"_blank"}
                >
                  <Button
                    title="STRIPE PROFILE"
                    type="transparent"
                    color="green"
                    style={{
                      fontSize: "0.8vw",
                      textTransform: "uppercase",
                      width: "11vw"
                    }}
                  />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InformationScreen;
