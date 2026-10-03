import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';

export default function WastePickupScreen({ user, onBackToHome, onOpenSidebar }) {
  const [address, setAddress] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [wasteType, setWasteType] = useState('household');
  const [timeSlot, setTimeSlot] = useState('morning');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleBookPickup = () => {
    if (!address.trim()) {
      Alert.alert('Missing Address', 'Please provide your pickup address or house number.');
      return;
    }

    setSubmitted(true);
    Alert.alert(
      'Pickup Request Submitted!',
      'Our sanitation partner has received your request. You will receive a confirmation call shortly before arrival.\n\nFee will be collected at doorstep.',
      [{ text: 'OK', onPress: onBackToHome }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Doorstep Waste Pickup</Text>
        </View>

        <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome}>
          <Text style={styles.backHomeText}>Home</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Paid Service Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.paidBadge}>
            <Text style={styles.paidBadgeText}>⭐ PAID DOORSTEP SERVICE</Text>
          </View>
          <Text style={styles.heroTitle}>No Dustbins Nearby? We'll Pick It Up!</Text>
          <Text style={styles.heroDesc}>
            Specially designed for residents without accessible community bins, senior citizens, or anyone needing hassle-free doorstep waste collection.
          </Text>
        </View>

        {/* Pricing Options */}
        <Text style={styles.sectionLabel}>Select Service Option</Text>
        <View style={styles.plansContainer}>
          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'standard' && styles.activePlanCard]}
            onPress={() => setSelectedPlan('standard')}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Standard Bag</Text>
              <Text style={styles.planPrice}>₹40</Text>
            </View>
            <Text style={styles.planDetails}>Up to 2 bags of regular household daily waste.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.planCard, selectedPlan === 'bulk' && styles.activePlanCard]}
            onPress={() => setSelectedPlan('bulk')}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Bulk / Garden</Text>
              <Text style={styles.planPrice}>₹120</Text>
            </View>
            <Text style={styles.planDetails}>Heavy yard waste, furniture, renovation scraps.</Text>
          </TouchableOpacity>
        </View>

        {/* Request Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Pickup Details</Text>

          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pickup Address / Flat No. & Landmark</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Flat 302, Green Valley Apts, Main Road"
              value={address}
              onChangeText={setAddress}
            />
          </View>

          {/* Waste Category Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Waste Category</Text>
            <View style={styles.pillRow}>
              {[
                { id: 'household', label: 'Household (Dry/Wet)' },
                { id: 'bulk', label: 'Bulk & Furniture' },
                { id: 'garden', label: 'Garden & Leaves' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.pill, wasteType === item.id && styles.activePill]}
                  onPress={() => setWasteType(item.id)}
                >
                  <Text style={[styles.pillText, wasteType === item.id && styles.activePillText]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Preferred Time Slot */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Preferred Pickup Time</Text>
            <View style={styles.pillRow}>
              {[
                { id: 'morning', label: 'Morning (8am - 11am)' },
                { id: 'afternoon', label: 'Afternoon (1pm - 4pm)' },
                { id: 'evening', label: 'Evening (5pm - 8pm)' },
              ].map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[styles.pill, timeSlot === slot.id && styles.activePill]}
                  onPress={() => setTimeSlot(slot.id)}
                >
                  <Text style={[styles.pillText, timeSlot === slot.id && styles.activePillText]}>
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Special Instructions */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Special Notes (Optional)</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              placeholder="Any specific instructions for the collection worker..."
              multiline
              value={note}
              onChangeText={setNote}
            />
          </View>

          {/* Payment Notice */}
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              💳 Payment of {selectedPlan === 'standard' ? '₹40' : '₹120'} can be made directly to the collection partner via Cash or UPI upon pickup.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleBookPickup}>
            <Text style={styles.submitBtnText}>Request Doorstep Pickup 🚚</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuBtn: {
    padding: 6,
    marginRight: 10,
  },
  menuIcon: {
    fontSize: 22,
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2e7d32',
  },
  backHomeBtn: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  backHomeText: {
    color: '#2e7d32',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroBanner: {
    backgroundColor: '#2e7d32',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  paidBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffb300',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#212121',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 13,
    color: '#e8f5e9',
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  plansContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  activePlanCard: {
    borderColor: '#2e7d32',
    backgroundColor: '#f1f8e9',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  planName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2e7d32',
  },
  planDetails: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activePill: {
    backgroundColor: '#2e7d32',
  },
  pillText: {
    fontSize: 12,
    color: '#444',
    fontWeight: '600',
  },
  activePillText: {
    color: '#ffffff',
  },
  noticeBox: {
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#ffe082',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 12,
    color: '#795548',
    lineHeight: 17,
  },
  submitBtn: {
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
