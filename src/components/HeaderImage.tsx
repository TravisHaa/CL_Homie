import { Image, View, type ImageStyle, type StyleProp } from 'react-native';

export function HeaderImage({
  height = 117,
  pointerEvents,
  style,
}: {
  height?: number;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <View pointerEvents={pointerEvents}>
      <Image
        source={require('@/assets/images/header-asset.png')}
        style={[{ width: '100%', height }, style]}
        resizeMode="cover"
      />
    </View>
  );
}
