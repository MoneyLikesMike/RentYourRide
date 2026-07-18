import React, { useState, useMemo, useEffect, useRef } from 'react';
import { uiScale } from '../utils/uiScale';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  Modal,
  Pressable,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { Picker } from '@react-native-picker/picker';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { getTripBillingDays } from '../utils/rentalTripDays';

const { width: screenWidth } = Dimensions.get('window');
const scale = uiScale;
const HORIZONTAL_PADDING = 20 * scale;
const GRID_PADDING = 12;
const COL_WIDTH = (screenWidth - HORIZONTAL_PADDING * 2 - GRID_PADDING * 2) / 7;
const CALENDAR_INNER_WIDTH = 7 * COL_WIDTH;

const DATE_BLUE = 'rgb(69, 89, 151)';
const DATE_RED_WEEKEND = 'rgb(255, 83, 83)';
const RANGE_MIDDLE_BG = 'rgba(237, 120, 120, 0.096)';
const RANGE_END_BG = 'rgb(237, 120, 120)';
const SELECT_MIDDLE_BG = 'rgba(76, 182, 177, 0.09633091517857142)';
const SELECT_END_BG = COLORS.GREENY_BLUE_TWO;

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour12 = h % 12 || 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      const minStr = m === 0 ? '00' : String(m);
      opts.push(`${hour12}:${minStr} ${ampm}`);
    }
  }
  return opts;
})();
const BOOKING_CHIP_WIDTH = 63;
const BOOKING_CHIP_GAP = 8;

const getOrdinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const formatBlockedRange = (start, end) => {
  const month = MONTH_NAMES[start.getMonth()].toUpperCase();
  const startDay = getOrdinal(start.getDate());
  const endDay = getOrdinal(end.getDate());
  const year = start.getFullYear();
  if (start.getTime() === end.getTime()) {
    return `${month} ${startDay}, ${year} - ${month} ${endDay}, ${year}`;
  }
  const endMonth = MONTH_NAMES[end.getMonth()].toUpperCase();
  const endYear = end.getFullYear();
  return `${month} ${startDay}, ${year} - ${endMonth} ${endDay}, ${endYear}`;
};

