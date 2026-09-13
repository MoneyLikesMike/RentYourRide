import {
  isValidPhoneNumber,
  isPossiblePhoneNumber
} from "react-phone-number-input";

export function emailValidation(formatted) {
  if (!formatted) {
    return { email: "Email is required" };
  } else if (
    !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
      formatted
    )
  ) {
    return { email: "Invalid email address" };
  }
}

export function passwordValidation(formatted) {
  if (!formatted) {
    return { password: "Password is required" };
  } else if (formatted.length < 6) {
    return { password: "Password must be at least 6 characters" };
  }
}

export function firstNameValidation(formatted) {
  if (!formatted) {
    return { firstName: `First name is required` };
  } else if (!formatted.length) {
    return { firstName: `Enter first name` };
  }
}

export function lastNameValidation(formatted) {
  if (!formatted) {
    return { lastName: `Last name is required` };
  } else if (!formatted.length) {
    return { lastName: `Enter last name` };
  }
}

export function productDescriptionValidation(formatted) {
  if (!formatted) {
    return { productDescription: `Product description is required` };
  } else if (!formatted.length) {
    return { productDescription: `Enter product description` };
  }
}

export function routingNumberValidation(formatted) {
  if (!formatted) {
    return { routingNumber: `Routing number is required` };
  } else if (!formatted.length) {
    return { routingNumber: `Enter routing number` };
  }
}

export function accountNumberValidation(formatted) {
  if (!formatted) {
    return { accountNumber: `Account number is required` };
  } else if (!formatted.length) {
    return { accountNumber: `Enter account number ` };
  }
}

export function confirmAccountNumberValidation(formatted) {
  if (!formatted) {
    return { confirmAccountNumber: `Confirm account number is required` };
  } else if (!formatted.length) {
    return { confirmAccountNumber: `Enter confirm account number ` };
  }
}

export function addressValidation(formatted) {
  if (!formatted) {
    return { address: `Address is required` };
  } else if (!formatted.length) {
    return { address: `Enter address` };
  }
}

export function addressOneValidation(formatted) {
  if (!formatted) {
    return { addressOne: `Address line 1 is required` };
  } else if (!formatted.length) {
    return { addressOne: `Enter address line 1` };
  }
}

export function addressTwoValidation(formatted) {
  if (!formatted) {
    return { addressTwo: `Address line 2 is required` };
  } else if (!formatted.length) {
    return { addressTwo: `Enter address line 2` };
  }
}

export function cityValidation(formatted) {
  if (!formatted) {
    return { city: `City is required` };
  } else if (!formatted.length) {
    return { city: `Enter city` };
  }
}

export function stateValidation(formatted) {
  if (!formatted) {
    return { state: `State is required` };
  } else if (!formatted.length) {
    return { state: `Enter state` };
  }
}

export function countryValidation(formatted) {
  if (!formatted) {
    return { country: `Country is required` };
  } else if (!formatted.length) {
    return { country: `Enter country` };
  }
}

export function aboutValidation(formatted) {
  if (!formatted) {
    return { about: `About is required` };
  } else if (!formatted.length) {
    return { about: `Enter about` };
  }
}

export function postalCodeValidation(formatted) {
  if (!formatted) {
    return { postalCode: `Postal code is required` };
  } else if (formatted.length < 6) {
    return { postalCode: `Postal code must be at least 6 characters` };
  }
}

export function socialSecurityValidation(formatted) {
  if (!formatted) {
    return { socialSecurity: `Social security number is required` };
  } else if (!formatted.length) {
    return { socialSecurity: `Enter Social security number` };
  }
}

export function phoneValidation(formatted) {
  if (!isValidPhoneNumber(formatted) && !isPossiblePhoneNumber(formatted)) {
    return { phoneNumber: `Invalid Phone` };
  } else if (!formatted) {
    return { phoneNumber: `Phone is required` };
  }
}
