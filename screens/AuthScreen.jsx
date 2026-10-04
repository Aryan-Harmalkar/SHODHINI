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
  const [areaModalVisible, setAreaModalVisible] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchAreasList() {
      try {
        const list = await getAreas();
        setAreas(list);
        if (list.length > 0) {
          setSelectedAreaId(list[0].id);
          setSelectedAreaName(list[0].name);
        }
      } catch (e) {
        console.warn('Could not load areas:', e);
      }
    }
    fetchAreasList();
  }, []);

  const resetForm = () => {
    setName('');
    setPhone('');
    setIdentifier('');
    setPassword('');
    setErrorMessage('');
    if (areas.length > 0) {
      setSelectedAreaId(areas[0].id);
      setSelectedAreaName(areas[0].name);
    }
  };

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
        setErrorMessage(err.message || 'Login failed. Please check your credentials.');
      } finally {
        setLoading(false);
      }
    } else {
      // Sign Up validation
      if (!name.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (!phone.trim()) {
        setErrorMessage('Please enter your phone number.');
        return;
      }
      if (!identifier.trim()) {
        setErrorMessage('Please enter your email or username.');
        return;
      }
      if (!selectedAreaId) {
        if (role === 'worker') {
          setErrorMessage('Please specify the area where you operate/work.');
        } else {
          setErrorMessage('Please select your residential area/ward.');
        }
        return;
      }
      if (!password.trim() || password.length < 4) {
        setErrorMessage('Password must be at least 4 characters long.');
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
        setErrorMessage(err.message || 'Registration failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* App Branding */}
        <View style={styles.header}>
          <Text style={styles.brandTitle}>SHODHINI</Text>
          <Text style={styles.brandSubtitle}>Waste Management System</Text>
        </View>

        {/* Top Role Selector */}
        <Text style={styles.sectionLabel}>Select Your Role</Text>
        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[styles.roleTab, role === 'citizen' && styles.activeRoleTab]}
            onPress={() => handleRoleChange('citizen')}
          >
            <Text style={[styles.roleTabText, role === 'citizen' && styles.activeRoleTabText]}>
              Citizen / User
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleTab, role === 'worker' && styles.activeRoleTab]}
            onPress={() => handleRoleChange('worker')}
          >
            <Text style={[styles.roleTabText, role === 'worker' && styles.activeRoleTabText]}>
              Garbage Collector
            </Text>
          </TouchableOpacity>
        </View>

        {/* Auth Mode Toggle (Login vs Sign Up) */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'login' && styles.activeModeTab]}
            onPress={() => handleModeChange('login')}
          >
            <Text style={[styles.modeTabText, mode === 'login' && styles.activeModeTabText]}>
              Log In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'signup' && styles.activeModeTab]}
            onPress={() => handleModeChange('signup')}
          >
            <Text style={[styles.modeTabText, mode === 'signup' && styles.activeModeTabText]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>
            {role === 'citizen' ? 'Citizen' : 'Garbage Collector'}{' '}
            {mode === 'login' ? 'Login' : 'Registration'}
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Sign Up Specific Fields */}
          {mode === 'signup' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Area Picker (Required for both Workers & Citizens) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {role === 'worker' ? 'Operating / Work Area' : 'Your Area / Ward'}
                </Text>
                <TouchableOpacity
                  style={styles.areaPickerBtn}
                  onPress={() => setAreaModalVisible(true)}
                >
                  <Text style={styles.areaPickerText}>
                    📍 {selectedAreaName || 'Select Ward / Area'}
                  </Text>
                  <Text style={styles.areaPickerArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Common Identifier Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {mode === 'signup'
                ? 'Email / Username'
                : 'Username / Email / Phone'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={
                mode === 'signup'
                  ? 'Enter email or username'
                  : 'Enter username, email, or phone'
              }
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === 'login'
                  ? `Log In as ${role === 'citizen' ? 'Citizen' : 'Collector'}`
                  : `Sign Up as ${role === 'citizen' ? 'Citizen' : 'Collector'}`}
              </Text>
            )}
          </TouchableOpacity>

          {/* Quick Toggle Bottom Link */}
          <TouchableOpacity
            style={styles.switchModeLink}
            onPress={() => handleModeChange(mode === 'login' ? 'signup' : 'login')}
          >
            <Text style={styles.switchModeText}>
              {mode === 'login'
                ? "Don't have an account? Sign Up"
                : 'Already have an account? Log In'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Area Selection Modal */}
      <Modal
        visible={areaModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAreaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {role === 'worker' ? 'Select Operating Area' : 'Select Residential Ward'}
              </Text>
              <TouchableOpacity
                onPress={() => setAreaModalVisible(false)}
                style={styles.modalCloseBtn}
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
                  >
                    <Text
                      style={[
                        styles.areaOptionText,
                        isSelected && styles.areaOptionTextSelected,
                      ]}
                    >
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
    backgroundColor: '#f4f6f8',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2e7d32',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 15,
    color: '#555',
    marginTop: 4,
  },
  sectionLabel: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  roleSelector: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeRoleTab: {
    backgroundColor: '#2e7d32',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  roleTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  activeRoleTabText: {
    color: '#ffffff',
  },
  modeSelector: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 2,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeModeTab: {
    borderBottomColor: '#2e7d32',
  },
  modeTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#777',
  },
  activeModeTabText: {
    color: '#2e7d32',
  },
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#c62828',
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#222',
  },
  areaPickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f8e9',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  areaPickerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2e7d32',
  },
  areaPickerArrow: {
    fontSize: 12,
    color: '#2e7d32',
  },
  submitButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  switchModeLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchModeText: {
    color: '#2e7d32',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2e7d32',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  modalList: {
    marginBottom: 10,
  },
  areaOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#fafafa',
  },
  areaOptionSelected: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  areaOptionText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  areaOptionTextSelected: {
    color: '#2e7d32',
    fontWeight: '700',
  },
  areaCheck: {
    color: '#2e7d32',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
