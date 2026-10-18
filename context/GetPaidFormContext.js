import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  buildPayoutSetupBody,
  dobToIso,
  regionCodeFromForm,
} from '../utils/payoutSetupBody';

export { buildPayoutSetupBody, dobToIso, regionCodeFromForm };

const EMPTY = {
  country: 'CA',
  firstName: '',
  lastName: '',
  email: '',
  dob: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  province: '',
  postalCode: '',
  state: '',
  zipCode: '',
  phone: '',
  businessDescription: '',
  currency: 'CAD',
  bankCountry: 'CA',
  transitNumber: '',
  institutionNumber: '',
  accountNumber: '',
  confirmAccountNumber: '',
  routingNumber: '',
};

const GetPaidFormContext = createContext(null);

export function GetPaidFormProvider({ children }) {
  const [values, setValues] = useState(EMPTY);

  const api = useMemo(
    () => ({
      values,
      setValues,
      patch: (partial) => setValues((prev) => ({ ...prev, ...partial })),
      reset: () => setValues(EMPTY),
    }),
    [values],
  );

  return (
    <GetPaidFormContext.Provider value={api}>{children}</GetPaidFormContext.Provider>
  );
}

export function useGetPaidForm() {
  const ctx = useContext(GetPaidFormContext);
  if (!ctx) {
    throw new Error('useGetPaidForm must be used within GetPaidFormProvider');
  }
  return ctx;
}
