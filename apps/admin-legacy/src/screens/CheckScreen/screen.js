import React, { useEffect } from "react";
import "./index.scss";
import Tabs from "../../components/Tabs";
import ModalService from "../../services/modals";
import { Link } from "react-router-dom";
import ImageGallery from "react-image-gallery";
import moment from "moment";

const images = (type, trip) => {
  if (trip?.[type]?.conditionPhotos?.length) {
    return trip[type].conditionPhotos.map(i => {
      return {
        original: i.photo,
        thumbnail: i.photo,
        description: moment(i.createdAt).format("MMMM Do YYYY, h:mm:ss a"),
        originalTitle: moment(i.createdAt).format("MMMM Do YYYY, h:mm:ss a"),
        thumbnailTitle: moment(i.createdAt).format("MMMM Do YYYY, h:mm:ss a"),
        thumbnailLabel: moment(i.createdAt).format("MMMM Do YYYY, h:mm:ss a")
      };
    });
  }
};

const RentalAgreementWrapper = ({ params }) => {
  const { trip } = params;

  const extras = trip?.extras?.map(e => {
    return {
      title: e.name,
      value: `${e.price / 100} $`
    };
  });

  const getDays = () => {
    const start = moment(trip?.requestedStartDate);
    const end = moment(trip?.requestedEndDate);
    return Math.abs(start.diff(end, "days")) + 1;
  };

  const rentalAgreement = [
    {
      title: "Pricing",
      arr: [
        {
          title: "Kilometres Included In The Trip",
          value: trip?.kilometersIncludedPerDay
            ? `${trip?.kilometersIncludedPerDay} km`
            : false,
          img: ""
        },
        {
          title: "Days",
          value: trip ? getDays() : false,
          img: ""
        },
        {
          title: "Price Per Day",
          value: trip?.pricePerDay ? `${trip?.pricePerDay / 100} $` : false,
          img: ""
        },
        {
          title: "Delivery Price",
          value: trip?.deliveryFee ? `${trip?.deliveryFee / 100} $` : false,
          img: ""
        },
        {
          title: "Weekly Discount",
          value: trip?.weeklyDiscount ? `${trip?.weeklyDiscount} %` : false,
          img: ""
        },
        {
          title: "Monthly Discount",
          value: trip?.monthlyDiscount ? `${trip?.monthlyDiscount} %` : false,
          img: ""
        },
        {
          title: "Trip Fee",
          value: trip?.tripFee ? `${trip?.tripFee / 100} $` : false,
          img: ""
        },
        {
          title: "Host Earnings",
          value: trip?.hostEarnings ? `${trip?.hostEarnings / 100} $` : false,
          img: ""
        }
      ]
    },
    {
      title: "Extras",
      arr: extras
    }
  ];
  return (
    <div className="rental-agreement-wrapper">
      <div className="date-wrapper">
        <div className="start">
          Start:{" "}
          <span className="date">
            {trip &&
              moment(trip.requestedStartDate).format("MMMM Do YYYY, h:mm:ss a")}
          </span>
        </div>
        <div className="end">
          End:{" "}
          <span className="date">
            {trip &&
              moment(trip.requestedEndDate).format("MMMM Do YYYY, h:mm:ss a")}
          </span>
        </div>
      </div>
      <div className="border" />
      <div className="price-wrapper">
        {rentalAgreement.map(c => (
          <div className="pricing" key={c.title}>
            <div className="pricing-title">{c.title}</div>
            {!c?.arr?.length ? (
              <div className="no-data">No {c.title}</div>
            ) : (
              false
            )}
            {c?.arr?.map(
              p =>
                p?.value && (
                  <div className="price-row" key={p.title}>
                    <span className="price-title">{p.title}:</span>
                    <span className="price-value">{p.value}</span>
                  </div>
                )
            )}
          </div>
        ))}
      </div>
      <div className="border" />
      <div className="total">
        <span className="total-title">Total Price:</span>
        <span className="total-price"> {trip?.subtotal / 100} $</span>
      </div>
    </div>
  );
};

