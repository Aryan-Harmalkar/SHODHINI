import React, { useState, useEffect } from 'react';
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
import { tokens } from '../lib/theme';

export default function AuthScreen({ onAuthSuccess }) {
  // Roles: 'citizen' or 'worker'
  const [role, setRole] = useState('citizen');
  // Mode: 'login' or 'signup'
  const [mode, setMode] = useState('login');

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [identifier, setIdentifier] = useState('');
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

  const handleSubmit = async () => {
    setErrorMessage('');

    if (mode === 'login') {
      if (!identifier.trim() || !password.trim()) {
        setErrorMessage('Please enter both your identifier and password.');
        return;
      }
      setLoading(true);
      try {
        const user = await loginUser({ role, identifier, password });
        onAuthSuccess(user);
      } catch (err) {
        setErrorMessage(err.message || 'Login failed.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!name.trim() || !phone.trim() || !identifier.trim() || !password.trim() || !selectedAreaId) {
        setErrorMessage('Please fill out all fields.');
        return;
      }
      setLoading(true);
      try {
        const user = await signUpUser({
          role,
          name: name.trim(),
          phone: phone.trim(),
          identifier: identifier.trim(),
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
          <Text style={styles.brandTitle}>SHODHINI</Text>
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
              {renderInput('Full Name', name, setName, 'name', { autoCapitalize: 'words' })}
              {renderInput('Phone Number', phone, setPhone, 'phone', { keyboardType: 'phone-pad' })}
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

          {renderInput(
            mode === 'signup' ? 'Email / Username' : 'Username / Email / Phone',
            identifier,
            setIdentifier,
            'identifier',
            { autoCapitalize: 'none', autoCorrect: false }
          )}

          {renderInput('Password', password, setPassword, 'password', { secureTextEntry: true })}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color={tokens.colors.background} />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === 'login' ? 'Log In' : 'Sign Up'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchModeLink}
            onPress={() => handleModeChange(mode === 'login' ? 'signup' : 'login')}
            activeOpacity={0.7}
          >
            <Text style={styles.switchModeText}>
              {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
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

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: tokens.colors.surface,
  },
  scrollContainer: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xl,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  brandTitle: {
    fontSize: tokens.typography.size.xxl,
    fontWeight: tokens.typography.weight.extrabold,
    color: tokens.colors.accent,
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: tokens.typography.size.sm,
    color: tokens.colors.muted,
    marginTop: tokens.spacing.xs,
  },
  sectionLabel: {
    alignSelf: 'flex-start',
    fontSize: tokens.typography.size.xs,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: tokens.spacing.sm,
  },
  roleSelector: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: tokens.colors.border,
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
    backgroundColor: tokens.colors.background,
    ...tokens.shadow.sm,
  },
  roleTabText: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.muted,
  },
  activeRoleTabText: {
    color: tokens.colors.text,
  },
  modeSelector: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 2,
    borderColor: tokens.colors.border,
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
    borderBottomColor: tokens.colors.accent,
  },
  modeTabText: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.semibold,
    color: tokens.colors.muted,
  },
  activeModeTabText: {
    color: tokens.colors.accent,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    ...tokens.shadow.md,
  },
  cardHeader: {
    fontSize: tokens.typography.size.lg,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.md,
  },
  errorBox: {
    backgroundColor: '#fef2f2', // light red
    borderWidth: 1,
    borderColor: tokens.colors.danger,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
  },
  errorText: {
    color: tokens.colors.danger,
    fontSize: tokens.typography.size.sm,
  },
  inputGroup: {
    marginBottom: tokens.spacing.md,
  },
  label: {
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.medium,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  input: {
    backgroundColor: tokens.colors.background,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.size.base,
    color: tokens.colors.text,
    minHeight: 44,
  },
  inputFocused: {
    borderColor: tokens.colors.borderFocus,
    borderWidth: 2,
  },
  areaPickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.colors.background,
    borderWidth: 1,
    borderColor: tokens.colors.border,
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
    color: tokens.colors.text,
  },
  areaPickerArrow: {
    fontSize: tokens.typography.size.xs,
    color: tokens.colors.muted,
  },
  submitButton: {
    backgroundColor: tokens.colors.accent,
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
    color: tokens.colors.background,
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
    color: tokens.colors.accent,
    fontSize: tokens.typography.size.sm,
    fontWeight: tokens.typography.weight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: tokens.colors.background,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    maxHeight: '60%',
    padding: tokens.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
    paddingBottom: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  modalTitle: {
    fontSize: tokens.typography.size.base,
    fontWeight: tokens.typography.weight.bold,
    color: tokens.colors.text,
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
    color: tokens.colors.muted,
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
    backgroundColor: tokens.colors.surface,
    minHeight: 48,
  },
  areaOptionSelected: {
    backgroundColor: tokens.colors.background,
    borderColor: tokens.colors.accent,
    borderWidth: 1,
  },
  areaOptionText: {
    fontSize: tokens.typography.size.base,
    color: tokens.colors.text,
  },
  areaOptionTextSelected: {
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.bold,
  },
  areaCheck: {
    color: tokens.colors.accent,
    fontWeight: tokens.typography.weight.bold,
    fontSize: tokens.typography.size.base,
  },
});
