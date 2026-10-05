/**
 * components/LocationPinMap.jsx (Android / iOS)
 * Small map preview with a draggable pin. Users can drag the pin or tap the
 * map to move it to the exact spot of the waste before submitting.
 *
 * Web uses LocationPinMap.web.jsx (react-native-maps has no web support).
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';

const DELTA = 0.003; // ~300 m view, close enough to place the pin precisely

export default function LocationPinMap({ coordinate, accuracy, onChange, height = 220 }) {
  const mapRef = useRef(null);

  // Re-centre when a new GPS fix arrives (not when the user drags).
  useEffect(() => {
    if (!coordinate || !mapRef.current) return;
    mapRef.current.animateToRegion(
      { ...coordinate, latitudeDelta: DELTA, longitudeDelta: DELTA },
      400
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accuracy]);

  if (!coordinate) return null;

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...coordinate, latitudeDelta: DELTA, longitudeDelta: DELTA }}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPress={(e) => onChange?.(e.nativeEvent.coordinate)}
      >
        {typeof accuracy === 'number' && accuracy > 0 && (
          <Circle
            center={coordinate}
            radius={accuracy}
            strokeColor="rgba(22,163,74,0.6)"
            fillColor="rgba(22,163,74,0.12)"
          />
        )}
        <Marker
          coordinate={coordinate}
          draggable
          pinColor="#16a34a"
          onDragEnd={(e) => onChange?.(e.nativeEvent.coordinate)}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
  },
});
