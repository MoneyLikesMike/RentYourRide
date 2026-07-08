import { AppRegistry, ScrollView, FlatList } from 'react-native';

import App from './App';

if (ScrollView.defaultProps == null) {
  ScrollView.defaultProps = {};
}
ScrollView.defaultProps.keyboardShouldPersistTaps = 'never';
ScrollView.defaultProps.keyboardDismissMode = 'on-drag';

if (FlatList.defaultProps == null) {
  FlatList.defaultProps = {};
}
FlatList.defaultProps.keyboardShouldPersistTaps = 'never';
FlatList.defaultProps.keyboardDismissMode = 'on-drag';

AppRegistry.registerComponent('main', () => App);
