import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

/**
 * Catches React render errors after splash so a bad provider/screen cannot
 * take down the whole process without a recoverable UI.
 */
export default class AppErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.warn('[AppErrorBoundary]', error?.message || error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const detail = String(this.state.error?.message || this.state.error || '').slice(0, 280);
      return (
        <View style={styles.box}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>Please try again. If this keeps happening, reinstall the app.</Text>
          {detail ? (
            <ScrollView style={styles.detailBox} contentContainerStyle={styles.detailInner}>
              <Text style={styles.detail} selectable>
                {detail}
              </Text>
            </ScrollView>
          ) : null}
          <TouchableOpacity style={styles.btn} onPress={this.handleRetry} activeOpacity={0.85}>
            <Text style={styles.btnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: '#DFF2F1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0B3B3A',
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#335958',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 22,
  },
  detailBox: {
    maxHeight: 120,
    width: '100%',
    marginBottom: 18,
  },
  detailInner: {
    paddingHorizontal: 4,
  },
  detail: {
    fontSize: 12,
    color: '#5A7473',
    textAlign: 'center',
    lineHeight: 17,
  },
  btn: {
    backgroundColor: '#0B8F89',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
