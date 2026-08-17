import React, { useEffect } from "react";
import "./index.scss";
import Button from "../../components/Button";
import moment from "moment";
import carFeatures from "../../constants/carFeatures";
import { Link } from "react-router-dom";
import ImageGallery from "react-image-gallery";
import { images } from "../../assets/images/index";
const { confirmStatus } = images;

const CarInformationView = ({ selectedRide }) => {
  const carInformation = [
    [
      {
        title: "About Ride",
        arr: [
          {
            title: "country",
            value: selectedRide?.address?.country,
            isValue: selectedRide?.address?.country
          },
          {
            title: "make",
            value: selectedRide?.make,
            isValue: selectedRide?.make
          },
          {
            title: "odometer",
            value: selectedRide?.odometer,
            isValue: selectedRide?.odometer
          },
          {
            title: "style (optional)",
            value: selectedRide?.style,
            isValue: selectedRide?.style
          },
          {
            title: "address",
            value: selectedRide?.address?.address,
            isValue: selectedRide?.address?.address
          },
          {
            title: "model",
            value: selectedRide?.model,
            isValue: selectedRide?.model
          },
          {
            title: "trim",
            value: selectedRide?.trim,
            isValue: selectedRide?.trim
          },
          {
            title: "fuel type",
            value: selectedRide?.fuelType,
            isValue: selectedRide?.fuelType
          },
          {
            title: "city",
            value: selectedRide?.address?.city,
            isValue: selectedRide?.address?.city
          },
          {
            title: "year",
            value: selectedRide?.year,
            isValue: selectedRide?.year
          },
          {
            title: "color",
            value: selectedRide?.color,
            isValue: selectedRide?.color
          },
          {
            title: "license plate",
            value: selectedRide?.licensePlateNumber,
            isValue: selectedRide?.licensePlateNumber
          },
          {
            title: "salvage title",
            text: "My car has never had a salvage title",
            value: !selectedRide?.isSalvageTitleExists,
            isValue: !selectedRide?.isSalvageTitleExists,

            img: confirmStatus
          },
          {
            title: "VIN",
            value: selectedRide?.VIN,
            isValue: selectedRide?.VIN
          },
          {
            title: "vehicle transmission",
            value: selectedRide?.transmissionType,
            isValue: selectedRide?.transmissionType
          },
          {
            title: "province/state of license plate",
            value: selectedRide?.licensePlateState,
            isValue: selectedRide?.licensePlateState
          }
        ]
      }
    ],
    [
      {
        title: "Pricing",
        arr: [
          {
            title: "daily price",
            value: `$ ${selectedRide?.dailyPrice / 100}`,
            isValue: selectedRide?.dailyPrice
          },
          {
            title: "delivery price",
            value: `$ ${selectedRide?.deliveryPrice / 100}`,
            isValue: selectedRide?.deliveryPrice
          },
          {
            title: "price per kilometer over limit",
            value: `$ ${selectedRide?.pricePerKilometerOverLimit / 100}`,
            isValue: selectedRide?.pricePerKilometerOverLimit
          },
          {
            title: "weekly discount",
            value: `${selectedRide?.weeklyDiscount}%`,
            isValue: selectedRide?.weeklyDiscount
          },
          {
            title: "monthly discount",
            value: `${selectedRide?.monthlyDiscount}%`,
            isValue: selectedRide?.monthlyDiscount
          }
        ]
      },
      {
        title: "Extras",
        arr: selectedRide?.extras
      },
      {
        title: "Availability and restrictions",
        arr: [
          {
            title: "advanced notice",
            value: `${selectedRide?.notionPeriodHours}h`,
            isValue: selectedRide?.notionPeriodHours
          },
          {
            title: "longest possible trip",
            value: `${selectedRide?.longestPossibleTrip}days`,
            isValue: selectedRide?.longestPossibleTrip
          },
          {
            title: "shortest possible trip",
            value: `${selectedRide?.shortestPossibleTrip}days`,
            isValue: selectedRide?.shortestPossibleTrip
          },
          {
            title: "daily kilometers restriction",
            value: `${selectedRide?.kilometersLimit}kms`,
            isValue: selectedRide?.kilometersLimit
          }
        ]
      }
    ]
  ];
  return carInformation.map((carInfo, index) => (
    <div className=" information-columns" key={index}>
      {carInfo.map(d => {
        return d.title === "Extras" ? (
          <div className="information-column more" key={d.title}>
            <span className="block-caption ">Extras</span>
            {d.arr.map(e => {
              return (
                <div className="data-block more-details" key={e.id}>
                  <span className="data-caption">{e.name}</span>
                  <span className="data">$ {e.price / 100}</span>
                </div>
              );
            })}
            {!selectedRide?.extras?.length && (
              <div className="no-extras">No extras</div>
            )}
          </div>
        ) : (
          <div
            className={
              d.title === "Pricing" ||
              d.title === "Availability and restrictions"
                ? "information-column more"
                : "information-column"
            }
            key={d.title}
          >
            <span className="block-caption ">{d.title}</span>
            {d.arr.map(item =>
              item.title === "salvage title" && item.value ? (
                <div className="data-block salvage" key={item.title}>
                  <img
                    src={confirmStatus}
                    alt="no salvage title"
                    className="salvage-image"
                  />
                  <span className="salvage-text">
                    My car has never had a salvage title
                  </span>
                </div>
              ) : item.isValue && d.title !== "Extras" ? (
                <div
                  className={
                    d.title === "Pricing" ||
                    d.title === "Availability and restrictions"
                      ? "data-block more-details"
                      : "data-block"
                  }
                  key={item.title}
                >
                  <span className="data-caption">{item.title}</span>
                  <span className="data">
                    {item.title === "color" && item.value !== "other" && (
                      <div
                        className="color-view"
                        style={{ background: item.value }}
                      />
                    )}
                    {item.value ? item.value : null}
                  </span>
                </div>
              ) : null
            )}{" "}
          </div>
        );
      })}
    </div>
  ));
};

