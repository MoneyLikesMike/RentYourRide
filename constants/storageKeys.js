/** AsyncStorage: profile fields (also cleared on auth logout) */
export const STORAGE_FIRST = '@ryr_user_first_name';
export const STORAGE_LAST = '@ryr_user_last_name';
export const STORAGE_YEAR = '@ryr_user_join_year';
export const STORAGE_PHOTO = '@ryr_user_profile_photo_uri';
export const STORAGE_ABOUT = '@ryr_user_profile_about';

export const PROFILE_STORAGE_KEYS = [
  STORAGE_FIRST,
  STORAGE_LAST,
  STORAGE_YEAR,
  STORAGE_PHOTO,
  STORAGE_ABOUT,
];

/** AsyncStorage: compact auth user snapshot */
export const STORAGE_AUTH_USER = '@ryr_auth_user';

/** Set when user has used a listings swipe action (edit, deactivate, etc.). */
export const STORAGE_LISTINGS_SWIPE_HINT_DONE = '@ryr_listings_swipe_hint_done';

/** Login "Remember Me" (persists across logout) */
export const STORAGE_REMEMBER_ME = '@ryr_remember_me';
export const STORAGE_REMEMBERED_EMAIL = '@ryr_remembered_email';
