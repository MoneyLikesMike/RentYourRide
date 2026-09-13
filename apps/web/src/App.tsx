import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import type { AuthLocationState } from './auth/authModal';
import { AuthProvider } from './auth/AuthContext';
import CrispChat from './components/CrispChat';
import ScrollToTop from './components/ScrollToTop';
import SiteFooter from './components/SiteFooter';
import AccountSettingsPage from './pages/AccountSettingsPage';
import CheckoutPage from './pages/CheckoutPage';
import DiditCallbackPage from './pages/DiditCallbackPage';
import EditProfilePage from './pages/EditProfilePage';
import FindYourCarPage from './pages/FindYourCarPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import ListingDetailPage from './pages/ListingDetailPage';
import ListYourRidePage from './pages/ListYourRidePage';
import LoginPage from './pages/LoginPage';
import PaymentInformationPage from './pages/PaymentInformationPage';
import ProfileOverviewPage from './pages/ProfileOverviewPage';
import ReferralsCreditsPage from './pages/ReferralsCreditsPage';
import SignupPage from './pages/SignupPage';
import YourRidesPage from './pages/YourRidesPage';
import FavouritesPage from './pages/FavouritesPage';
import MessagesPage from './pages/MessagesPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import DownloadPage from './pages/DownloadPage';
import HowItWorksPage from './pages/HowItWorksPage';
import InsurancePage from './pages/InsurancePage';
import LearnPage from './pages/LearnPage';
import ArticlePage from './pages/ArticlePage';
import NewsPage from './pages/NewsPage';
import StudioPage from './pages/StudioPage';
import TermsConditionsPage from './pages/TermsConditionsPage';
import NotificationsPage from './pages/NotificationsPage';
import TripsPage from './pages/TripsPage';
import {
  TripsActivePage,
  TripsAgreementsPage,
  TripsHistoryPage,
  TripsRequestsPage,
} from './pages/TripsSectionPages';
import TripsPayoutsPage from './pages/TripsPayoutsPage';
import TripBookingDetailPage from './pages/TripBookingDetailPage';
import {
  TripCheckInPage,
  TripCheckOutPage,
} from './pages/TripCheckInOutPage';
import { MessagingUnreadProvider } from './auth/MessagingUnreadContext';

function AppRoutes() {
  const location = useLocation();
  const state = location.state as AuthLocationState | null;
  const background = state?.backgroundLocation;
  const isStudio = location.pathname.startsWith('/studio');

  return (
    <>
      <ScrollToTop />
      <Routes location={background ?? location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/download" element={<DownloadPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:slug" element={<ArticlePage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/insurance" element={<InsurancePage />} />
        <Route path="/faq" element={<Navigate to="/insurance" replace />} />
        <Route path="/terms-conditions" element={<TermsConditionsPage />} />
        <Route path="/find-your-car" element={<FindYourCarPage />} />
        <Route
          path="/find-your-car/:listingId"
          element={<ListingDetailPage />}
        />
        <Route
          path="/find-your-car/:listingId/checkout"
          element={<CheckoutPage />}
        />
        <Route path="/profile" element={<Navigate to="/profile/edit" replace />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
        <Route path="/profile/overview" element={<ProfileOverviewPage />} />
        <Route
          path="/profile/contact-information"
          element={<AccountSettingsPage />}
        />
        <Route
          path="/profile/notifications"
          element={<NotificationsPage />}
        />
        <Route path="/profile/trips" element={<TripsPage />} />
        <Route
          path="/profile/trips/requests"
          element={<TripsRequestsPage />}
        />
        <Route path="/profile/trips/active" element={<TripsActivePage />} />
        <Route path="/profile/trips/history" element={<TripsHistoryPage />} />
        <Route
          path="/profile/trips/agreements"
          element={<TripsAgreementsPage />}
        />
        <Route path="/profile/trips/payouts" element={<TripsPayoutsPage />} />
        <Route
          path="/profile/trips/:bookingId/check-in"
          element={<TripCheckInPage />}
        />
        <Route
          path="/profile/trips/:bookingId/check-out"
          element={<TripCheckOutPage />}
        />
        <Route
          path="/profile/trips/:bookingId"
          element={<TripBookingDetailPage />}
        />
        <Route
          path="/profile/account-settings"
          element={<Navigate to="/profile/contact-information" replace />}
        />
        <Route
          path="/profile/payment-information"
          element={<PaymentInformationPage />}
        />
        <Route
          path="/profile/referrals-credits"
          element={<ReferralsCreditsPage />}
        />
        <Route
          path="/profile/referrals-&-credits"
          element={<Navigate to="/profile/referrals-credits" replace />}
        />
        <Route path="/profile/your-rides" element={<YourRidesPage />} />
        <Route path="/profile/favourites" element={<FavouritesPage />} />
        <Route
          path="/profile/favorites"
          element={<Navigate to="/profile/favourites" replace />}
        />
        <Route
          path="/profile/list-your-ride"
          element={<ListYourRidePage />}
        />
        <Route
          path="/profile/edit-ride/:listingId"
          element={<ListYourRidePage />}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/didit/callback" element={<DiditCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {isStudio ? null : <SiteFooter />}
      {background ? (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      ) : null}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MessagingUnreadProvider>
        <CrispChat />
        <AppRoutes />
      </MessagingUnreadProvider>
    </AuthProvider>
  );
}
