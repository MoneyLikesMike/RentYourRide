import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserProfileContext = createContext(null);

const STORAGE_FIRST = '@ryr_user_first_name';
const STORAGE_LAST = '@ryr_user_last_name';
const STORAGE_YEAR = '@ryr_user_join_year';
const STORAGE_PHOTO = '@ryr_user_profile_photo_uri';
const STORAGE_ABOUT = '@ryr_user_profile_about';

export function UserProfileProvider({ children }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [joinedYear, setJoinedYear] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [aboutBio, setAboutBio] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          STORAGE_FIRST,
          STORAGE_LAST,
          STORAGE_YEAR,
          STORAGE_PHOTO,
          STORAGE_ABOUT,
        ]);
        if (cancelled) return;
        const map = Object.fromEntries(entries);
        if (map[STORAGE_FIRST]) setFirstName(map[STORAGE_FIRST]);
        if (map[STORAGE_LAST]) setLastName(map[STORAGE_LAST]);
        if (map[STORAGE_YEAR]) {
          const y = Number(map[STORAGE_YEAR]);
          setJoinedYear(Number.isFinite(y) ? y : null);
        }
        if (map[STORAGE_PHOTO] !== undefined) {
          setPhotoUri(map[STORAGE_PHOTO] ? map[STORAGE_PHOTO] : null);
        }
        if (map[STORAGE_ABOUT] !== undefined && map[STORAGE_ABOUT] !== null) {
          setAboutBio(map[STORAGE_ABOUT]);
        }
      } catch (_) {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Call when the user completes the sign-up form (before terms / onboarding). */
  const commitSignUpIdentity = useCallback(async (first, last) => {
    const f = (first ?? '').trim();
    const l = (last ?? '').trim();
    const y = new Date().getFullYear();
    setFirstName(f);
    setLastName(l);
    setJoinedYear(y);
    try {
      await AsyncStorage.multiSet([
        [STORAGE_FIRST, f],
        [STORAGE_LAST, l],
        [STORAGE_YEAR, String(y)],
      ]);
    } catch (_) {
      /* still keep in-memory state */
    }
  }, []);

  /** Persist profile photo + about (Edit profile SAVE). */
  const saveProfileDetails = useCallback(async (uri, bioText) => {
    const u = uri && String(uri).trim() ? uri.trim() : null;
    const b = (bioText ?? '').trim();
    setPhotoUri(u);
    setAboutBio(b);
    try {
      await AsyncStorage.multiSet([
        [STORAGE_PHOTO, u ?? ''],
        [STORAGE_ABOUT, b],
      ]);
    } catch (_) {
      /* in-memory state still updated */
    }
  }, []);

  const value = useMemo(
    () => ({
      firstName,
      lastName,
      joinedYear,
      photoUri,
      aboutBio,
      setFirstName,
      setLastName,
      setJoinedYear,
      setPhotoUri,
      setAboutBio,
      commitSignUpIdentity,
      saveProfileDetails,
    }),
    [firstName, lastName, joinedYear, photoUri, aboutBio, commitSignUpIdentity, saveProfileDetails]
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
}
