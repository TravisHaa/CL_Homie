import { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width: SCREEN_W } = Dimensions.get('window');
const FRAME_W = Math.round(SCREEN_W * 0.72);
const FRAME_H = 140;

interface Props {
  visible: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScannerModal({ visible, onScan, onClose }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) setScanned(false);
  }, [visible]);

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanned) return;
      setScanned(true);
      onScan(data);
    },
    [scanned, onScan],
  );

  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.webOverlay}>
          <View style={styles.webCard}>
            <Text style={styles.webTitle}>Not Available</Text>
            <Text style={styles.webBody}>
              Barcode scanning isn't supported on web. Enter the name manually.
            </Text>
            <TouchableOpacity style={styles.webCloseBtn} onPress={onClose}>
              <Text style={styles.webCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission?.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.permScreen}>
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permBody}>
            Allow camera access to scan product barcodes.
          </Text>
          {!permission || permission.canAskAgain ? (
            <TouchableOpacity style={styles.allowBtn} onPress={requestPermission}>
              <Text style={styles.allowText}>Allow Camera</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.settingsNote}>
              Enable camera access in your device Settings to use barcode scanning.
            </Text>
          )}
          <TouchableOpacity style={styles.cancelLink} onPress={onClose}>
            <Text style={styles.cancelLinkText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.scanner}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
          }}
          onBarcodeScanned={handleBarcodeScanned}
        />

        {/* Top overlay */}
        <View style={styles.topBar}>
          <Text style={styles.scanTitle}>Scan Barcode</Text>
          <Text style={styles.scanHint}>Align barcode within the frame</Text>
        </View>

        {/* Middle row: mask | transparent frame | mask */}
        <View style={styles.frameRow}>
          <View style={styles.mask} />
          <View style={[styles.frame, { width: FRAME_W, height: FRAME_H }]} />
          <View style={styles.mask} />
        </View>

        {/* Bottom overlay */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const OVERLAY = 'rgba(0,0,0,0.62)';

const styles = StyleSheet.create({
  // Web fallback
  webOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  webCard: {
    backgroundColor: '#FFFBF5',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  webTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E0800',
    marginBottom: 10,
  },
  webBody: {
    fontSize: 14,
    color: '#636e72',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  webCloseBtn: {
    backgroundColor: '#2D3436',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  webCloseBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Permission screen
  permScreen: {
    flex: 1,
    backgroundColor: '#FFFBF5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2E0800',
    marginBottom: 12,
    textAlign: 'center',
  },
  permBody: {
    fontSize: 15,
    color: '#636e72',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  allowBtn: {
    backgroundColor: '#2D3436',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginBottom: 16,
  },
  allowText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  settingsNote: {
    fontSize: 13,
    color: '#636e72',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  cancelLink: {
    paddingVertical: 12,
  },
  cancelLinkText: {
    fontSize: 15,
    color: '#636e72',
    fontWeight: '500',
  },

  // Camera scanner
  scanner: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    flex: 1,
    backgroundColor: OVERLAY,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
    // ~35% of screen height
    maxHeight: '38%',
  },
  scanTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  scanHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  frameRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  mask: {
    flex: 1,
    backgroundColor: OVERLAY,
  },
  frame: {
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 4,
  },
  bottomBar: {
    flex: 1,
    backgroundColor: OVERLAY,
    alignItems: 'center',
    paddingTop: 32,
  },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 48,
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
