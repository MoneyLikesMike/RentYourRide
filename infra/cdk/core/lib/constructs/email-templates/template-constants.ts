import { readFileSync } from "fs";
const fsPrefix = __dirname;

export const YourTripExtensionIsConfirmedGuest = readFileSync(fsPrefix+'/html/ApproveBookingExtensionTemplate/{{Host.FirstName}} Confirmed Your Trip Extension Request ✅.html');
export const YouConfirmedATripExtension = readFileSync(fsPrefix+'/html/ApproveBookingExtensionTemplate/You Have Confirmed A Trip Extension ✅.html');
export const YouRequestedATripExtension = readFileSync(fsPrefix+'/html/CreateBookingExtensionTemplate/You Sent A Trip Extension Request.html');
export const TripExtensionRequestHost = readFileSync(fsPrefix+'/html/CreateBookingExtensionTemplate/{{Renter.FirstName}} Would Like To Extend Their Trip With Your Ride 😊.html')
export const YourTripExtensionRequestWasDenied = readFileSync(fsPrefix+'/html/DenyBookingExtensionTemplate/Your Trip Extension Request Was Denied.html');
export const YouHaveDeniedATripExtenison = readFileSync(fsPrefix+'/html/DenyBookingExtensionTemplate/You Denied A Trip Extension Request.html');

export const YoureCheckedInGuest = readFileSync(fsPrefix+"/html/CheckInBookingTemplate/You're Checked In 😀.html");
export const GuestHasCheckedInUsingYourRide = readFileSync(fsPrefix+'/html/CheckInBookingTemplate/{{Renter.FirstName}} Has Checked In Using Your Ride👍.html');

export const YoureCheckedOutGuest = readFileSync(fsPrefix+"/html/CheckOutBookingTemplate/You're Checked Out 👋.html");
export const GuestCheckedOutOfYourRide = readFileSync(fsPrefix+'/html/CheckOutBookingTemplate/{{Renter.FirstName}} Has Checked Out.html')

export const WriteAReviewGuest = readFileSync(fsPrefix+"/html/CheckOutReviewReminderTemplate/Write A Review For {{Host.FirstName}}.html");
export const WriteAReviewForGuestName = readFileSync(fsPrefix+'/html/CheckOutReviewReminderTemplate/Write A Review For {{Renter.FirstName}}.html')


export const YouSentAReservationRequest = readFileSync(fsPrefix+"/html/CreateBookingRequestTemplate/You Sent A Booking Request.html");
export const BookingRequest = readFileSync(fsPrefix+'/html/CreateBookingRequestTemplate/You Have A Booking Request 😊.html')


export const BookingRequestConfirmedGuest = readFileSync(fsPrefix+"/html/ApproveBookingRequestTemplate/{{Host.FirstName}} Confirmed Your Booking Request ✅.html");
export const ConfirmedBookingRequestHost = readFileSync(fsPrefix+'/html/ApproveBookingRequestTemplate/You Have Confirmed Booking Request ✅.html');

export const YourBookingRequestWasDenied = readFileSync(fsPrefix+"/html/DenyBookingRequestTemplate/Your Booking Request Was Denied ⛔.html");
export const YouDeniedABookingRequest = readFileSync(fsPrefix+'/html/DenyBookingRequestTemplate/You Denied A Booking Request ⛔.html');

export const Welcome = readFileSync(fsPrefix+"/html/EmailVerifiedTemplate/Welcome to Rent Your Ride! {{User.FirstName}}.html");
export const LicenseApproved = readFileSync(fsPrefix+'/html/LicenseApprovedTemplate/We Approved Your License! ✅.html');
export const LicenseDenied = readFileSync(fsPrefix+'/html/LicenseDeniedTemplate/Your License Was Denied! ⛔.html')
export const ListingApproved = readFileSync(fsPrefix+'/html/ListingApprovedTemplate/We Approved Your Listing! ✅.html')
export const ListingDenied = readFileSync(fsPrefix+'/html/ListingDeniedTemplate/Your Listing Was Denied! ⛔.html')
export const NewMessageFromHost = readFileSync(fsPrefix+'/html/NewMessageFromHostTemplate/New Message From {{Host.FirstName}}.html')
export const NewMessageFromGuest = readFileSync(fsPrefix+'/html/NewMessageFromRenterTemplate/New Message From {{Renter.FirstName}}.html');

export const AccountActivityNewPaymentMethod = readFileSync(fsPrefix+'/html/NewPaymentMethodTemplate/Account Activity_ New Payment Method.html')

export const YourTripIsBeginningSoonGuest = readFileSync(fsPrefix+'/html/TripIsBeginningSoonTemplate/Your Trip with {{Host.FirstName}} is Beginning Soon 👀.html');
export const TripBeginningSoonHost = readFileSync(fsPrefix+'/html/TripIsBeginningSoonTemplate/Your Trip with {{Renter.FirstName}} is Beginning Soon 👀.html')

export const YourTripIsEndingSoonGuest = readFileSync(fsPrefix+'/html/TripIsEndingSoonTemplate/Your Trip with {{Host.FirstName}} is Ending Soon 👀.html');
export const YourTripIsEndingSoonHost = readFileSync(fsPrefix+'/html/TripIsEndingSoonTemplate/Your Trip with {{Renter.FirstName}} is Ending Soon 👀.html');

export const VerifyEmail = readFileSync(fsPrefix+'/html/VerifyEmailTemplate/Please Verify Your Email 📩.html');
export const PasswordRecovery = readFileSync(fsPrefix+'/html/VerifyPasswordRecoveryTemplate/Verify Password Recovery.html');