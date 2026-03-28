import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/fonts';
import { usePaymentMethods } from '../context/PaymentMethodsContext';
import { brandLabel } from '../utils/paymentMethodUtils';

const BASE_WIDTH = 375;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / BASE_WIDTH;

function BrandBadge({ method }) {
  if (method.type === 'paypal') {
    return (
      <View style={[styles.badge, styles.badgePaypal]}>
        <Text style={styles.badgeText}>PayPal</Text>
      </View>
    );
  }
  const b = method.brand || 'other';
  const bg =
    b === 'visa'
      ? '#1A1F71'
      : b === 'mastercard'
        ? '#000000'
        : b === 'amex'
          ? '#006FCF'
          : b === 'discover'
            ? '#FF6000'
            : '#4A4A4A';
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{brandLabel(b).toUpperCase()}</Text>
    </View>
  );
}

function methodSubtitle(method) {
  if (method.type === 'paypal') return method.email || '';
  return `XXXX - ${method.last4 || '????'}`;
}

export default function PaymentInformationScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('methods');
  const [manageMethod, setManageMethod] = useState(null);
  const { methods, defaultMethodId, removePaymentMethod, setDefaultPaymentMethod } =
    usePaymentMethods();

  const hasListingOrPayoutInfo = false;

  const handleGetPaidTab = () => {
    if (!hasListingOrPayoutInfo) {
      navigation.navigate('PayoutEmptyStateScreen');
    } else {
      setActiveTab('getpaid');
    }
  };

  const sortedMethods = useMemo(() => {
    const copy = [...methods];
    copy.sort((a, b) => {
      const aDef = a.id === defaultMethodId ? 0 : 1;
      const bDef = b.id === defaultMethodId ? 0 : 1;
      return aDef - bDef;
    });
    return copy;
  }, [methods, defaultMethodId]);

  const openEdit = (m) => {
    setManageMethod(null);
    if (m.type === 'paypal') {
      navigation.navigate('AddPayPalScreen', { editId: m.id });
    } else {
      navigation.navigate('AddCardScreen', { editId: m.id });
    }
  };

  const confirmDelete = (m) => {
    if (methods.length <= 1) {
      Alert.alert('Cannot remove', 'Add another payment method before removing this one.');
      return;
    }
    Alert.alert(
      'Remove payment method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removePaymentMethod(m.id);
            setManageMethod(null);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Svg width={23} height={23} viewBox="0 0 48 48" fill="none">
            <Path
              d="M31 8L17 24L31 40"
              stroke={COLORS.MANGO_TWO}
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
        <View style={styles.headerTextFlexWrapper}>
          <Text style={styles.headerText}>PAYMENT INFORMATION</Text>
        </View>
        <View style={styles.headerRightSpacer} />
      </View>

      <View style={styles.toggleRow}>
        <TouchableOpacity onPress={() => setActiveTab('methods')} style={styles.toggleTabButton}>
          <View style={styles.toggleTabInner}>
            <Text
              style={[
                styles.toggleTabText,
                activeTab === 'methods' ? styles.toggleTabTextActive : null,
              ]}
            >
              PAYMENT METHODS
            </Text>
            <View
              style={[
                styles.toggleUnderline,
                styles.toggleUnderlineMethods,
                activeTab === 'methods' && styles.toggleUnderlineActive,
              ]}
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleGetPaidTab} style={styles.toggleTabButton}>
          <View style={styles.toggleTabInner}>
            <Text
              style={[
                styles.toggleTabText,
                styles.toggleTabTextGetPaid,
                activeTab === 'getpaid' ? styles.toggleTabTextActiveGetPaid : null,
              ]}
            >
              GET PAID
            </Text>
            <View
              style={[
                styles.toggleUnderline,
                styles.toggleUnderlineGetPaid,
                activeTab === 'getpaid' && styles.toggleUnderlineActive,
              ]}
            />
          </View>
        </TouchableOpacity>
      </View>

      {activeTab === 'methods' && (
        <>
          {methods.length === 0 ? (
            <View style={styles.emptyStateWrapper}>
              <Text style={styles.emptyStateText}>You have no payment methods</Text>
              <TouchableOpacity
                style={styles.addPaymentButton}
                onPress={() => navigation.navigate('AddPaymentMethodScreen')}
              >
                <Text style={styles.addPaymentButtonText}>Add Payment Method</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {sortedMethods.map((m) => (
                <View key={m.id}>
                  <TouchableOpacity
                    style={styles.methodRow}
                    onPress={() => setManageMethod(m)}
                    activeOpacity={0.7}
                  >
                    <BrandBadge method={m} />
                    <View style={styles.methodTextCol}>
                      <Text style={styles.methodLine} numberOfLines={1}>
                        {methodSubtitle(m)}
                      </Text>
                      {m.id === defaultMethodId ? (
                        <Text style={styles.defaultPill}>Default</Text>
                      ) : null}
                    </View>
                    <Image
                      source={require('../assets/icons/arrow-button.png')}
                      style={styles.rowChevron}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  <View style={styles.listDivider} />
                </View>
              ))}
              <TouchableOpacity
                style={styles.addRow}
                onPress={() => navigation.navigate('AddPaymentMethodScreen')}
                activeOpacity={0.7}
              >
                <Text style={styles.addRowText}>Add Payment Method</Text>
                <Image
                  source={require('../assets/icons/arrow-button.png')}
                  style={styles.rowChevronTeal}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </ScrollView>
          )}
        </>
      )}

      {activeTab === 'getpaid' && (
        <View style={styles.emptyStateWrapper}>
          <Text style={styles.emptyStateText}>Get Paid screen coming soon...</Text>
        </View>
      )}

      <Modal
        visible={manageMethod != null}
        transparent
        animationType="fade"
        onRequestClose={() => setManageMethod(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropTap}
            activeOpacity={1}
            onPress={() => setManageMethod(null)}
          />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Payment method</Text>
            {manageMethod && (
              <>
                {manageMethod.id !== defaultMethodId ? (
                  <TouchableOpacity
                    style={styles.modalBtn}
                    onPress={() => {
                      setDefaultPaymentMethod(manageMethod.id);
                      setManageMethod(null);
                    }}
                  >
                    <Text style={styles.modalBtnText}>Set as default</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.modalBtn}
                  onPress={() => openEdit(manageMethod)}
                >
                  <Text style={styles.modalBtnText}>Edit</Text>
                </TouchableOpacity>
                {methods.length > 1 ? (
                  <TouchableOpacity
                    style={styles.modalBtn}
                    onPress={() => confirmDelete(manageMethod)}
                  >
                    <Text style={[styles.modalBtnText, styles.modalBtnDelete]}>Delete</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.modalCancel} onPress={() => setManageMethod(null)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: SCREEN_WIDTH,
    height: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  backButton: {
    marginRight: 16,
  },
  headerTextFlexWrapper: {
    flex: 1,
    marginLeft: 39,
    marginRight: 39,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightSpacer: {
    width: 39,
  },
  headerText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 15,
    color: 'rgb(100,100,100)',
    letterSpacing: 0.2,
    textAlign: 'center',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 24 * scale,
    marginBottom: 16 * scale,
  },
  toggleTabButton: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 20 * scale,
  },
  toggleTabInner: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  toggleTabText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    letterSpacing: 0.2,
    color: 'rgb(171,171,171)',
    width: 151 * scale,
    minHeight: 20 * scale,
    textAlign: 'center',
  },
  toggleTabTextActive: {
    color: 'rgb(14,38,43)',
  },
  toggleTabTextGetPaid: {
    width: 70 * scale,
  },
  toggleTabTextActiveGetPaid: {
    color: 'rgb(14,38,43)',
  },
  toggleUnderline: {
    height: 1 * scale,
    borderRadius: 5 * scale,
    backgroundColor: 'transparent',
    marginTop: 4 * scale,
  },
  toggleUnderlineActive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgb(255,199,83)',
    borderRadius: 5 * scale,
  },
  toggleUnderlineMethods: {
    width: 151 * scale,
  },
  toggleUnderlineGetPaid: {
    width: 70 * scale,
  },
  emptyStateWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 16,
    color: COLORS.BLACK,
    marginBottom: 24 * scale,
  },
  addPaymentButton: {
    width: 164 * scale,
    height: 20 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 0,
    marginTop: 0,
  },
  addPaymentButtonText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40 * scale,
    paddingHorizontal: 20 * scale,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16 * scale,
    paddingHorizontal: 4 * scale,
  },
  badge: {
    width: 56 * scale,
    height: 36 * scale,
    borderRadius: 4 * scale,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14 * scale,
  },
  badgePaypal: {
    backgroundColor: '#003087',
  },
  badgeText: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 9 * scale,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  methodTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  methodLine: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: '#000',
    letterSpacing: 0.2,
  },
  defaultPill: {
    marginTop: 4 * scale,
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 11,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
  },
  rowChevron: {
    width: 10 * scale,
    height: 16 * scale,
    tintColor: '#7EB8D4',
    marginLeft: 8 * scale,
  },
  rowChevronTeal: {
    width: 10 * scale,
    height: 16 * scale,
    tintColor: COLORS.GREENY_BLUE_TWO,
    marginLeft: 8 * scale,
  },
  listDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E0E0E0',
    marginLeft: 70 * scale,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18 * scale,
    paddingHorizontal: 4 * scale,
    marginTop: 4 * scale,
  },
  addRowText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 15,
    color: COLORS.GREENY_BLUE_TWO,
    letterSpacing: 0.2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBackdropTap: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 14 * scale,
    borderTopRightRadius: 14 * scale,
    paddingBottom: 28 * scale,
    paddingTop: 12 * scale,
  },
  modalTitle: {
    fontFamily: FONTS.NUNITO_BOLD,
    fontSize: 13,
    color: '#8E8E8E',
    textAlign: 'center',
    marginBottom: 8 * scale,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalBtn: {
    paddingVertical: 16 * scale,
    paddingHorizontal: 24 * scale,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  modalBtnText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 17,
    color: '#000',
    textAlign: 'center',
  },
  modalBtnDelete: {
    color: '#C62828',
  },
  modalCancel: {
    marginTop: 8 * scale,
    paddingVertical: 14 * scale,
  },
  modalCancelText: {
    fontFamily: FONTS.NUNITO_SEMIBOLD,
    fontSize: 17,
    color: COLORS.GREENY_BLUE_TWO,
    textAlign: 'center',
  },
});
