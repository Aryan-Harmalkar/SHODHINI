/**
 * lib/locationHelper.js
 * Strict Internal Device GPS & Reverse Geocoding Helper
 *
 * Enforces:
 * 1. Strict internal GPS hardware querying (enableHighAccuracy: true, maximumAge: 0)
 * 2. Explicitly throws an error if internal GPS is disabled, unavailable, denied, or times out
 * 3. Reverse geocodes exact coordinates into readable street address
 */

import { Platform } from 'react-native';
import * as Location from 'expo-location';

/**
 * Gets fresh, high-precision coordinates strictly from internal device GPS.
 * Throws an explicit error if GPS is unavailable, turned off, or permission is denied.
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number, isCoarse: boolean}>}
 */
export async function getHighAccuracyLocation() {
  // 1. Check Native Phone GPS Hardware Status
  if (Platform.OS !== 'web') {
    try {
      const providerStatus = await Location.getProviderStatusAsync();
      if (!providerStatus.locationServicesEnabled) {
        throw new Error('Internal GPS is turned off. Please enable Location/GPS in your phone settings.');
      }
    } catch (provErr) {
      if (provErr.message?.includes('turned off')) throw provErr;
      console.warn('GPS provider check note:', provErr);
    }
  }

  // 2. Check & Request Permissions
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied. Internal GPS access is required to geotag waste reports.');
  }

  // 3. Web Internal GPS Query (navigator.geolocation)
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('Internal Geolocation API is not supported on this device/browser.');
    }

    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (p) => resolve(p),
        (err) => {
          let errorMsg = 'Failed to acquire internal GPS location.';
          if (err.code === 1) {
            errorMsg = 'Location permission was denied. Internal GPS access is required.';
          } else if (err.code === 2) {
            errorMsg = 'Internal GPS position unavailable. Please ensure GPS/Location services are enabled on your device.';
          } else if (err.code === 3) {
            errorMsg = 'Internal GPS timed out while acquiring satellite fix. Please retry in an open area.';
          }
          reject(new Error(errorMsg));
        },
        {
          enableHighAccuracy: true, // Forces internal GPS hardware query
          timeout: 10000,
          maximumAge: 0, // Never use cached/stale position
        }
      );
    });

    const coords = pos.coords;
    if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
      throw new Error('Internal GPS returned invalid coordinates.');
    }

    const accuracy = Math.round(coords.accuracy || 10);
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy,
      isCoarse: accuracy > 800,
    };
  }

  // 4. Native Expo Location Query
  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest, // Internal GPS hardware
      maximumAge: 0, // Fresh satellite/hardware fix
    });

    if (!position?.coords || typeof position.coords.latitude !== 'number') {
      throw new Error('Internal GPS returned empty coordinates. Please ensure your device has GPS satellite reception.');
    }

    const coords = position.coords;
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: Math.round(coords.accuracy || 10),
      isCoarse: false,
    };
  } catch (err) {
    throw new Error(err.message || 'Internal GPS hardware error. Could not acquire satellite fix.');
  }
}

/**
 * Reverse geocodes coordinates to a human-readable street address & landmark
 * @param {Object} coords
 * @param {number} coords.latitude
 * @param {number} coords.longitude
 * @returns {Promise<Object>} Formatted Address
 */
export async function getReadableAddress({ latitude, longitude }) {
  if (!latitude || !longitude) return null;

  // 1. Try Expo native reverseGeocodeAsync on mobile
  if (Platform.OS !== 'web') {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (results && results.length > 0) {
        const item = results[0];
        const parts = [
          item.name,
          item.street,
          item.district || item.subregion,
          item.city,
          item.postalCode,
        ].filter(Boolean);

        return {
          shortAddress: [item.street || item.name, item.city].filter(Boolean).join(', '),
          fullAddress: parts.join(', '),
          city: item.city || '',
          postalCode: item.postalCode || '',
        };
      }
    } catch (nativeErr) {
      console.warn('Native reverse geocode warning:', nativeErr);
    }
  }

  // 2. OpenStreetMap Reverse Geocoding (reliable across web & native)
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ShodhiniApp/1.0',
        'Accept-Language': 'en',
      },
    });

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};

      const street = addr.road || addr.street || addr.pedestrian || addr.suburb || '';
      const area = addr.neighbourhood || addr.suburb || addr.quarter || addr.village || '';
      const city = addr.city || addr.town || addr.municipality || addr.county || '';
      const pincode = addr.postcode || '';

      const shortParts = [street, area || city].filter(Boolean);
      const shortAddress = shortParts.length > 0 ? shortParts.join(', ') : (data.display_name?.slice(0, 45) || '');

      return {
        shortAddress,
        fullAddress: data.display_name || '',
        street,
        area,
        city,
        postalCode: pincode,
      };
    }
  } catch (osmErr) {
    console.warn('Reverse geocode fetch error:', osmErr);
  }

  return {
    shortAddress: `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`,
    fullAddress: `Lat: ${latitude.toFixed(5)}, Long: ${longitude.toFixed(5)}`,
  };
}
