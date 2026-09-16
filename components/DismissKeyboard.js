import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * Layout wrapper. Keyboard dismiss is handled per ScrollView via keyboardDismissMode.
 * Avoid TouchableWithoutFeedback here — it steals pan gestures from ScrollViews.
 */
export default function DismissKeyboard({ children, style }) {
  return <View style={style || styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
