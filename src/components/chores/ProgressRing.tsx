import { CHORE_THEME } from '@/src/theme/chores';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface ProgressRingProps {
  /** Outer diameter in dp. */
  size: number;
  /** Ring thickness in dp. */
  stroke: number;
  /** Completion 0..1 (values outside this range are clamped). */
  progress: number;
  /** Background arc color. */
  trackColor?: string;
  /** Foreground arc color. */
  fillColor?: string;
  /** Container fill peeking through the center — matches whatever sits behind. */
  centerColor?: string;
  /** Centered content (e.g. percentage label). */
  children?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Circular progress ring rendered with pure RN (no react-native-svg).
 *
 * Trick: a square painted in trackColor is overlaid by two half-rectangles
 * each containing a half-circle of fillColor that rotates based on progress.
 * The right half drives 0..50%, the left half drives 50..100% — together they
 * paint a smooth pie. A center disc punches out the inside to leave a ring.
 *
 * Why this approach: react-native-svg isn't installed in this project (see
 * package.json), and adding a native dep just for one ring is overkill.
 * This pattern works identically on web, iOS, and Android.
 */
export function ProgressRing({
  size,
  stroke,
  progress,
  trackColor = CHORE_THEME.ringTrack,
  fillColor = CHORE_THEME.ringFill,
  centerColor = CHORE_THEME.bg,
  children,
  style,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  // First half-turn drives 0..50%, second half-turn drives 50..100%.
  const firstHalfDeg = Math.min(clamped, 0.5) * 360;
  const secondHalfDeg = Math.max(0, clamped - 0.5) * 360;

  const half = size / 2;
  const innerSize = size - stroke * 2;

  return (
    <View style={[{ width: size, height: size }, style]}>
      {/* Track — full disc in track color. */}
      <View
        style={[
          styles.absoluteFill,
          { backgroundColor: trackColor, borderRadius: half },
        ]}
      />

      {/* Right half — drives 0..50% by rotating a fill-colored half-disc.
          The half-disc starts on the LEFT side of the rotating box so that at
          0deg it sits outside the right-half clip (invisible = 0%), and at
          180deg it has swept into the clip (fully filled = 50%). */}
      <View style={[styles.halfClip, { left: half, width: half, height: size }]}>
        <View
          style={{
            width: size,
            height: size,
            marginLeft: -half,
            transform: [{ rotate: `${firstHalfDeg}deg` }],
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: 0,
              width: half,
              height: size,
              backgroundColor: fillColor,
              borderTopLeftRadius: half,
              borderBottomLeftRadius: half,
            }}
          />
        </View>
      </View>

      {/* Left half — drives 50..100%. When progress < 0.5 it stays hidden
          (rotation 0 keeps the half-disc behind the right side). */}
      {clamped > 0.5 && (
        <View style={[styles.halfClip, { left: 0, width: half, height: size }]}>
          <View
            style={{
              width: size,
              height: size,
              transform: [{ rotate: `${secondHalfDeg}deg` }],
            }}
          >
            <View
              style={{
                position: 'absolute',
                left: half,
                width: half,
                height: size,
                backgroundColor: fillColor,
                borderTopRightRadius: half,
                borderBottomRightRadius: half,
              }}
            />
          </View>
        </View>
      )}

      {/* Center punch-out — leaves a ring of thickness `stroke`. */}
      <View
        style={[
          styles.absoluteFill,
          {
            top: stroke,
            left: stroke,
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: centerColor,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  halfClip: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
});
