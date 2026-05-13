import { StyleSheet, View, useWindowDimensions } from 'react-native';

const GRID_COLOR = '#EDEAC2';
const SPACING = 32;

export function GridBackground() {
  const { width, height } = useWindowDimensions();
  const hLines = Math.ceil(height / SPACING) + 1;
  const vLines = Math.ceil(width / SPACING) + 1;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: hLines }).map((_, i) => (
        <View key={`h${i}`} style={{ position: 'absolute', top: i * SPACING, left: 0, right: 0, height: 1, backgroundColor: GRID_COLOR }} />
      ))}
      {Array.from({ length: vLines }).map((_, i) => (
        <View key={`v${i}`} style={{ position: 'absolute', left: i * SPACING, top: 0, bottom: 0, width: 1, backgroundColor: GRID_COLOR }} />
      ))}
    </View>
  );
}
