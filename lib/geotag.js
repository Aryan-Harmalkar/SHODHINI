import { Platform } from 'react-native';
import * as Location from 'expo-location';

/**
 * Capture a highly accurate GPS geotag.
 * Tries to get a location with accuracy <= targetAccuracyM.
 * Times out after timeoutMs and returns the best reading if it's <= 100m.
 * @returns Promise<{ latitude, longitude, accuracy_m, captured_at, source: 'gps' } | null>
 */
export async function captureGeotag({ targetAccuracyM = 30, timeoutMs = 15000, onUpdate } = {}) {
  return new Promise(async (resolve, reject) => {
    let bestReading = null;
    let watchSubscription = null;
    let watchId = null;
    let isResolved = false;

    const cleanup = () => {
      isResolved = true;
      if (Platform.OS === 'web' && watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      } else if (watchSubscription) {
        watchSubscription.remove();
      }
    };

    const handleSuccess = (location) => {
      if (isResolved) return;
      
      const coords = location.coords;
      const timestamp = location.timestamp; // usually in ms
      
      // Ignore readings older than 10 seconds
      if (Date.now() - timestamp > 10000) {
        return;
      }

      const accuracy = coords.accuracy || 9999;
      if (onUpdate) onUpdate(accuracy);

      if (!bestReading || accuracy < bestReading.accuracy_m) {
        bestReading = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy_m: accuracy,
          captured_at: new Date(timestamp).toISOString(),
          source: 'gps'
        };
      }

      if (bestReading.accuracy_m <= targetAccuracyM) {
        cleanup();
        resolve(bestReading);
      }
    };

    const handleError = (error) => {
      if (isResolved) return;
      cleanup();
      
      // Map web geolocation errors
      if (Platform.OS === 'web') {
        if (error.code === 1) return reject(new Error('denied'));
        if (error.code === 2) return reject(new Error('unavailable'));
        if (error.code === 3) return reject(new Error('timeout'));
      }
      
      reject(new Error('unavailable'));
    };

    // Set a timeout to resolve with the best we have, or fail.
    setTimeout(() => {
      if (isResolved) return;
      cleanup();
      if (bestReading && bestReading.accuracy_m <= 100) {
        resolve(bestReading);
      } else if (bestReading) {
        reject(new Error('weak_signal'));
      } else {
        reject(new Error('timeout'));
      }
    }, timeoutMs);

    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          throw new Error('unavailable');
        }
        watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: timeoutMs
        });
      } else {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          cleanup();
          return reject(new Error('denied'));
        }
        
        watchSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1
          },
          handleSuccess
        );
      }
    } catch (err) {
      if (!isResolved) {
        cleanup();
        reject(new Error('unavailable'));
      }
    }
  });
}

/**
 * Request or check geolocation permission
 * Returns 'granted', 'denied', or 'prompt'
 */
export async function checkGeotagPermission() {
  if (Platform.OS === 'web') {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state; // 'granted', 'prompt', 'denied'
      } catch (e) {
        return 'prompt';
      }
    }
    return 'prompt';
  } else {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (!canAskAgain) return 'denied';
    return 'prompt';
  }
}
