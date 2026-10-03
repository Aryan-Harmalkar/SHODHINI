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

const RECYCLE_CATEGORIES = [
  {
    id: 'ewaste',
    icon: '💻',
    name: 'E-Waste',
    desc: 'Laptops, phones, wires, batteries, chargers',
    points: 30,
  },
  {
    id: 'metal',
    icon: '🔩',
    name: 'Metals & Scrap',
    desc: 'Iron, steel, copper, aluminium cans, brass',
    points: 25,
  },
  {
    id: 'paper',
    icon: '📦',
    name: 'Paper & Cardboard',
    desc: 'Newspapers, delivery cartons, old books',
    points: 15,
  },
  {
    id: 'plastic',
    icon: '🧴',
    name: 'Plastics',
    desc: 'PET bottles, milk pouches, hard containers',
    points: 15,
  },
  {
    id: 'glass',
    icon: '🍾',
    name: 'Glassware',
    desc: 'Glass bottles, jars, glass containers',
    points: 10,
  },
  {
    id: 'textile',
    icon: '👕',
    name: 'Textiles & Clothes',
    desc: 'Old wearable clothes, torn fabrics, rags',
    points: 10,
  },
];

export default function RecycleScreen({ user, onBackToHome, onOpenSidebar }) {
  const [selectedItems, setSelectedItems] = useState(['ewaste']);
  const [weightTier, setWeightTier] = useState('medium');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');

  const toggleCategory = (id) => {
    if (selectedItems.includes(id)) {
      if (selectedItems.length > 1) {
        setSelectedItems(selectedItems.filter((i) => i !== id));
      }
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const calculatedPoints = selectedItems.reduce((sum, id) => {
    const cat = RECYCLE_CATEGORIES.find((c) => c.id === id);
    return sum + (cat ? cat.points : 0);
  }, 0);

  const handleRequestRecycle = () => {
    if (!address.trim()) {
      Alert.alert('Missing Location', 'Please provide a pickup address for the recycling collector.');
      return;
    }

    Alert.alert(
      'Recycling Request Booked!',
      `Thank you for recycling! Our authorized green partner will contact you at ${phone || 'your number'} for doorstep pickup.\n\nYou will earn approx. +${calculatedPoints} Eco Points!`,
      [{ text: 'Great!', onPress: onBackToHome }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenSidebar}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Recycle & Earn</Text>
        </View>

        <TouchableOpacity style={styles.backHomeBtn} onPress={onBackToHome}>
          <Text style={styles.backHomeText}>Home</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🌱 ZERO-WASTE INITIATIVE</Text>
          </View>
          <Text style={styles.bannerTitle}>Turn Scrap Into Eco Points</Text>
          <Text style={styles.bannerDesc}>
            Request doorstep recycling pickup for hazardous e-waste, scrap metals, plastics, and paper. Help prevent landfill pollution!
          </Text>

          <View style={styles.pointsPill}>
            <Text style={styles.pointsPillText}>
              Estimated Reward: +{calculatedPoints} Eco Points 🎉
            </Text>
          </View>
        </View>

        {/* Category Selection */}
        <Text style={styles.sectionHeader}>Select Recyclable Items</Text>
        <View style={styles.grid}>
          {RECYCLE_CATEGORIES.map((cat) => {
            const isSelected = selectedItems.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryCard, isSelected && styles.selectedCategoryCard]}
                onPress={() => toggleCategory(cat.id)}
              >
                <View style={styles.catHeader}>
                  <Text style={styles.catIcon}>{cat.icon}</Text>
                  {isSelected && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.catTitle}>{cat.name}</Text>
                <Text style={styles.catDesc}>{cat.desc}</Text>
                <Text style={styles.catPoints}>+{cat.points} pts</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quantity / Weight */}
        <Text style={styles.sectionHeader}>Approximate Quantity</Text>
        <View style={styles.weightRow}>
          {[
            { id: 'small', label: 'Small (< 5 kg)' },
            { id: 'medium', label: 'Medium (5 - 15 kg)' },
            { id: 'bulk', label: 'Bulk (15+ kg)' },
          ].map((w) => (
            <TouchableOpacity
              key={w.id}
              style={[styles.weightPill, weightTier === w.id && styles.activeWeightPill]}
              onPress={() => setWeightTier(w.id)}
            >
              <Text
                style={[
                  styles.weightPillText,
                  weightTier === w.id && styles.activeWeightPillText,
                ]}
              >
                {w.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pickup Details Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Pickup Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pickup Address</Text>
            <TextInput
              style={styles.input}
              placeholder="House/Building no., Street, Area"
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9876543210"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Item Details or Special Notes (Optional)</Text>
            <TextInput
              style={[styles.input, { height: 65 }]}
              placeholder="e.g. 2 broken laptops, 1 mixer grinder, cardboard cartons..."
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleRequestRecycle}>
            <Text style={styles.submitBtnText}>Request Recycling Pickup ♻️</Text>
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
  bannerCard: {
    backgroundColor: '#1b5e20',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#81c784',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#003300',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  bannerDesc: {
    fontSize: 13,
    color: '#e8f5e9',
    lineHeight: 18,
    marginBottom: 12,
  },
  pointsPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  pointsPillText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
    marginTop: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  selectedCategoryCard: {
    borderColor: '#2e7d32',
    backgroundColor: '#f1f8e9',
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  catIcon: {
    fontSize: 24,
  },
  checkMark: {
    color: '#2e7d32',
    fontWeight: 'bold',
    fontSize: 16,
  },
  catTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginTop: 2,
  },
  catDesc: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    lineHeight: 15,
    minHeight: 30,
  },
  catPoints: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2e7d32',
    marginTop: 6,
  },
  weightRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  weightPill: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeWeightPill: {
    backgroundColor: '#2e7d32',
    borderColor: '#2e7d32',
  },
  weightPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  activeWeightPillText: {
    color: '#ffffff',
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
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
  },
  submitBtn: {
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
