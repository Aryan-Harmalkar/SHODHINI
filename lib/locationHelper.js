/**
 * lib/locationHelper.js
 * Precise GPS acquisition, permission handling & (reverse) geocoding.
 *
 * Why this exists:
 * A single getCurrentPositionAsync() call often returns the FIRST fix the OS
 * has — usually a cached cell-tower / Wi-Fi estimate that can be kilometres
 * off. Instead we watch the position for several seconds with
 * Accuracy.BestForNavigation, discard stale/cached readings, keep the most
 * accurate one, and only accept it once accuracy <= REQUIRED_ACCURACY_M.
 *
 * On web, browsers estimate position from IP / Wi-Fi, so readings are treated
 * as approximate and the user must confirm/adjust the pin manually.
 */

import { Platform } from 'react-native';
import * as Location from 'expo-location';

export const REQUIRED_ACCURACY_M = 30;
export const FIX_TIMEOUT_MS = 15000;
/** Minimum time to keep watching so we can pick the best of several readings. */
const MIN_WATCH_MS = 3000;
/** Readings older than this (relative to when we started) are cached → ignored. */
const STALE_TOLERANCE_MS = 2000;

export const IS_WEB = Platform.OS === 'web';

export const LOCATION_ERROR = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SERVICES_OFF: 'SERVICES_OFF',
  IMPRECISE: 'IMPRECISE',
  UNAVAILABLE: 'UNAVAILABLE',
};

function locationError(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  Object.assign(err, extra);
  return err;
}

function devLog(...args) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[location]', ...args);
  }
}

/**
 * Silently checks whether foreground location permission is already granted
 * (does not show the OS prompt).
 */
export async function hasForegroundPermission() {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    return perm.status === 'granted';
  } catch (e) {
    return false;
  }
}

/**
 * Checks the current foreground permission and requests it if needed.
 * Call this only AFTER showing the user why location is needed.
 * @returns {Promise<{granted: boolean, canAskAgain: boolean}>}
 */
export async function ensureForegroundPermission() {
  let perm = await Location.getForegroundPermissionsAsync();
  if (perm.status !== 'granted' && perm.canAskAgain !== false) {
    perm = await Location.requestForegroundPermissionsAsync();
  }
  devLog('permission', { status: perm.status, canAskAgain: perm.canAskAgain });
  return { granted: perm.status === 'granted', canAskAgain: perm.canAskAgain !== false };
}

function normalize(coords, timestamp, mocked) {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: Math.round(typeof coords.accuracy === 'number' ? coords.accuracy : 9999),
    timestamp: timestamp || Date.now(),
    mocked: !!mocked,
  };
}

/**
 * Watches the device position and resolves with the most accurate reading.
 *
 * Native: resolves once best accuracy <= requiredAccuracy (after watching at
 *         least MIN_WATCH_MS). Rejects with code IMPRECISE after timeoutMs.
 * Web:    resolves with the best reading after timeoutMs (or early if precise),
 *         flagged `approximate: true` so the UI asks the user to confirm the pin.
 *
 * @param {Object} opts
 * @param {(best: object, latest: object) => void} [opts.onUpdate] live progress callback
 * @returns {{ promise: Promise<object>, cancel: () => void }}
 */
