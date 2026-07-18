import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import SiteFooter from './components/SiteFooter';
import AccountSettingsPage from './pages/AccountSettingsPage';
import CheckoutPage from './pages/CheckoutPage';
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

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
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
        <Route
          path="/profile/list-your-ride"
          element={<ListYourRidePage />}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SiteFooter />
    </AuthProvider>
  );
}
