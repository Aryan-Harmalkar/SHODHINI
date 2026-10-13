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

/**
 * Extract GPS coordinates directly from photo EXIF metadata
 * @param {object} asset Image asset from ImagePicker
 * @returns {{ latitude: number, longitude: number, accuracy_m: number, source: string, captured_at: string } | null}
 */
export function extractLocationFromPhotoExif(asset) {
  if (!asset || !asset.exif) return null;
  const exif = asset.exif;

  let lat = exif.GPSLatitude ?? exif.latitude;
  let lon = exif.GPSLongitude ?? exif.longitude;

  if (lat == null || lon == null) return null;

  // Handle DMS (degrees, minutes, seconds array)
  if (Array.isArray(lat) && lat.length >= 3) {
    lat = Number(lat[0]) + Number(lat[1]) / 60 + Number(lat[2]) / 3600;
  } else if (typeof lat === 'string' && lat.includes('/')) {
    const parts = lat.split(',').map((p) => {
      const [num, den] = p.trim().split('/');
      return den ? Number(num) / Number(den) : Number(num);
    });
    if (parts.length >= 3) {
      lat = parts[0] + parts[1] / 60 + parts[2] / 3600;
    }
  }

  if (Array.isArray(lon) && lon.length >= 3) {
    lon = Number(lon[0]) + Number(lon[1]) / 60 + Number(lon[2]) / 3600;
  } else if (typeof lon === 'string' && lon.includes('/')) {
    const parts = lon.split(',').map((p) => {
      const [num, den] = p.trim().split('/');
      return den ? Number(num) / Number(den) : Number(num);
    });
    if (parts.length >= 3) {
      lon = parts[0] + parts[1] / 60 + parts[2] / 3600;
    }
  }

  lat = parseFloat(lat);
  lon = parseFloat(lon);

  if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) {
    return null;
  }

  const latRef = (exif.GPSLatitudeRef || exif.latitudeRef || '').toString().toUpperCase();
  const lonRef = (exif.GPSLongitudeRef || exif.longitudeRef || '').toString().toUpperCase();

  if (latRef === 'S' && lat > 0) lat = -lat;
  if (lonRef === 'W' && lon > 0) lon = -lon;

  const accuracy = exif.GPSHPositioningError
    ? parseFloat(exif.GPSHPositioningError)
    : 10;

  return {
    latitude: lat,
    longitude: lon,
    accuracy_m: accuracy,
    captured_at: exif.DateTimeOriginal || exif.DateTimeDigitized || new Date().toISOString(),
    source: 'photo_exif',
  };
}

/**
 * Rapid device GPS reading (with timeout & fallback to last known)
 * @param {object} opts
 * @returns {Promise<{ latitude: number, longitude: number, accuracy_m: number, source: string, captured_at: string } | null>}
 */
export async function getImmediateDeviceLocation({ timeoutMs = 8000 } = {}) {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy_m: pos.coords.accuracy || 15,
              captured_at: new Date(pos.timestamp || Date.now()).toISOString(),
              source: 'gps',
            });
          },
          (err) => {
            console.warn('Web geolocation note:', err?.message || err);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 10000 }
        );
      });
    }
    return null;
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    try {
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
      ]);
      if (pos?.coords) {
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy_m: pos.coords.accuracy || 15,
          captured_at: new Date(pos.timestamp || Date.now()).toISOString(),
          source: 'gps',
        };
      }
    } catch (posErr) {
      // Continue to last known fallback
    }

    const last = await Location.getLastKnownPositionAsync();
    if (last?.coords) {
      return {
        latitude: last.coords.latitude,
        longitude: last.coords.longitude,
        accuracy_m: last.coords.accuracy || 35,
        captured_at: new Date(last.timestamp || Date.now()).toISOString(),
        source: 'cached_gps',
      };
    }
  } catch (err) {
    console.warn('Native getImmediateDeviceLocation error:', err);
  }
  return null;
}

/**
 * Unified extractor: extracts location directly when clicking a photo.
 * Prioritizes photo EXIF GPS, falling back seamlessly to device GPS.
 */
export async function extractLocationFromPhoto(asset, prewarmedDeviceLocationPromise) {
  // 1. Check EXIF from photo
  const exifLoc = extractLocationFromPhotoExif(asset);
  if (exifLoc) {
    return exifLoc;
  }

  // 2. Await prewarmed device location or fetch fresh
  if (prewarmedDeviceLocationPromise) {
    try {
      const loc = await prewarmedDeviceLocationPromise;
      if (loc) return loc;
    } catch (e) {
      // Fall through to direct fetch
    }
  }

  return await getImmediateDeviceLocation();
}