export function watchPreciseLocation({
  onUpdate,
  timeoutMs = FIX_TIMEOUT_MS,
  requiredAccuracy = REQUIRED_ACCURACY_M,
} = {}) {
  const startedAt = Date.now();
  let best = null;
  let settled = false;
  let cleanup = () => {};
  let timeoutTimer = null;
  let minWatchTimer = null;
  let resolveFn;
  let rejectFn;

  const promise = new Promise((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });

  const finish = (ok, value) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutTimer);
    clearTimeout(minWatchTimer);
    try {
      cleanup();
    } catch (e) {
      // ignore cleanup errors
    }
    devLog(ok ? 'accepted fix' : 'failed', ok ? value : value?.message, { elapsedMs: Date.now() - startedAt });
    if (ok) resolveFn(value);
    else rejectFn(value);
  };

  const evaluate = () => {
    if (settled || !best) return;
    const elapsed = Date.now() - startedAt;
    if (best.accuracy <= requiredAccuracy && elapsed >= MIN_WATCH_MS) {
      finish(true, { ...best, approximate: IS_WEB && best.accuracy > requiredAccuracy });
    }
  };

  const handleReading = (reading) => {
    if (settled) return;
    const ageMs = startedAt - reading.timestamp;
    devLog('reading', {
      accuracy: reading.accuracy,
      latitude: reading.latitude,
      longitude: reading.longitude,
      mocked: reading.mocked,
      ageMs,
    });
    // Discard cached fixes delivered from before we started watching.
    if (ageMs > STALE_TOLERANCE_MS) {
      devLog('ignored stale/cached reading');
      return;
    }
    if (!best || reading.accuracy < best.accuracy) best = reading;
    onUpdate?.(best, reading);
    evaluate();
  };

  const onTimeout = () => {
    if (settled) return;
    if (best && best.accuracy <= requiredAccuracy) {
      finish(true, { ...best, approximate: false });
    } else if (IS_WEB && best) {
      // Browsers rarely reach GPS-level accuracy; let the user fix the pin.
      finish(true, { ...best, approximate: true });
    } else {
      finish(
        false,
        locationError(
          best ? LOCATION_ERROR.IMPRECISE : LOCATION_ERROR.UNAVAILABLE,
          'Location not precise enough, move outdoors and retry.',
          { best }
        )
      );
    }
  };

  timeoutTimer = setTimeout(onTimeout, timeoutMs);
  minWatchTimer = setTimeout(evaluate, MIN_WATCH_MS);

  (async () => {
    try {
      if (!IS_WEB) {
        const servicesOn = await Location.hasServicesEnabledAsync();
        if (!servicesOn) {
          throw locationError(
            LOCATION_ERROR.SERVICES_OFF,
            'Location services (GPS) are turned off. Turn on Location in your phone settings and tap "Refresh location".'
          );
        }
      }

      if (IS_WEB) {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          throw locationError(LOCATION_ERROR.UNAVAILABLE, 'This browser does not support geolocation.');
        }
        // Use the browser API directly so we can force enableHighAccuracy + maximumAge: 0.
        const watchId = navigator.geolocation.watchPosition(
          (pos) => handleReading(normalize(pos.coords, pos.timestamp, false)),
          (err) => {
            if (err.code === 1) {
              finish(false, locationError(LOCATION_ERROR.PERMISSION_DENIED, 'Location permission was denied in the browser.'));
            } else {
              devLog('web watch error (continuing)', err.message);
            }
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs }
        );
        cleanup = () => navigator.geolocation.clearWatch(watchId);
      } else {
        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 0,
            mayShowUserSettingsDialog: true,
          },
          (loc) => handleReading(normalize(loc.coords, loc.timestamp, loc.mocked)),
          (reason) => devLog('native watch error (continuing)', reason)
        );
        cleanup = () => sub.remove();
        if (settled) sub.remove();
      }
    } catch (err) {
      finish(false, err.code ? err : locationError(LOCATION_ERROR.UNAVAILABLE, err.message || 'Could not start GPS.'));
    }
  })();

  return {
    promise,
    cancel: () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      clearTimeout(minWatchTimer);
      try {
        cleanup();
      } catch (e) {
        // ignore
      }
      devLog('watch cancelled');
    },
  };
}

/**
 * Converts a typed address into coordinates (used when permission is denied).
 * @returns {Promise<{latitude: number, longitude: number} | null>}
 */
export async function geocodeAddress(address) {
  const query = (address || '').trim();
  if (!query) return null;

  if (!IS_WEB) {
    try {
      const results = await Location.geocodeAsync(query);
      if (results?.length) {
        return { latitude: results[0].latitude, longitude: results[0].longitude };
      }
    } catch (e) {
      devLog('native geocode failed, trying OSM', e?.message);
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ShodhiniApp/1.0', 'Accept-Language': 'en' } });
    if (res.ok) {
      const data = await res.json();
      if (data?.length) {
        return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
      }
    }
  } catch (e) {
    devLog('OSM geocode failed', e?.message);
  }
  return null;
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
  if (!IS_WEB) {
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
