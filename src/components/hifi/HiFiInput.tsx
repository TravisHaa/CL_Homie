import { TextInput, TextInputProps, StyleSheet, View } from 'react-native';
import { HIFI } from '@/src/utils/hifiTheme';

export function HiFiInput(props: TextInputProps & { invalid?: boolean }) {
  const { style, invalid, ...rest } = props;
  return (
    <View style={[styles.wrap, invalid && styles.invalid]}>
      <TextInput
        placeholder="Write here"
        placeholderTextColor={HIFI.placeholder}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: HIFI.surface,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 52,
    justifyContent: 'center',
  },
  invalid: { backgroundColor: '#F2C9C9' },
  input: {
    fontSize: 14,
    fontWeight: '300',
    color: HIFI.text,
    textAlign: 'center',
    padding: 0,
  },
});
