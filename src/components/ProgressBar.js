import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

export default function ProgressBar({ progress, color = COLORS.gold, height = 8 }) {
  const pct = Math.max(0, Math.min(1, progress || 0));
  const over = (progress || 0) > 1;
  return (
    <View style={[styles.track, { height }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.min(pct, 1) * 100}%`,
            backgroundColor: over ? COLORS.forest : color,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: COLORS.line,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 99,
  },
});
