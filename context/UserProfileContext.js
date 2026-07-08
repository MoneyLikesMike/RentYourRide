import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STORAGE_FIRST,
  STORAGE_LAST,
  STORAGE_YEAR,
  STORAGE_PHOTO,
  STORAGE_ABOUT,
} from '../constants/storageKeys';
import { useAuth } from './AuthContext';
import * as usersApi from '../services/usersApi';
import { resolveMediaUrl } from '../utils/mediaUrl';

const UserProfileContext = createContext(null);

export function UserProfileProvider({ children }) {
  const { isReady, isAuthenticated, user: authUser } = useAuth();
  const hadSessionRef = useRef(false);
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

  useEffect(() => {
    if (!isReady) return;
    if (isAuthenticated) {
      hadSessionRef.current = true;
      if (!authUser) return;
      const f = authUser.firstName || '';
      const l = authUser.lastName || '';
      if (f || l) {
        setFirstName(f);
        setLastName(l);
        const y = new Date().getFullYear();
        setJoinedYear((jy) => jy ?? y);
        AsyncStorage.multiSet([
          [STORAGE_FIRST, f],
          [STORAGE_LAST, l],
          [STORAGE_YEAR, String(y)],
        ]).catch(() => {});
      }
      return;
    }
    if (hadSessionRef.current) {
      hadSessionRef.current = false;
      setFirstName('');
      setLastName('');
      setJoinedYear(null);
      setPhotoUri(null);
      setAboutBio('');
    }
  }, [isReady, isAuthenticated, authUser]);

  const authUserId = authUser?.id;

  const refreshProfileFromApi = useCallback(async () => {
    if (!isReady || !isAuthenticated || !authUserId) return;
    try {
      const me = await usersApi.getMe();
      const f = me.firstName || '';
      const l = me.lastName || '';
      setFirstName(f);
      setLastName(l);
      const avatar = me.avatarUrl?.trim?.() ? resolveMediaUrl(me.avatarUrl.trim()) : null;
      setPhotoUri(avatar);
      if (me.aboutBio != null) setAboutBio(String(me.aboutBio));
      let year = new Date().getFullYear();
      try {
        const rawYear = await AsyncStorage.getItem(STORAGE_YEAR);
        if (rawYear) {
          const y = Number(rawYear);
          if (Number.isFinite(y)) year = y;
        }
      } catch (_) {
        /* ignore */
      }
      setJoinedYear(year);
      await AsyncStorage.multiSet([
        [STORAGE_FIRST, f],
        [STORAGE_LAST, l],
        [STORAGE_YEAR, String(year)],
        [STORAGE_PHOTO, avatar ?? ''],
        [STORAGE_ABOUT, me.aboutBio != null ? String(me.aboutBio) : ''],
      ]);
    } catch (_) {
      /* offline */
    }
  }, [isReady, isAuthenticated, authUserId]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !authUserId) return;
    refreshProfileFromApi();
  }, [isReady, isAuthenticated, authUserId, refreshProfileFromApi]);

  /** Call when the user completes the sign-up form (before terms / onboarding) — optional if API already ran. */
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
    const u = uri && String(uri).trim() ? resolveMediaUrl(uri.trim()) : null;
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
      refreshProfileFromApi,
    }),
    [
      firstName,
      lastName,
      joinedYear,
      photoUri,
      aboutBio,
      commitSignUpIdentity,
      saveProfileDetails,
      refreshProfileFromApi,
    ],
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
}