const CheckWrapper = ({ params, title }) => {
  const { trip } = params;
  return (
    <div className="check-wrapper">
      <div className="check-description">
        <div className="profile-wrapper">
          <Link
            onClick={() => ModalService.close()}
            to={`/members/profile/info/${trip?.hostId}`}
            className="profile"
          >
            <img
              src={
                "https://i.ya-webdesign.com/images/teacher-clip-filipino-3.png"
              }
              alt="avatar"
              className="avatar"
            />
            <div className="name-status">
              <span className="name">{trip?.hostFullName}</span>
              <span className="data-caption">
                {title === "Check in" && trip?.hostCheckIn
                  ? trip?.hostCheckIn.role
                  : null}
                {title === "Check out" && trip?.hostCheckOut
                  ? trip?.hostCheckOut.role
                  : null}
              </span>
            </div>
          </Link>
          <div className="description-wrapper">
            <span className="data-caption">DAMAGE NOTES</span>
            <span className="data">
              {title === "Check in" && trip?.hostCheckIn
                ? trip?.hostCheckIn?.damageNotes
                : null}
              {title === "Check out" && trip?.hostCheckOut
                ? trip?.hostCheckOut?.damageNotes
                : null}
            </span>
          </div>
        </div>
        {title === "Check in" && trip?.hostCheckIn?.conditionPhotos?.length ? (
          <ImageGallery items={images("hostCheckIn", trip)} />
        ) : null}
        {title === "Check out" &&
        trip?.hostCheckOut?.conditionPhotos?.length ? (
          <ImageGallery items={images("hostCheckOut", trip)} />
        ) : null}
        {title === "Check in" && !trip?.hostCheckIn ? (
          <span className="no-members">No photos</span>
        ) : null}
        {title === "Check out" && !trip?.hostCheckOut ? (
          <span className="no-members">No photos</span>
        ) : null}
      </div>
      <div className="requested-wrapper">
        <div className="requested-option">
          <div className="requested">
            <span className="data-caption">REQUESTED START</span>
            <span className="data">
              <span className="date">
                {trip && moment(trip.requestedStartDate).format("l")}
              </span>
              <span className="date">
                {trip && moment(trip.requestedStartDate).format("LT")}
              </span>
            </span>
          </div>
          <div className="border" />
          <div className="requested">
            <span className="data-caption">REQUESTED END</span>
            <span className="data">
              <span className="date">
                {trip && moment(trip.requestedEndDate).format("l")}
              </span>
              <span className="date">
                {trip && moment(trip.requestedEndDate).format("LT")}
              </span>
            </span>
          </div>
        </div>
        <div className="border-green" />
      </div>
      <div className="check-description">
        <div className="profile-wrapper">
          <Link
            onClick={() => ModalService.close()}
            to={`/members/profile/info/${trip?.guestId}`}
            className="profile"
          >
            <img
              src={
                "https://i.ya-webdesign.com/images/teacher-clip-filipino-3.png"
              }
              alt="avatar"
              className="avatar"
            />
            <div className="name-status">
              <span className="name">{trip?.guestFullName}</span>
              <span className="data-caption">
                {title === "Check in" && trip?.guestCheckIn
                  ? trip?.guestCheckIn.role
                  : null}
                {title === "Check out" && trip?.guestCheckOut
                  ? trip?.guestCheckOut.role
                  : null}
              </span>
            </div>
          </Link>
          <div className="description-wrapper">
            <span className="data-caption">DAMAGE NOTES</span>
            <span className="data">
              {title === "Check in" && trip?.guestCheckIn
                ? trip?.guestCheckIn?.damageNotes
                : null}
              {title === "Check out" && trip?.guestCheckOut
                ? trip?.guestCheckOut?.damageNotes
                : null}
            </span>
          </div>
        </div>
        {title === "Check in" && trip?.guestCheckIn?.conditionPhotos?.length ? (
          <ImageGallery items={images("guestCheckIn", trip)} />
        ) : null}
        {title === "Check out" &&
        trip?.guestCheckOut?.conditionPhotos?.length ? (
          <ImageGallery items={images("guestCheckOut", trip)} />
        ) : null}
        {title === "Check in" && !trip?.guestCheckIn ? (
          <span className="no-members">No photos</span>
        ) : null}
        {title === "Check out" && !trip?.guestCheckOut ? (
          <span className="no-members">No photos</span>
        ) : null}
      </div>
    </div>
  );
};

const tabsByType = {
  checkOut: [
    {
      title: "Rental Agreement",
      screen: RentalAgreementWrapper
    },
    {
      title: "Check in",
      screen: CheckWrapper
    },
    {
      title: "Check out",
      screen: CheckWrapper
    }
  ],
  checkIn: [
    {
      title: "Rental Agreement",
      screen: RentalAgreementWrapper
    },
    {
      title: "Check in",
      screen: CheckWrapper
    }
  ],
  rentalAgreement: [
    {
      title: "Rental Agreement",
      screen: RentalAgreementWrapper
    }
  ]
};

const CheckScreen = ({ trip, getTrip, params }) => {
  useEffect(() => {
    getTrip({ id: params.id });
  }, []);
  return <Tabs tabs={tabsByType[params.type]} params={{ trip: trip }} />;
};

export default CheckScreen;
