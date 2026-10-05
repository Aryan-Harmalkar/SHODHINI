import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const ADS = [
  {
    id: 1,
    title: 'Goa State Pollution Control Board',
    subtitle: 'Say No to Single-Use Plastic. Keep Goa Clean!',
    color: '#047857',
    icon: '🌱',
  },
  {
    id: 2,
    title: 'Department of Environment',
    subtitle: 'Protect our mangroves and coastal ecosystems.',
    color: '#0369a1',
    icon: '🌊',
  },
  {
    id: 3,
    title: 'Goa Tourism Department',
    subtitle: 'A clean beach is a happy beach. Dispose waste responsibly.',
    color: '#b45309',
    icon: '🏖️',
  },
  {
    id: 4,
    title: 'Archaeological Survey',
    subtitle: 'Preserve our heritage. Do not litter near monuments.',
    color: '#7e22ce',
    icon: '🏛️',
  }
];

export default function AdvertisementCarousel({ isDark }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Change index
        setCurrentIndex((prev) => (prev + 1) % ADS.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(interval);
  }, [fadeAnim]);

  const currentAd = ADS[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
      <View style={styles.adTagContainer}>
        <Text style={styles.adTag}>Sponsored</Text>
      </View>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={[styles.iconBox, { backgroundColor: currentAd.color + '20' }]}>
          <Text style={styles.icon}>{currentAd.icon}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: currentAd.color }]}>{currentAd.title}</Text>
          <Text style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#475569' }]}>{currentAd.subtitle}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  adTagContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adTag: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});