const formatBottomDateTime = (date, time) => {
  if (!date) return '--';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} - ${time}`;
};

const getDaysInMonth = (year, month) => {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();
  const startWeekday = first.getDay();
  const offset = startWeekday === 0 ? 6 : startWeekday - 1;
  return { daysInMonth, offset };
};

const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isInRange = (d, start, end) => {
  const t = d.getTime();
  return t >= start.getTime() && t <= end.getTime();
};

const isSunday = (d) => d.getDay() === 0;

const rangesOverlap = (a, b) =>
  a.start.getTime() <= b.end.getTime() && b.start.getTime() <= a.end.getTime();

const hasBlockedOverlap = (blockedRanges, start, end) => {
  const range = {
    start: start.getTime() <= end.getTime() ? start : end,
    end: start.getTime() <= end.getTime() ? end : start,
  };
  return blockedRanges.some((r) => rangesOverlap(r, range));
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const parseTripConstraintDays = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(1, Math.floor(value));
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase().trim();
  const numberMatch = normalized.match(/(\d+(\.\d+)?)/);
  const amount = numberMatch ? Number(numberMatch[1]) : null;
  if (!amount || !Number.isFinite(amount)) return null;
  if (normalized.includes('month')) return Math.max(1, Math.round(amount * 30));
  if (normalized.includes('week')) return Math.max(1, Math.round(amount * 7));
  return Math.max(1, Math.round(amount));
};

const getTripLengthDays = (start, end) => getTripBillingDays(start, end);

const alertTripLengthInvalid = (requestedDays, minBookingDays, maxBookingDays) => {
  let message = '';
  if (minBookingDays && requestedDays < minBookingDays) {
    message = `This host requires a minimum trip of ${minBookingDays} day${minBookingDays === 1 ? '' : 's'}. Your selection is ${requestedDays} day${requestedDays === 1 ? '' : 's'}.`;
  } else if (maxBookingDays && requestedDays > maxBookingDays) {
    message = `This host allows a maximum trip of ${maxBookingDays} day${maxBookingDays === 1 ? '' : 's'}. Your selection is ${requestedDays} day${requestedDays === 1 ? '' : 's'}.`;
  } else {
    message = 'Please choose dates that match the host’s trip length rules.';
  }
  Alert.alert('Trip length not allowed', message, [{ text: 'OK' }]);
};

const mergeBlockedRanges = (prev, newStart, newEnd) => {
  const newRange = { start: newStart, end: newEnd };
  const overlapping = prev.filter((r) => rangesOverlap(r, newRange));
  const nonOverlapping = prev.filter((r) => !rangesOverlap(r, newRange));
  if (overlapping.length === 0) {
    return [...prev, { start: newStart, end: newEnd }];
  }
  const all = [...overlapping, newRange];
  const mergedStart = new Date(Math.min(...all.map((x) => x.start.getTime())));
  const mergedEnd = new Date(Math.max(...all.map((x) => x.end.getTime())));
  return [...nonOverlapping, { start: mergedStart, end: mergedEnd }];
};

const parseSavedCalendarData = (saved) => {
  if (!saved) return null;
  const blockedRanges = (saved.blockedRanges || []).map((r) => ({
    start: new Date(r.start),
    end: new Date(r.end),
  }));
  return {
    blockedRanges,
    hoursOpen: saved.hoursOpen ?? '9:00 AM',
    hoursClose: saved.hoursClose ?? '5:00 PM',
    hoursByDay: saved.hoursByDay,
    open24Hours: saved.open24Hours ?? false,
  };
};

const CalendarScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const mode = route.params?.mode; // 'booking' | undefined
  const isBooking = mode === 'booking';
  const today = new Date();
  const initialSaved = useMemo(
    () => parseSavedCalendarData(route.params?.savedCalendarData),
    [route.params?.savedCalendarData]
  );
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [blockedRanges, setBlockedRanges] = useState(initialSaved?.blockedRanges ?? []);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [hoursOpen, setHoursOpen] = useState(initialSaved?.hoursOpen ?? '9:00 AM');
  const [hoursClose, setHoursClose] = useState(initialSaved?.hoursClose ?? '5:00 PM');
  const [open24Hours, setOpen24Hours] = useState(initialSaved?.open24Hours ?? false);
  const [timePickerField, setTimePickerField] = useState(null); // 'open' | 'close' | null
  const [tripStartTime, setTripStartTime] = useState('2:30 PM');
  const [tripEndTime, setTripEndTime] = useState('10:30 PM');
  const availabilityDataRef = useRef(route.params?.availabilityData);
  const startTimeScrollRef = useRef(null);
  const endTimeScrollRef = useRef(null);
  const minBookingDays = useMemo(
    () => parseTripConstraintDays(route.params?.minTripConstraint ?? route.params?.minTripDays),
    [route.params?.minTripConstraint, route.params?.minTripDays]
  );
  const maxBookingDays = useMemo(
    () => parseTripConstraintDays(route.params?.maxTripConstraint ?? route.params?.maxTripDays),
    [route.params?.maxTripConstraint, route.params?.maxTripDays]
  );

  // Booking flow: same Calendar instance can be shown for another listing — sync blocked dates & clear selection
  useEffect(() => {
    if (!isBooking) return;
    const parsed = parseSavedCalendarData(route.params?.savedCalendarData);
    setBlockedRanges(parsed?.blockedRanges ?? []);
    setHoursOpen(parsed?.hoursOpen ?? '9:00 AM');
    setHoursClose(parsed?.hoursClose ?? '5:00 PM');
    setOpen24Hours(parsed?.open24Hours ?? false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [isBooking, route.params?.bookingSessionKey, route.params?.savedCalendarData]);

  const tripStartAmPm = tripStartTime.includes('PM') ? 'PM' : 'AM';
  const tripEndAmPm = tripEndTime.includes('PM') ? 'PM' : 'AM';

  const formatTripSummary = () => {
    if (!selectionStart || !selectionEnd) return '';
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const s = `${monthNames[selectionStart.getMonth()]} ${selectionStart.getDate()}, ${tripStartTime}`;
    const e = `${monthNames[selectionEnd.getMonth()]} ${selectionEnd.getDate()}, ${tripEndTime}`;
    return `${s} - ${e}`;
  };

  const timeChipLabel = (t) => String(t).split(' ')[0]; // '2:30 PM' -> '2:30'

  const getTimeToMinutes = (timeStr) => {
    const [clock, ampmRaw] = String(timeStr).split(' ');
    const [hStr, mStr] = clock.split(':');
    const ampm = ampmRaw?.toUpperCase();
    let h = Number(hStr) || 0;
    const m = Number(mStr) || 0;
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  const isTodayDate = (d) => {
    if (!d) return false;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  const isPastTimeForDate = (dateObj, timeStr) => {
    if (!dateObj) return false;
    if (!isTodayDate(dateObj)) return false;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return getTimeToMinutes(timeStr) < nowMinutes;
  };

  useEffect(() => {
    availabilityDataRef.current = route.params?.availabilityData;
  }, [route.params?.availabilityData]);

  const centerSelectedTimeChip = (scrollRef, selectedTime) => {
    if (!scrollRef?.current) return;
    const index = TIME_OPTIONS.indexOf(selectedTime);
    if (index < 0) return;
    const viewportWidth = screenWidth - HORIZONTAL_PADDING * 2;
    const rawX = index * (BOOKING_CHIP_WIDTH + BOOKING_CHIP_GAP) - (viewportWidth - BOOKING_CHIP_WIDTH) / 2;
    const x = Math.max(0, rawX + 6); // includes scroll content side padding
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x, animated: true });
    });
  };

  useEffect(() => {
    if (!isBooking) return;
    centerSelectedTimeChip(startTimeScrollRef, tripStartTime);
  }, [tripStartTime, isBooking]);

  useEffect(() => {
    if (!isBooking) return;
    centerSelectedTimeChip(endTimeScrollRef, tripEndTime);
  }, [tripEndTime, isBooking]);

  useEffect(() => {
    const saved = parseSavedCalendarData(route.params?.savedCalendarData);
    if (saved) {
      setBlockedRanges(saved.blockedRanges);
      setHoursOpen(saved.hoursOpen);
      setHoursClose(saved.hoursClose);
      setOpen24Hours(saved.open24Hours);
    }
  }, [route.params?.savedCalendarData]);

  const { daysInMonth, offset } = useMemo(
    () => getDaysInMonth(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDatePress = (day) => {
    const date = new Date(viewYear, viewMonth, day);
    const isBlockedForBooking = blockedRanges.some((r) => isInRange(date, r.start, r.end));
    if (isBooking) {
      const todayStartMs = startOfDay(new Date());
      if (startOfDay(date) < todayStartMs) return;
      if (isBlockedForBooking) return;
      if (!selectionStart) {
        setSelectionStart(date);
        setSelectionEnd(null);
        return;
      }
      if (!selectionEnd) {
        const s = selectionStart.getTime() <= date.getTime() ? selectionStart : date;
        const e = selectionStart.getTime() <= date.getTime() ? date : selectionStart;
        const requestedDays = getTripLengthDays(s, e);
        if ((minBookingDays && requestedDays < minBookingDays) || (maxBookingDays && requestedDays > maxBookingDays)) {
          alertTripLengthInvalid(requestedDays, minBookingDays, maxBookingDays);
          return;
        }
        if (hasBlockedOverlap(blockedRanges, s, e)) {
          // Keep the existing start date; user must choose an end date that doesn't cross blocked ranges.
          return;
        }
        setSelectionStart(s);
        setSelectionEnd(e);
        return;
      }
      setSelectionStart(date);
      setSelectionEnd(null);
      return;
    }
    const todayStartMs = startOfDay(new Date());
    if (startOfDay(date) < todayStartMs) return;
    if (!selectionStart) {
      setSelectionStart(date);
      setSelectionEnd(null);
      return;
    }
    if (selectionEnd) {
      setSelectionStart(date);
      setSelectionEnd(null);
      return;
    }
    const start = selectionStart.getTime() <= date.getTime() ? selectionStart : date;
    const end = selectionStart.getTime() <= date.getTime() ? date : selectionStart;
    const s = start.getTime() <= end.getTime() ? start : end;
    const e = start.getTime() <= end.getTime() ? end : start;
    if (startOfDay(s) < todayStartMs) return;
    setBlockedRanges((prev) => mergeBlockedRanges(prev, s, e));
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const handleBlock = () => {
    if (!selectionStart) return;
    const start = selectionStart;
    const end = selectionEnd ? selectionEnd : selectionStart;
    const s = start.getTime() <= end.getTime() ? start : end;
    const e = start.getTime() <= end.getTime() ? end : start;
    const todayStartMs = startOfDay(new Date());
    if (startOfDay(s) < todayStartMs) return;
    setBlockedRanges((prev) => mergeBlockedRanges(prev, s, e));
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const saveAndGoBack = () => {
    if (isBooking) {
      if (!selectionStart || !selectionEnd) {
        navigation.goBack();
        return;
      }
      const todayStartMs = startOfDay(new Date());
      if (startOfDay(selectionStart) < todayStartMs || startOfDay(selectionEnd) < todayStartMs) {
        return;
      }
      if (isPastTimeForDate(selectionStart, tripStartTime) || isPastTimeForDate(selectionEnd, tripEndTime)) {
        return;
      }
      const requestedDays = getTripLengthDays(selectionStart, selectionEnd);
      if ((minBookingDays && requestedDays < minBookingDays) || (maxBookingDays && requestedDays > maxBookingDays)) {
        alertTripLengthInvalid(requestedDays, minBookingDays, maxBookingDays);
        return;
      }
      if (hasBlockedOverlap(blockedRanges, selectionStart, selectionEnd)) {
        return;
      }
      const bookingDates = {
        start: selectionStart.getTime(),
        end: selectionEnd.getTime(),
        startTime: tripStartTime,
        endTime: tripEndTime,
      };
      const returnTo = route.params?.returnTo || 'SearchResultsScreen';
      const payload = { bookingDates };
      // Always pass listing back with dates so VehicleDetail (and stack merge) never drops the vehicle
      if (route.params?.listing) {
        payload.listing = route.params.listing;
      }
      navigation.navigate(returnTo, payload);
      return;
    }
    let finalBlockedRanges = blockedRanges;
    if (selectionStart) {
      const end = selectionEnd || selectionStart;
      const s = selectionStart.getTime() <= end.getTime() ? selectionStart : end;
      const e = selectionStart.getTime() <= end.getTime() ? end : selectionStart;
      const todayStartMs = startOfDay(new Date());
      if (startOfDay(s) >= todayStartMs) {
        finalBlockedRanges = mergeBlockedRanges(blockedRanges, s, e);
      }
    }
    const calendarData = {
      blockedRanges: finalBlockedRanges.map((r) => ({ start: r.start.getTime(), end: r.end.getTime() })),
      hoursOpen,
      hoursClose,
      open24Hours,
    };
    navigation.navigate('AvailabilitySetupScreen', {
      calendarData,
      availabilityData: availabilityDataRef.current ?? undefined,
    });
  };

  const removeBlockedRange = (index) => {
    setBlockedRanges((prev) => prev.filter((_, i) => i !== index));
  };

  const getDateState = (day) => {
    const date = new Date(viewYear, viewMonth, day);
    const selStart = selectionStart && isSameDay(date, selectionStart);
    const selEnd = selectionEnd && isSameDay(date, selectionEnd);
    const inSelectionRange =
      selectionStart &&
      (selStart || selEnd || isInRange(date, selectionStart, selectionEnd || selectionStart));
    const isSelectionStart = selectionStart && isSameDay(date, selectionStart);
    const isSelectionEnd = selectionEnd ? isSameDay(date, selectionEnd) : selectionStart && isSameDay(date, selectionStart);
    const inSelectionMiddle =
      inSelectionRange && !isSelectionStart && !isSelectionEnd;

    const blockedRange = blockedRanges.find((r) => isInRange(date, r.start, r.end));
    const inBlockedRange = !!blockedRange;
    const isBlockedStart = blockedRange && isSameDay(date, blockedRange.start);
    const isBlockedEnd = blockedRange && isSameDay(date, blockedRange.end);
    const inBlockedMiddle = inBlockedRange && !isBlockedStart && !isBlockedEnd;

    const isSundayDate = isSunday(date);
    const isPastDate = startOfDay(date) < startOfDay(new Date());
    return {
      inSelectionRange,
      isSelectionStart,
      isSelectionEnd,
      inSelectionMiddle,
      inBlockedRange,
      isBlockedStart,
      isBlockedEnd,
      inBlockedMiddle,
      isSundayDate,
      isPastDate,
    };
  };

  const calendarRows = useMemo(() => {
    const blanks = Array(offset).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const all = [...blanks, ...days];
    const rows = [];
    for (let i = 0; i < all.length; i += 7) {
      const row = all.slice(i, i + 7);
      while (row.length < 7) row.push(null);
      rows.push(row);
    }
    return rows;
  }, [offset, daysInMonth]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          {isBooking ? (
            <Text style={styles.bookingClose}>✕</Text>
          ) : (
            <Svg width={23 * scale} height={23 * scale} viewBox="0 0 48 48" fill="none">
              <Path d="M31 8L17 24L31 40" stroke="#FFB131" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          )}
        </TouchableOpacity>
        <View style={styles.headerTitleWrapper}>
          <Text style={[styles.headerTitle, isBooking && styles.tripDatesTitle]}>
            {isBooking ? 'TRIP DATES' : 'CALENDAR'}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.monthBar}>
          <View pointerEvents="none" style={styles.monthBarInner} />
          <TouchableOpacity style={styles.monthArrow} onPress={prevMonth}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M15 18l-6-6 6-6" stroke="#9B9B9B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <View style={styles.monthCenter}>
            <Image
              source={require('../assets/icons/calendarIcon.png')}
              style={styles.monthCalendarIcon}
              resizeMode="contain"
            />
            <Text style={styles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          </View>
          <TouchableOpacity style={styles.monthArrow} onPress={nextMonth}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M9 18l6-6-6-6" stroke="#9B9B9B" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>
        {isBooking ? (
          <View style={styles.bookingLegendRow}>
            <View style={styles.bookingLegendItem}>
              <View style={styles.legendDotAvailable} />
              <Text style={styles.bookingLegendText}>Available</Text>
            </View>
            <View style={styles.bookingLegendItem}>
              <View style={styles.legendDotReserved} />
              <Text style={styles.bookingLegendText}>Reserved</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.calendarAlignWrapper}>
          <View style={styles.calendarRow}>
            {WEEKDAYS.map((d) => (
              <View key={d} style={styles.dayCell}>
                <Text style={styles.weekdayText}>{d}</Text>
              </View>
            ))}
          </View>
          {calendarRows.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.calendarRow}>
              {row.map((day, colIndex) => {
                if (day === null) {
                  return <View key={`e-${rowIndex}-${colIndex}`} style={styles.dayCell} />;
                }
                const state = getDateState(day);
                const useSelection = state.inSelectionRange;
                const useBlocked = state.inBlockedRange && !useSelection;
                const isStart = useSelection ? state.isSelectionStart : (useBlocked && state.isBlockedStart);
                const isEnd = useSelection ? state.isSelectionEnd : (useBlocked && state.isBlockedEnd);
                const isMiddle = useSelection ? state.inSelectionMiddle : (useBlocked && state.inBlockedMiddle);
                const isSingle = isStart && isEnd;
                const inRange = useSelection || useBlocked;

                const cellStyle = [
                  styles.dayCell,
                  useSelection && isSingle && styles.daySelectSingle,
                  useSelection && isStart && !isEnd && styles.daySelectStart,
                  useSelection && isEnd && !isStart && styles.daySelectEnd,
                  useSelection && isMiddle && styles.daySelectMiddle,
                  useBlocked && isSingle && styles.dayRangeSingle,
                  useBlocked && isStart && !isEnd && styles.dayRangeStart,
                  useBlocked && isEnd && !isStart && styles.dayRangeEnd,
                  useBlocked && isMiddle && styles.dayRangeMiddle,
                  isBooking && useBlocked && isSingle && styles.dayUnavailableSingle,
                  isBooking && useBlocked && isStart && !isEnd && styles.dayUnavailableStart,
                  isBooking && useBlocked && isEnd && !isStart && styles.dayUnavailableEnd,
                  isBooking && useBlocked && isMiddle && styles.dayUnavailableMiddle,
                  state.isSundayDate && !inRange && styles.daySunday,
                ];
                return (
                  <TouchableOpacity
                    key={day}
                    style={cellStyle}
                    disabled={state.isPastDate}
                    onPress={() => handleDatePress(day)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        state.isSundayDate && !inRange && styles.dayTextSunday,
                        (isStart || isEnd) && styles.dayTextSelected,
                        isBooking && useBlocked && styles.dayTextUnavailable,
                        state.isPastDate && styles.dayTextUnavailable,
                        state.isSundayDate && inRange && !isStart && !isEnd && styles.dayTextSunday,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {isBooking ? (
          <View style={styles.bookingTimeSection}>
            <View style={styles.bookingTimeRow}>
              <Text style={styles.bookingTimeLabel}>START</Text>
              <Text style={styles.bookingTimeAmPm}>{tripStartAmPm}</Text>
            </View>
            <View style={styles.bookingTimes}>
              <ScrollView
                ref={startTimeScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bookingTimeScrollContent}
              >
                {TIME_OPTIONS.map((t) => (
                  <TouchableOpacity
                    key={`start-${t}`}
                    style={[
                      styles.bookingTimeChip,
                      tripStartTime === t && styles.bookingTimeChipSelected,
                      isPastTimeForDate(selectionStart, t) && styles.bookingTimeChipDisabled,
                    ]}
                    onPress={() => {
                      if (isPastTimeForDate(selectionStart, t)) return;
                      setTripStartTime(t);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.bookingTimeChipText,
                        tripStartTime === t && styles.bookingTimeChipTextSelected,
                        isPastTimeForDate(selectionStart, t) && styles.bookingTimeChipTextDisabled,
                      ]}
                    >
                      {timeChipLabel(t)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={[styles.bookingTimeRow, { marginTop: 18 }]}>
              <Text style={styles.bookingTimeLabel}>END</Text>
              <Text style={styles.bookingTimeAmPm}>{tripEndAmPm}</Text>
            </View>
            <View style={styles.bookingTimeTopDivider} />
            <View style={styles.bookingTimes}>
              <ScrollView
                ref={endTimeScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.bookingTimeScrollContent}
              >
                {TIME_OPTIONS.map((t) => (
                  <TouchableOpacity
                    key={`end-${t}`}
                    style={[
                      styles.bookingTimeChip,
                      tripEndTime === t && styles.bookingTimeChipSelected,
                      isPastTimeForDate(selectionEnd || selectionStart, t) && styles.bookingTimeChipDisabled,
                    ]}
                    onPress={() => {
                      if (isPastTimeForDate(selectionEnd || selectionStart, t)) return;
                      setTripEndTime(t);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.bookingTimeChipText,
                        tripEndTime === t && styles.bookingTimeChipTextSelected,
                        isPastTimeForDate(selectionEnd || selectionStart, t) && styles.bookingTimeChipTextDisabled,
                      ]}
                    >
                      {timeChipLabel(t)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={styles.bookingTimeBottomDivider} />
            <View style={styles.bookingBottomSummary}>
              <View style={styles.bookingBottomRow}>
                <Text style={styles.bookingBottomLabel}>START TIME</Text>
                <Text style={styles.bookingBottomValue}>
                  {formatBottomDateTime(selectionStart, tripStartTime)}
                </Text>
              </View>
              <View style={styles.bookingBottomRow}>
                <Text style={styles.bookingBottomLabel}>END TIME</Text>
                <Text style={styles.bookingBottomValue}>
                  {formatBottomDateTime(selectionEnd || selectionStart, tripEndTime)}
                </Text>
              </View>
            </View>
            {/* Save button rendered in fixed footer for booking mode */}
          </View>
        ) : (
          <>
            <View style={styles.datesSection}>
              <Text style={styles.datesSectionTitle}>DATES</Text>
              {blockedRanges.length === 0 && !selectionStart && (
                <Text style={styles.datesEmpty}>No blocked dates</Text>
              )}
              {blockedRanges.map((range, index) => (
                <View key={index} style={styles.blockedRow}>
                  <TouchableOpacity onPress={() => removeBlockedRange(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.blockedX}>✕</Text>
                  </TouchableOpacity>
                  <Text style={styles.blockedRangeText}>
                    {formatBlockedRange(range.start, range.end)}
                  </Text>
                </View>
              ))}
              {selectionStart && (
                <View style={styles.blockedRow}>
                  <Text style={styles.blockedRangeText}>
                    {formatBlockedRange(selectionStart, selectionEnd || selectionStart)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.hoursSection}>
              <Text style={styles.hoursSectionTitle}>HOURS OF OPERATION</Text>
              <Text style={styles.hoursDescription}>
                Set the hours when your vehicle is available. Bookings outside these hours will be prevented.
              </Text>
              <View style={styles.hoursToggleRow}>
                <Text style={styles.hoursToggleLabel}>Available 24 hours a day</Text>
                <Switch
                  value={open24Hours}
                  onValueChange={setOpen24Hours}
                  trackColor={{ false: '#E0E0E0', true: COLORS.GREENY_BLUE_TWO }}
                  thumbColor="#fff"
                />
              </View>
              {!open24Hours && (
                <View style={styles.hoursRow}>
                  <View style={styles.hoursField}>
                    <Text style={styles.hoursLabel}>From</Text>
                    <TouchableOpacity style={styles.hoursInput} onPress={() => setTimePickerField('open')}>
                      <Text style={styles.hoursInputText}>{hoursOpen}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.hoursField}>
                    <Text style={styles.hoursLabel}>To</Text>
                    <TouchableOpacity style={styles.hoursInput} onPress={() => setTimePickerField('close')}>
                      <Text style={styles.hoursInputText}>{hoursClose}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {isBooking ? (
        <View style={[styles.footer, { paddingBottom: 24 + insets.bottom }]}>
          <TouchableOpacity style={styles.blockButton} onPress={saveAndGoBack} activeOpacity={0.8}>
            <Text style={styles.finalizeButtonText}>FINALIZE RENTAL PERIOD</Text>
          </TouchableOpacity>
        </View>
      ) : null}

  <Modal visible={timePickerField != null} transparent animationType="slide">
        <Pressable style={styles.timePickerBackdrop} onPress={() => setTimePickerField(null)}>
          <View style={styles.timePickerContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>
                {timePickerField === 'open' ? 'Opening time' : 'Closing time'}
              </Text>
              <TouchableOpacity onPress={() => setTimePickerField(null)}>
                <Text style={styles.timePickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <Picker
              selectedValue={timePickerField === 'open' ? hoursOpen : hoursClose}
              onValueChange={(v) => (timePickerField === 'open' ? setHoursOpen(v) : setHoursClose(v))}
              style={styles.timePickerWheel}
              itemStyle={Platform.OS === 'ios' ? styles.timePickerItem : undefined}
              mode="dropdown"
            >
              {TIME_OPTIONS.map((t) => (
                <Picker.Item key={t} label={t} value={t} />
              ))}
            </Picker>
          </View>
        </Pressable>
      </Modal>

      {!isBooking ? (
        <View style={[styles.footer, { paddingBottom: 24 + insets.bottom }]}>
          <TouchableOpacity style={styles.blockButton} onPress={saveAndGoBack} activeOpacity={0.8}>
            <Text style={styles.blockButtonText}>BLOCK</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
    width: 40,
    alignItems: 'center',
  },
  headerTitleWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 18 * scale,
    color: '#4A4A4A',
    letterSpacing: 0.2,
  },
  tripDatesTitle: {
    fontSize: 15,
    color: 'rgb(100, 100, 100)',
    letterSpacing: 0.2,
  },
  bookingClose: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 24 * scale,
    color: '#FFB131',
    lineHeight: 24 * scale,
  },
  bookingTimeSection: {
    paddingTop: 0,
    paddingHorizontal: 20 * scale,
    marginTop: -20,
  },
  bookingSummaryWrap: {
    marginBottom: 18,
    alignItems: 'center',
  },
  bookingSummaryText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: '#4A4A4A',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  bookingTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  bookingTimeLabel: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 12,
    color: '#000',
    letterSpacing: 0.2,
  },
  bookingTimeAmPm: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: '#9B9B9B',
    letterSpacing: 0.2,
  },
  bookingTimes: {
    alignItems: 'center',
  },
  bookingTimeScrollContent: {
    flexDirection: 'row',
    gap: BOOKING_CHIP_GAP,
    paddingHorizontal: 6,
  },
  bookingTimeBottomDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 12,
    marginBottom: 12,
  },
  bookingTimeChip: {
    width: BOOKING_CHIP_WIDTH,
    height: 28,
    borderRadius: 13.5,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingTimeChipSelected: {
    borderColor: COLORS.GREENY_BLUE_TWO,
    backgroundColor: '#fff',
  },
  bookingTimeChipDisabled: {
    opacity: 0.35,
  },
  bookingTimeChipText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: '#9B9B9B',
    letterSpacing: 0.2,
  },
  bookingTimeChipTextSelected: {
    color: COLORS.GREENY_BLUE_TWO,
  },
  bookingTimeChipTextDisabled: {
    color: '#BFBFBF',
  },
  bookingLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 10,
  },
  bookingLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDotAvailable: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#DADADA',
    backgroundColor: '#fff',
    marginRight: 6,
  },
  legendDotReserved: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E6E6E6',
    marginRight: 6,
  },
  bookingLegendText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12,
    color: '#9B9B9B',
    letterSpacing: 0.2,
  },
  bookingBottomSummary: {
    marginTop: 0,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  bookingBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  bookingBottomDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  bookingBottomLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    width: 107,
    height: 18,
    textAlign: 'left',
    lineHeight: 18,
  },
  bookingBottomValue: {
    fontFamily: FONTS.NUNITO,
    fontSize: 13,
    color: 'rgb(89, 89, 89)',
    letterSpacing: 0.2,
    width: 167,
    height: 18,
    textAlign: 'right',
    lineHeight: 18,
    opacity: 0.8809291294642857,
  },
  finalizeButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 17,
    color: '#fff',
    letterSpacing: 0.3,
    width: 227,
    height: 23,
    textAlign: 'center',
    lineHeight: 23,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
  },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 311 * scale,
    height: 42 * scale,
    paddingVertical: 0,
    paddingHorizontal: 12,
    borderWidth: 1.1,
    borderColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 2.2 * scale,
    backgroundColor: 'rgb(245, 254, 254)',
    marginBottom: 16 * scale,
    alignSelf: 'center',
  },
  monthBarInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 2.2 * scale,
    borderWidth: 1.1,
    borderColor: COLORS.GREENY_BLUE_TWO,
  },
  monthArrow: {
    width: 24 * scale,
    height: 24 * scale,
    borderRadius: 12 * scale,
    backgroundColor: '#fff',
    borderWidth: 1.1,
    borderColor: COLORS.GREENY_BLUE_TWO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthCalendarIcon: {
    width: 22,
    height: 22,
  },
  monthLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: '#4A4A4A',
  },
  calendarAlignWrapper: {
    paddingHorizontal: GRID_PADDING,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: GRID_PADDING,
  },
  calendarRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekdayText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: '#9B9B9B',
    textAlign: 'center',
  },
  dayCell: {
    width: COL_WIDTH,
    height: COL_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelectSingle: {
    borderRadius: COL_WIDTH / 2,
    backgroundColor: SELECT_END_BG,
  },
  daySelectStart: {
    borderTopLeftRadius: COL_WIDTH / 2,
    borderBottomLeftRadius: COL_WIDTH / 2,
    backgroundColor: SELECT_END_BG,
  },
  daySelectEnd: {
    borderTopRightRadius: COL_WIDTH / 2,
    borderBottomRightRadius: COL_WIDTH / 2,
    backgroundColor: SELECT_END_BG,
  },
  daySelectMiddle: {
    backgroundColor: SELECT_MIDDLE_BG,
  },
  dayRangeSingle: {
    borderRadius: COL_WIDTH / 2,
    backgroundColor: RANGE_END_BG,
  },
  dayRangeStart: {
    borderTopLeftRadius: COL_WIDTH / 2,
    borderBottomLeftRadius: COL_WIDTH / 2,
    backgroundColor: RANGE_END_BG,
  },
  dayRangeEnd: {
    borderTopRightRadius: COL_WIDTH / 2,
    borderBottomRightRadius: COL_WIDTH / 2,
    backgroundColor: RANGE_END_BG,
  },
  dayRangeMiddle: {
    backgroundColor: RANGE_MIDDLE_BG,
  },
  dayUnavailableSingle: {
    borderRadius: COL_WIDTH / 2,
    backgroundColor: '#E6E6E6',
  },
  dayUnavailableStart: {
    borderTopLeftRadius: COL_WIDTH / 2,
    borderBottomLeftRadius: COL_WIDTH / 2,
    backgroundColor: '#E6E6E6',
  },
  dayUnavailableEnd: {
    borderTopRightRadius: COL_WIDTH / 2,
    borderBottomRightRadius: COL_WIDTH / 2,
    backgroundColor: '#E6E6E6',
  },
  dayUnavailableMiddle: {
    backgroundColor: '#F2F2F2',
  },
  dayText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: DATE_BLUE,
  },
  dayTextUnavailable: {
    color: '#B5B5B5',
  },
  dayTextSunday: {
    color: DATE_RED_WEEKEND,
  },
  dayTextSelected: {
    color: '#fff',
  },
  daySunday: {},
  datesSection: {
    marginBottom: 24,
  },
  datesSectionTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 12 * scale,
    color: '#4A4A4A',
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  datesEmpty: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 13 * scale,
    color: '#9B9B9B',
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockedX: {
    fontSize: 16,
    color: '#C45C5C',
    marginRight: 10,
  },
  blockedRangeText: {
    flex: 1,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#4A4A4A',
  },
  hoursSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16 * scale,
  },
  hoursSectionTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 12 * scale,
    color: '#4A4A4A',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  hoursDescription: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 12 * scale,
    color: '#9B9B9B',
    lineHeight: 18 * scale,
    marginBottom: 14,
  },
  hoursToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  hoursToggleLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: '#4A4A4A',
  },
  hoursRow: {
    flexDirection: 'row',
    gap: 16,
  },
  hoursField: {
    flex: 1,
  },
  hoursLabel: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11 * scale,
    color: '#9B9B9B',
    marginBottom: 6,
  },
  hoursInput: {
    backgroundColor: 'rgba(249, 249, 249, 0.34)',
    borderWidth: 1,
    borderColor: 'rgb(163, 163, 163)',
    borderRadius: 5 * scale,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  hoursInputText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14 * scale,
    color: '#4A4A4A',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20 * scale,
    paddingTop: 16,
    backgroundColor: '#fff',
  },
  blockButton: {
    height: 50 * scale,
    backgroundColor: COLORS.GREENY_BLUE_TWO,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingSaveButton: {
    marginTop: 24,
    marginBottom: 24,
  },
  blockButtonText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  timePickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  timePickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    maxHeight: 320,
  },
  timePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  timePickerTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 16 * scale,
    color: '#4A4A4A',
  },
  timePickerDone: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16 * scale,
    color: COLORS.GREENY_BLUE_TWO,
  },
  timePickerWheel: {
    width: '100%',
    ...(Platform.OS === 'android' && { height: 180 }),
  },
  timePickerItem: {
    fontSize: 18,
  },
});

export default CalendarScreen;
