import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
  Animated,
} from 'react-native';
import { signUpUser, loginUser, getAreas } from '../db/database';
import { tokens, useTheme } from '../lib/theme';

function NestedButton({ onPress, title, loading, disabled, isDark, colors }) {
  const [scaleValue] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }], width: '100%', marginTop: tokens.spacing.md }}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={1}
        style={[
          styles.nestedButtonShell,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <View style={[styles.nestedButtonCore, { backgroundColor: colors.accent }]}>
          {loading ? (
            <ActivityIndicator color={isDark ? '#000' : '#fff'} />
          ) : (
            <>
              <Text style={[styles.nestedButtonText, { color: isDark ? '#000' : '#fff' }]}>{title}</Text>
              <View style={[styles.nestedButtonIconWrap, { backgroundColor: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }]}>
                <Text style={{ color: isDark ? '#000' : '#fff', fontSize: 16, fontFamily: tokens.typography.family.semibold }}>↗</Text>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function AuthScreen({ onAuthSuccess }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const dynamicStyles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [role, setRole] = useState('citizen');
  const [mode, setMode] = useState('login');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [selectedAreaName, setSelectedAreaName] = useState('');
  const [password, setPassword] = useState('');

  const [areas, setAreas] = useState([]);
  const [areasLoading, setAreasLoading] = useState(true);
  const [areaModalVisible, setAreaModalVisible] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  useEffect(() => {
    async function fetchAreasList() {
      setAreasLoading(true);
      try {
        const list = await getAreas();
        setAreas(list);
        if (list.length > 0) {
          setSelectedAreaId(list[0].id);
          setSelectedAreaName(list[0].name);
        }
      } catch (err) {
        console.error('Failed to fetch areas', err);
      } finally {
        setAreasLoading(false);
      }
    }
    fetchAreasList();
  }, []);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setErrorMessage('');
    setPhone('');
    setPassword('');
    setName('');
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setErrorMessage('');
  };

  const handlePhoneChange = (text) => {
    setPhone(text.replace(/[^0-9]/g, ''));
  };

  const handleSubmit = async () => {
    if (!phone || phone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }


    setErrorMessage('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const user = await signUpUser({
          phone: `+91${phone}`,
          password,
          name: name.trim(),
          role,
          areaId: selectedAreaId,
        });
        if (user) {
          onAuthSuccess(user);
        }
      } else {
        const user = await loginUser({
          phone: `+91${phone}`,
          password,
          role,
        });
        if (user) {
          onAuthSuccess(user);
        }
      }
    } catch (error) {
      setErrorMessage(error.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label, value, setter, inputKey, props = {}) => (
    <View style={dynamicStyles.inputGroup}>
      <Text style={dynamicStyles.label}>{label}</Text>
      <View style={[dynamicStyles.inputWrapper, focusedInput === inputKey && dynamicStyles.inputFocused]}>
        <TextInput
          style={dynamicStyles.input}
          value={value}
          onChangeText={setter}
          onFocus={() => setFocusedInput(inputKey)}
          onBlur={() => setFocusedInput(null)}
          placeholderTextColor={colors.muted}
          {...props}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={dynamicStyles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={dynamicStyles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={dynamicStyles.eyebrowWrap}>
          <View style={dynamicStyles.eyebrowBadge}>
            <Text style={dynamicStyles.eyebrowText}>SYSTEM {Platform.OS.toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={dynamicStyles.themeToggleBtn} onPress={toggleTheme} activeOpacity={0.7}>
            <Text style={dynamicStyles.themeToggleIcon}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>

        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.brandTitle}>SHODHINI</Text>
          <Text style={dynamicStyles.brandSubtitle}>Village Panchayat Assagao • Clean Waste</Text>
        </View>

        <View style={dynamicStyles.authCard}>
            <View style={dynamicStyles.roleSelector}>
              <TouchableOpacity style={[dynamicStyles.roleTab, role === 'citizen' && dynamicStyles.activeRoleTab]} onPress={() => handleRoleChange('citizen')} activeOpacity={0.8}>
                <Text style={[dynamicStyles.roleTabText, role === 'citizen' && dynamicStyles.activeRoleTabText]}>Citizen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[dynamicStyles.roleTab, role === 'worker' && dynamicStyles.activeRoleTab]} onPress={() => handleRoleChange('worker')} activeOpacity={0.8}>
                <Text style={[dynamicStyles.roleTabText, role === 'worker' && dynamicStyles.activeRoleTabText]}>Collector</Text>
              </TouchableOpacity>
            </View>

            <View style={dynamicStyles.modeSelector}>
              <Text style={dynamicStyles.cardHeader}>
                {mode === 'login' ? 'Log In' : 'Sign Up'}
              </Text>
              <TouchableOpacity onPress={() => handleModeChange(mode === 'login' ? 'signup' : 'login')}>
                <Text style={dynamicStyles.switchModeText}>
                  {mode === 'login' ? 'Create Account' : 'Existing User?'}
                </Text>
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <View style={dynamicStyles.errorBox}>
                <Text style={dynamicStyles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {mode === 'signup' && (
              <>
                {renderInput('Full Name', name, setName, 'name', {
                  autoCapitalize: 'words',
                  placeholder: 'Enter your full name',
                })}

              </>
            )}

            <View style={dynamicStyles.inputGroup}>
              <Text style={dynamicStyles.label}>Mobile Phone Number</Text>
              <View style={[dynamicStyles.phoneInputRow, focusedInput === 'phone' && dynamicStyles.inputFocused]}>
                <View style={dynamicStyles.phonePrefixBadge}>
                  <Text style={dynamicStyles.phonePrefixText}>+91</Text>
                </View>
                <TextInput
                  style={dynamicStyles.phoneInputFlex}
                  value={phone}
                  onChangeText={handlePhoneChange}
                  onFocus={() => setFocusedInput('phone')}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="10-digit number"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>

            {renderInput('Password', password, setPassword, 'password', {
              secureTextEntry: true,
              placeholder: mode === 'login' ? 'Enter password' : 'Min 6 characters',
            })}

            <NestedButton 
              onPress={handleSubmit} 
              title={mode === 'login' ? 'Access Account' : 'Register Account'}
              loading={loading}
              isDark={isDark}
              colors={colors}
            />
          </View>
      </ScrollView>


    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  nestedButtonShell: {
    padding: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  nestedButtonCore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 9999,
    minHeight: 56,
  },
  nestedButtonText: {
    fontFamily: tokens.typography.family.bold,
    fontSize: tokens.typography.size.base,
    letterSpacing: 0.5,
  },
  nestedButtonIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
  },
});

const getStyles = (colors, isDark) => StyleSheet.create({
  keyboardContainer: { flex: 1, backgroundColor: colors.background },
  scrollContainer: { flexGrow: 1, padding: tokens.spacing.lg, paddingBottom: tokens.spacing.xxl, justifyContent: 'center' },
  eyebrowWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.xl, width: '100%', maxWidth: 440, alignSelf: 'center' },
  eyebrowBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  eyebrowText: { fontFamily: tokens.typography.family.semibold, fontSize: 10, letterSpacing: 2, color: colors.muted },
  themeToggleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  themeToggleIcon: { fontSize: 18 },
  header: { marginBottom: tokens.spacing.xl, width: '100%', maxWidth: 440, alignSelf: 'center' },
  brandTitle: { fontFamily: tokens.typography.family.extrabold, fontSize: tokens.typography.size.xxxl, color: colors.text, letterSpacing: -1, lineHeight: 52 },
  brandSubtitle: { fontFamily: tokens.typography.family.medium, fontSize: tokens.typography.size.base, color: colors.muted, marginTop: tokens.spacing.xs },
  
  authCard: {
    width: '100%', maxWidth: 440, alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: 32,
    padding: tokens.spacing.xl,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    ...(isDark ? {} : tokens.shadow.xl),
  },

  roleSelector: { flexDirection: 'row', backgroundColor: colors.background, padding: 4, borderRadius: tokens.radius.full, marginBottom: tokens.spacing.xl },
  roleTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: tokens.radius.full },
  activeRoleTab: { backgroundColor: colors.card, ...(isDark ? {} : tokens.shadow.sm) },
  roleTabText: { fontFamily: tokens.typography.family.medium, fontSize: tokens.typography.size.sm, color: colors.muted },
  activeRoleTabText: { fontFamily: tokens.typography.family.bold, color: colors.text },
  
  modeSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: tokens.spacing.lg },
  cardHeader: { fontFamily: tokens.typography.family.bold, fontSize: tokens.typography.size.xl, color: colors.text },
  switchModeText: { fontFamily: tokens.typography.family.medium, fontSize: tokens.typography.size.sm, color: colors.muted, textDecorationLine: 'underline' },
  
  errorBox: { 
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fecaca',
    padding: tokens.spacing.md, 
    borderRadius: tokens.radius.lg, 
    marginBottom: tokens.spacing.lg 
  },
  errorText: { fontFamily: tokens.typography.family.medium, color: '#ef4444', fontSize: tokens.typography.size.sm, textAlign: 'center' },
  
  inputGroup: { marginBottom: tokens.spacing.lg },
  label: { fontFamily: tokens.typography.family.semibold, fontSize: tokens.typography.size.xs, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: tokens.spacing.sm },
  inputWrapper: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, borderRadius: tokens.radius.lg, overflow: 'hidden' },
  inputFocused: { borderColor: colors.text },
  input: { fontFamily: tokens.typography.family.regular, fontSize: tokens.typography.size.base, color: colors.text, paddingHorizontal: tokens.spacing.md, paddingVertical: 16 },
  
  phoneInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, borderRadius: tokens.radius.lg, overflow: 'hidden' },
  phonePrefixBadge: { paddingHorizontal: tokens.spacing.lg, paddingVertical: 16, borderRightWidth: 1, borderRightColor: colors.border, justifyContent: 'center' },
  phonePrefixText: { fontFamily: tokens.typography.family.bold, fontSize: tokens.typography.size.base, color: colors.text },
  phoneInputFlex: { flex: 1, fontFamily: tokens.typography.family.regular, fontSize: tokens.typography.size.base, color: colors.text, paddingHorizontal: tokens.spacing.lg, paddingVertical: 16 },
  
  areaPickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, borderRadius: tokens.radius.lg, paddingLeft: tokens.spacing.lg, paddingRight: 8, paddingVertical: 8 },
  areaPickerBtnDisabled: { opacity: 0.6 },
  areaPickerText: { fontFamily: tokens.typography.family.medium, fontSize: tokens.typography.size.base, color: colors.text },
  areaPickerIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  areaPickerArrow: { fontSize: 10, color: colors.muted },

  modalOverlay: { flex: 1, backgroundColor: colors.modalOverlay, justifyContent: 'flex-end', padding: tokens.spacing.sm },
  modalCard: { backgroundColor: colors.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '80%', padding: tokens.spacing.xl, paddingBottom: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.xl },
  modalTitle: { fontFamily: tokens.typography.family.bold, fontSize: tokens.typography.size.lg, color: colors.text },
  modalCloseBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontFamily: tokens.typography.family.bold, fontSize: tokens.typography.size.base, color: colors.text },
  modalList: { marginBottom: tokens.spacing.md },
  areaOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: tokens.spacing.lg, borderRadius: tokens.radius.lg, marginBottom: tokens.spacing.sm, backgroundColor: colors.background },
  areaOptionSelected: { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#000' },
  areaOptionText: { fontFamily: tokens.typography.family.medium, fontSize: tokens.typography.size.base, color: colors.text },
  areaOptionTextSelected: { color: isDark ? '#fff' : '#fff', fontFamily: tokens.typography.family.bold },
  areaCheck: { fontFamily: tokens.typography.family.bold, color: isDark ? '#fff' : '#fff', fontSize: tokens.typography.size.base },
});
