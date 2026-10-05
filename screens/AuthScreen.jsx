import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { signUpUser, loginUser, getAreas } from '../db/database';
import { tokens, useTheme } from '../lib/theme';

export default function AuthScreen({ onAuthSuccess }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  // Roles: 'citizen' or 'worker'
  const [role, setRole] = useState('citizen');
  // Mode: 'login' or 'signup'
  const [mode, setMode] = useState('login');

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [selectedAreaName, setSelectedAreaName] = useState('');
  const [password, setPassword] = useState('');

  // Areas list
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
      } catch (e) {
        console.warn('Could not load areas:', e);
      } finally {
        setAreasLoading(false);
      }
    }
    fetchAreasList();
  }, []);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setErrorMessage('');
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setErrorMessage('');
  };

  const handlePhoneChange = (val) => {
    let cleaned = val.replace(/\D/g, '');
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      cleaned = cleaned.slice(2);
    }
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = cleaned.slice(1);
    }
    if (cleaned.length > 10) {
      cleaned = cleaned.slice(0, 10);
    }
    setPhone(cleaned);
  };

  const handleSubmit = async () => {
    setErrorMessage('');

    if (mode === 'login') {
      if (!phone.trim() || !password.trim()) {
        setErrorMessage('Please enter both your phone number and password.');
        return;
      }
      if (phone.trim().length < 10) {
        setErrorMessage('Please enter a valid 10-digit mobile phone number.');
        return;
      }
      setLoading(true);
      try {
        const user = await loginUser({ role, phone: phone.trim(), password: password.trim() });
        onAuthSuccess(user);
      } catch (err) {
        setErrorMessage(err.message || 'Login failed.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!name.trim() || !phone.trim() || !password.trim() || !selectedAreaId) {
        setErrorMessage('Please fill out all required fields.');
        return;
      }
      if (phone.trim().length < 10) {
        setErrorMessage('Please enter a valid 10-digit mobile phone number.');
        return;
      }
      if (password.trim().length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      setLoading(true);
      try {
        const user = await signUpUser({
          role,
          name: name.trim(),
          phone: phone.trim(),
          areaId: selectedAreaId,
          password: password.trim(),
        });
        onAuthSuccess(user);
      } catch (err) {
        setErrorMessage(err.message || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  const renderInput = (label, value, onChangeText, fieldKey, props = {}) => {
    const isFocused = focusedInput === fieldKey;
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[styles.input, isFocused && styles.inputFocused]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocusedInput(fieldKey)}
          onBlur={() => setFocusedInput(null)}
          placeholderTextColor={colors.muted}
          {...props}
        />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={{ width: 44 }} />
            <Text style={styles.brandTitle}>SHODHINI</Text>
            <TouchableOpacity 
              style={styles.themeToggleBtn} 
              onPress={toggleTheme}
              accessibilityLabel={isDark ? "Switch to Day Mode" : "Switch to Night Mode"}
              activeOpacity={0.7}
            >
              <Text style={styles.themeToggleIcon}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.brandSubtitle}>Waste Management System</Text>
        </View>

        <Text style={styles.sectionLabel}>Select Your Role</Text>
        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[styles.roleTab, role === 'citizen' && styles.activeRoleTab]}
            onPress={() => handleRoleChange('citizen')}
            activeOpacity={0.7}
          >
            <Text style={[styles.roleTabText, role === 'citizen' && styles.activeRoleTabText]}>
              Citizen / User
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleTab, role === 'worker' && styles.activeRoleTab]}
            onPress={() => handleRoleChange('worker')}
            activeOpacity={0.7}
          >
            <Text style={[styles.roleTabText, role === 'worker' && styles.activeRoleTabText]}>
              Garbage Collector
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'login' && styles.activeModeTab]}
            onPress={() => handleModeChange('login')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeTabText, mode === 'login' && styles.activeModeTabText]}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'signup' && styles.activeModeTab]}
            onPress={() => handleModeChange('signup')}
            activeOpacity={0.7}
          >
            <Text style={[styles.modeTabText, mode === 'signup' && styles.activeModeTabText]}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>
            {role === 'citizen' ? 'Citizen' : 'Garbage Collector'} {mode === 'login' ? 'Login' : 'Registration'}
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {mode === 'signup' && (
            <>
              {renderInput('Full Name', name, setName, 'name', {
                autoCapitalize: 'words',
                placeholder: 'Enter your full name',
                placeholderTextColor: colors.muted,
              })}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {role === 'worker' ? 'Operating / Work Area' : 'Your Area / Ward'}
                </Text>
                <TouchableOpacity
                  style={[styles.areaPickerBtn, areasLoading && styles.areaPickerBtnDisabled]}
                  onPress={() => setAreaModalVisible(true)}
                  disabled={areasLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.areaPickerText}>
                    {areasLoading ? 'Loading areas...' : `📍 ${selectedAreaName || 'Select Ward / Area'}`}
                  </Text>
                  <Text style={styles.areaPickerArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Mobile Phone Number with Country Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Phone Number</Text>
            <View style={[styles.phoneInputRow, focusedInput === 'phone' && styles.inputFocused]}>
              <View style={styles.phonePrefixBadge}>
                <Text style={styles.phonePrefixText}>🇮🇳 +91</Text>
              </View>
              <TextInput
                style={styles.phoneInputFlex}
                value={phone}
                onChangeText={handlePhoneChange}
                onFocus={() => setFocusedInput('phone')}
                onBlur={() => setFocusedInput(null)}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          {/* Password */}
          {renderInput('Password', password, setPassword, 'password', {
            secureTextEntry: true,
            placeholder: mode === 'login' ? 'Enter your password' : 'Create password (min 6 chars)',
            placeholderTextColor: colors.muted,
          })}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === 'login' ? 'Log In with Phone' : 'Sign Up with Phone'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchModeLink}
            onPress={() => handleModeChange(mode === 'login' ? 'signup' : 'login')}
            activeOpacity={0.7}
          >
            <Text style={styles.switchModeText}>
              {mode === 'login'
                ? "Don't have an account? Sign Up with Phone"
                : 'Already registered? Log In with Phone'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={areaModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAreaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Area</Text>
              <TouchableOpacity
                onPress={() => setAreaModalVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {areas.map((a) => {
                const isSelected = a.id === selectedAreaId;
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.areaOption, isSelected && styles.areaOptionSelected]}
                    onPress={() => {
                      setSelectedAreaId(a.id);
                      setSelectedAreaName(a.name);
                      setAreaModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.areaOptionText, isSelected && styles.areaOptionTextSelected]}>
                      📍 {a.name}
                    </Text>
                    {isSelected && <Text style={styles.areaCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xl,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
    width: '100%',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
  },
  themeToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggleIcon: {
    fontSize: 20,
  },
  brandTitle: {
    fontSize: tokens.typography.size.xxl,
    fontWeight: tokens.typography.weight.extrabold,
    color: colors.accent,
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: tokens.typography.size.sm,
    color: colors.muted,
    marginTop: tokens.spacing.xs,
  },
  sectionLabel: {
    alignSelf: 'flex-start',
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.semibold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: tokens.spacing.sm,
  },
  roleSelector: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.xs,
    marginBottom: tokens.spacing.md,
  },
  roleTab: {
    flex: 1,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  activeRoleTab: {
    backgroundColor: colors.card,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.border,
    ...tokens.shadow.sm,
  },
  roleTabText: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.semibold,
    color: colors.muted,
  },
  activeRoleTabText: {
    color: colors.text,
  },
  modeSelector: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 400,
    borderBottomWidth: 2,
    borderColor: colors.border,
    marginBottom: tokens.spacing.lg,
  },
  modeTab: {
    flex: 1,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minHeight: 44,
  },
  activeModeTab: {
    borderBottomColor: colors.accent,
  },
  modeTabText: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.semibold,
    color: colors.muted,
  },
  activeModeTabText: {
    color: colors.accent,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    ...tokens.shadow.md,
  },
  cardHeader: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.bold,
    color: colors.text,
    marginBottom: tokens.spacing.md,
  },
  errorBox: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: tokens.typography.size.sm,
  },
  inputGroup: {
    marginBottom: tokens.spacing.md,
  },
  label: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.medium,
    color: colors.text,
    marginBottom: tokens.spacing.xs,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.size.base,
    color: colors.text,
    minHeight: 44,
  },
  inputFocused: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
    minHeight: 44,
  },
  phonePrefixBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.inputBorder,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  phonePrefixText: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.bold,
    color: colors.text,
  },
  phoneInputFlex: {
    flex: 1,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.size.base,
    color: colors.text,
    minHeight: 44,
  },
  areaPickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    minHeight: 44,
  },
  areaPickerBtnDisabled: {
    opacity: 0.6,
  },
  areaPickerText: {
    fontSize: tokens.typography.size.base,
    color: colors.text,
  },
  areaPickerArrow: {
    fontSize: tokens.typography.size.xs,
    color: colors.muted,
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
    marginTop: tokens.spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
  },
  switchModeLink: {
    marginTop: tokens.spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  switchModeText: {
    color: colors.accent,
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    maxHeight: '60%',
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
    paddingBottom: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: colors.text,
  },
  modalCloseBtn: {
    padding: tokens.spacing.sm,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: tokens.typography.size.lg,
    color: colors.muted,
  },
  modalList: {
    marginBottom: tokens.spacing.sm,
  },
  areaOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.spacing.xs,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  areaOptionSelected: {
    backgroundColor: isDark ? colors.card : colors.background,
    borderColor: colors.accent,
    borderWidth: 1,
  },
  areaOptionText: {
    fontSize: tokens.typography.size.base,
    color: colors.text,
  },
  areaOptionTextSelected: {
    color: colors.accent,
    fontWeight: tokens.typography.weight.bold,
  },
  areaCheck: {
    color: colors.accent,
    fontWeight: tokens.typography.weight.bold,
    fontSize: tokens.typography.size.base,
  },
});
