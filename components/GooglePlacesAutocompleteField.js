import React, { useRef, useState, useEffect } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { FONTS } from '../constants/fonts';
import {
  getGooglePlacesApiKey,
  getGooglePlacesRequestUrl,
  PLACES_QUERY_DEFAULTS,
} from '../utils/placesConfig';
import { placeSelectionToSearchQuery } from '../utils/placeDetails';

function createSessionToken() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const INPUT_HEIGHT = 49;

/**
 * Google Places Autocomplete with session tokens and 300ms debounce.
 */
export default function GooglePlacesAutocompleteField({
  placeholder = 'City, airport, address, or hotel',
  types,
  fetchDetails = true,
  onPlaceSelected,
  onFocus,
  containerStyle,
  inputStyle,
  initialValue = '',
  onChangeText,
}) {
  const ref = useRef(null);
  const [sessionToken, setSessionToken] = useState(() => createSessionToken());
  const [apiError, setApiError] = useState('');
  const requestUrl = getGooglePlacesRequestUrl();
  const directApiKey = getGooglePlacesApiKey();
  const useServerProxy = Boolean(requestUrl);

  useEffect(() => {
    if (!initialValue || !ref.current?.setAddressText) return;
    ref.current.setAddressText(initialValue);
  }, [initialValue]);

  if (!useServerProxy && !directApiKey) {
    return (
      <View style={[styles.wrapper, containerStyle]}>
        <TextInput
          style={[styles.textInput, inputStyle]}
          placeholder={placeholder}
          placeholderTextColor="#8E8E8E"
          editable={false}
        />
        <Text style={styles.configError}>
          Location search is unavailable — Google Places API key is not configured.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <GooglePlacesAutocomplete
        ref={ref}
        placeholder={placeholder}
        minLength={2}
        debounce={300}
        fetchDetails={fetchDetails}
        enablePoweredByContainer
        keyboardShouldPersistTaps="always"
        listViewDisplayed="auto"
        keepResultsAfterBlur={false}
        disableScroll={false}
        requestUrl={requestUrl}
        onFail={(message) => {
          const text =
            typeof message === 'string' && message.trim()
              ? message
              : 'Could not load suggestions. Check that Places API is enabled on the server key.';
          setApiError(text);
        }}
        query={{
          key: useServerProxy ? 'via-server' : directApiKey,
          ...PLACES_QUERY_DEFAULTS,
          sessiontoken: sessionToken,
          ...(types ? { types } : {}),
        }}
        GooglePlacesDetailsQuery={{
          sessiontoken: sessionToken,
        }}
        onPress={(data, details = null) => {
          setApiError('');
          const selection = placeSelectionToSearchQuery(data, details);
          onPlaceSelected?.({ data, details, selection });
          setSessionToken(createSessionToken());
        }}
        textInputProps={{
          placeholderTextColor: '#8E8E8E',
          onChangeText: (text) => onChangeText?.(text),
          onFocus: () => {
            setApiError('');
            onFocus?.();
          },
        }}
        styles={{
          container: styles.container,
          textInputContainer: styles.textInputContainer,
          textInput: [styles.textInput, inputStyle],
          listView: styles.listView,
          row: styles.row,
          description: styles.description,
          poweredContainer: styles.poweredContainer,
          powered: styles.powered,
        }}
      />
      {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 1000,
    elevation: 1000,
    position: 'relative',
  },
  container: {
    flex: 0,
    position: 'relative',
    zIndex: 1000,
    elevation: 1000,
  },
  textInputContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 0,
  },
  textInput: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: '#222',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgb(224,224,224)',
    borderRadius: 5,
    height: INPUT_HEIGHT,
    paddingHorizontal: 12,
    margin: 0,
  },
  listView: {
    position: 'absolute',
    top: INPUT_HEIGHT + 4,
    left: 0,
    right: 0,
    maxHeight: 220,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgb(224,224,224)',
    borderRadius: 8,
    zIndex: 2000,
    elevation: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {},
    }),
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  description: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 14,
    color: '#222',
  },
  poweredContainer: {
    justifyContent: 'flex-end',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  powered: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: 'rgb(142,142,142)',
  },
  configError: {
    marginTop: 6,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: 'rgb(233,128,128)',
  },
  apiError: {
    marginTop: 6,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: 'rgb(233,128,128)',
  },
});
