import { useEffect } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CROP_SIZE = Math.min(SCREEN_W, SCREEN_H) * 0.78;
const MIN_SCALE = 1;
const MAX_SCALE = 5;

interface Props {
  visible: boolean;
  imageUri: string;
  onConfirm: (uri: string) => void;
  onCancel: () => void;
}

export function ImageCropModal({ visible, imageUri, onConfirm, onCancel }: Props) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedX.value = 0;
      savedY.value = 0;
    }
  }, [visible]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const maxOffset = ((scale.value - 1) * CROP_SIZE) / 2;
      translateX.value = Math.min(maxOffset, Math.max(-maxOffset, savedX.value + e.translationX));
      translateY.value = Math.min(maxOffset, Math.max(-maxOffset, savedY.value + e.translationY));
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  function handleConfirm() {
    onConfirm(imageUri);
  }

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <GestureHandlerRootView style={styles.overlay}>
        {/* Dim backdrop */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.88)' }} />
        </View>

        <Text style={styles.hint}>Pinch to zoom · Drag to reposition</Text>

        {/* Crop frame */}
        <View style={styles.cropFrame}>
          <GestureDetector gesture={composed}>
            <Animated.Image
              source={{ uri: imageUri }}
              style={[styles.image, imageStyle]}
              resizeMode="cover"
            />
          </GestureDetector>

          {/* Circle overlay cutout border */}
          <View pointerEvents="none" style={styles.circleBorder} />
        </View>

        {/* Buttons */}
        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmText}>Use Photo</Text>
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.88)',
  },
  hint: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 24,
  },
  cropFrame: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: CROP_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  image: {
    width: CROP_SIZE,
    height: CROP_SIZE,
  },
  circleBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: CROP_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 36,
  },
  cancelBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 15,
    color: '#fff',
  },
  confirmBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  confirmText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 15,
    color: '#2E0800',
  },
});
