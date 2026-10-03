import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';

export default function HomeScreen() {
  const handleReportWaste = () => {
    Alert.alert('Report Waste', 'Report feature will be added in Step 3.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SHODHINI</Text>
      <Text style={styles.subtitle}>Waste Management</Text>

      <TouchableOpacity style={styles.button} onPress={handleReportWaste}>
        <Text style={styles.buttonText}>Report waste</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 36,
  },
  button: {
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