const CarScreen = ({
  selectedRide,
  rideVerify,
  rideUnverify,
  rideDeactivate,
  rideActivate,
  getRide,
  match
}) => {
  const host = selectedRide ? selectedRide.host : {};
  const id = match.params.id;

  useEffect(() => {
    getRide({ id: id });
    const url = selectedRide?.images?.length
      ? selectedRide.images[0].imageUrl
      : null;
    if (url) {
    }
  }, []);

  const getImages = () => {
    if (selectedRide?.images?.length) {
      return selectedRide.images.map(i => {
        return {
          original: i.imageUrl,
          thumbnail: i.imageUrl
        };
      });
    }
  };
  let route = `Members / ${
    selectedRide && host ? host.fullName || host.firstName : ""
  } / ${selectedRide?.make ? selectedRide?.make : ""} ${
    selectedRide?.model ? selectedRide?.model : ""
  } ${selectedRide?.year ? selectedRide?.year : ""}`;

  const filtrateArray = array => {
    if (array && array.length) {
      const arr = array.map(el => el.name);
      return carFeatures.filter(feature => {
        return arr.find(el => {
          return el === feature.name;
        });
      });
    }
    return [];
  };

  return (
    <div className="car-wrapper">
      <div className="car-header">
        <div className="car-navigation-route">
          <div className="car-name">
            <span className="car-name-text">
              {selectedRide?.make ? selectedRide?.make : null}
            </span>
            <span className="car-name-text">
              {selectedRide?.model ? selectedRide?.model : null}
            </span>
            <span className="car-name-text">
              {selectedRide?.year ? selectedRide?.year : null}
            </span>
          </div>
          <span className="navigation-route">{route}</span>
        </div>
        <div className="functional">
          {selectedRide?.isActivated && (
            <Button
              title="Deactivate"
              color="green"
              type="outline"
              style={{
                fontSize: ".8vw",
                padding: "0",
                width: "10vw",
                textTransform: "uppercase",
                marginRight: " 1vw"
              }}
              onClick={() => rideDeactivate({ id: selectedRide.id })}
            />
          )}
          {!selectedRide?.isActivated && (
            <Button
              title="Activate"
              color="green"
              type="outline"
              style={{
                fontSize: ".8vw",
                padding: "0",
                width: "10vw",
                textTransform: "uppercase",
                marginRight: " 1vw"
              }}
              onClick={() => rideActivate({ id: selectedRide.id })}
            />
          )}
          {selectedRide?.isVerified && (
            <Button
              title="Disable"
              color="green"
              type="outline"
              style={{
                fontSize: ".8vw",
                padding: "0",
                width: "10vw",
                textTransform: "uppercase"
              }}
              onClick={() => rideUnverify({ id: selectedRide.id })}
            />
          )}
          {!selectedRide?.isVerified && (
            <Button
              title="Approve"
              color="green"
              type="filled"
              icon="done"
              iconPosition="left"
              style={{
                fontSize: ".8vw",
                padding: "0",
                width: "10vw",
                textTransform: "uppercase"
              }}
              onClick={() => rideVerify({ id: selectedRide.id })}
            />
          )}
        </div>
      </div>
      <div className="contact-information-block block-wrapper">
        {selectedRide && <CarInformationView selectedRide={selectedRide} />}
        {selectedRide?.images?.length ? (
          <ImageGallery items={getImages()} thumbnailPosition={"right"} />
        ) : (
          <div className="no-car-photo">No car photos</div>
        )}
        <div className="divider" />
        <div className="description-features-wrapper">
          <div className="features-description">
            <div className="features-wrapper">
              <span className="block-caption mar">Describe your ride</span>
              <span className="data-caption">CAR FEATURES</span>
              {selectedRide?.carFeatures ? (
                <div className="features">
                  {selectedRide &&
                    filtrateArray(selectedRide.carFeatures).map((f, index) => (
                      <div className="feature" key={index}>
                        <img
                          src={f.sources.selected}
                          alt="feature"
                          className="feature-image"
                        />
                        <span className="feature-title">{f.title}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="features no-car-photo">No car features</div>
              )}
            </div>
            <div className="description-wrapper">
              <span className="block-caption mar">About driver</span>
              <div className="about-driver">
                <div className="driver-information">
                  {selectedRide && host && (
                    <Link to={`/members/profile/info/${host.id}`}>
                      <img
                        src={
                          selectedRide?.host?.avatar?.imageUrl
                            ? selectedRide?.host?.avatar?.imageUrl
                            : "https://i.ya-webdesign.com/images/teacher-clip-filipino-3.png"
                        }
                        alt=""
                        className="driver-avatar"
                      />
                    </Link>
                  )}
                  <div className="driver-details">
                    {selectedRide && host && (
                      <Link
                        to={`/members/profile/info/${host.id}`}
                        className="fullname-link"
                      >
                        <span className="name">
                          {selectedRide && host?.fullName
                            ? host?.fullName
                            : host?.firstName && host?.lastName
                            ? `${host?.firstName} ${host?.lastName}`
                            : null}
                        </span>
                      </Link>
                    )}
                    <span className="location">
                      {selectedRide && host?.driverLicenseAddress?.address
                        ? host?.driverLicenseAddress?.address
                        : selectedRide && host?.address?.address
                        ? host?.address?.address
                        : null}
                    </span>
                    <span className="date">
                      {selectedRide && host?.createdAt
                        ? `Joined in ${moment(host?.createdAt).format("ll")}`
                        : null}
                    </span>
                  </div>
                </div>
                {selectedRide && host?.about ? (
                  <span className="bio">
                    {selectedRide && host?.about ? host?.about : "-"}
                  </span>
                ) : null}
              </div>
              {selectedRide?.description ? (
                <span className="data-caption">VEHICLE DESCRIPTION</span>
              ) : null}
              {selectedRide?.description ? (
                <span className="description">
                  {selectedRide?.description ? selectedRide?.description : null}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarScreen;
