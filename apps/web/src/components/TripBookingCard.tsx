import { Link } from 'react-router-dom';
import type { BookingDto } from '../api/bookings';
import {
  coverUri,
  formatTripDates,
  getTripCardPrimaryAction,
  getTripCardStatus,
  listingTitle,
  statusLabel,
} from '../utils/trips';

type Props = {
  booking: BookingDto;
  isHost: boolean;
  to: string;
  showPrimaryAction?: boolean;
};

export default function TripBookingCard({
  booking,
  isHost,
  to,
  showPrimaryAction = true,
}: Props) {
  const cover = coverUri(booking);
  const cardStatus = getTripCardStatus(booking);
  const action = showPrimaryAction
    ? getTripCardPrimaryAction(cardStatus.key, { isHost, booking })
    : { type: null };

  const actionLabel =
    action.type === 'check_in'
      ? 'Check in'
      : action.type === 'checkout'
        ? 'Check out'
        : action.type === 'extend'
          ? 'Extend trip'
          : null;

  const actionTo =
    action.type === 'check_in'
      ? `${to}/check-in`
      : action.type === 'checkout'
        ? `${to}/check-out`
        : to;

  return (
    <li>
      <Link to={to} className="trips-card">
        <div className="trips-card-top">
          {cover ? (
            <img src={cover} alt="" className="trips-card-cover" />
          ) : (
            <div className="trips-card-cover" aria-hidden />
          )}
          <div className="trips-card-body">
            <span className="trips-card-title">{listingTitle(booking)}</span>
            <p className="trips-card-meta">{formatTripDates(booking)}</p>
            <span className="trips-card-status">
              {cardStatus.label || statusLabel(booking.status)}
            </span>
          </div>
        </div>
      </Link>
      {actionLabel ? (
        <div className="trips-card-actions">
          <Link to={actionTo} className="trips-btn trips-btn--primary">
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </li>
  );
}
