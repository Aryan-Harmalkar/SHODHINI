/**
 * components/LocationPinMap.web.jsx (Web)
 * react-native-maps does not support web, so we show an OpenStreetMap embed
 * and let the user nudge the pin with arrow buttons (≈10 m per tap) to the
 * exact spot. Metro automatically picks this file on web.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../lib/theme';

const STEP_M = 10;
const M_PER_DEG_LAT = 111320;

function nudge(coord, dNorthM, dEastM) {
  const dLat = dNorthM / M_PER_DEG_LAT;
  const dLng = dEastM / (M_PER_DEG_LAT * Math.cos((coord.latitude * Math.PI) / 180));
  return { latitude: coord.latitude + dLat, longitude: coord.longitude + dLng };
}

export default function LocationPinMap({ coordinate, onChange, height = 220 }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  if (!coordinate) return null;
  const { latitude: lat, longitude: lng } = coordinate;
  const d = 0.003;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;

  const move = (n, e) => onChange?.(nudge(coordinate, n, e));

  return (
    <View>
      <View style={[styles.wrap, { height }]}>
        <iframe
          title="Pin location preview"
          src={src}
          style={{ border: 0, width: '100%', height: '100%' }}
          loading="lazy"
        />
      </View>
      <View style={styles.padRow}>
        <Text style={styles.padHint}>Move pin ({STEP_M} m):</Text>
        {[
          ['⬆ N', STEP_M, 0],
          ['⬇ S', -STEP_M, 0],
          ['⬅ W', 0, -STEP_M],
          ['➡ E', 0, STEP_M],
        ].map(([label, n, e]) => (
          <TouchableOpacity
            key={label}
            nativeID={`pin-nudge-${label.slice(-1).toLowerCase()}`}
            style={styles.padBtn}
            onPress={() => move(n, e)}
            activeOpacity={0.7}
          >
            <Text style={styles.padBtnText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  padRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  padHint: {
    fontSize: 12,
    color: colors.muted,
    marginRight: 4,
  },
  padBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4',
  },
  padBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
});
