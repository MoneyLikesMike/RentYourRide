import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import './styles/auth.css';
import './styles/home.css';
import './styles/fyc.css';
import './styles/listing.css';
import './styles/footer.css';
import './styles/checkout.css';
import './styles/profile.css';
import './styles/payment-information.css';
import './styles/add-payment-modal.css';
import './styles/list-your-ride.css';
import './styles/referrals.css';
import './styles/messages.css';
import './styles/content-pages.css';
import './styles/search-time-picker.css';
import './styles/notifications.css';
import './styles/trips.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
