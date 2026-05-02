import { TextInput, TextInputProps, StyleSheet, View } from 'react-native';
import { LOFI } from '@/src/utils/lofiTheme';

export function PillInput(props: TextInputProps & { invalid?: boolean }) {
  const { style, invalid, ...rest } = props;
  return (
    <View style={[styles.wrap, invalid && styles.invalid]}>
      <TextInput
        placeholderTextColor={LOFI.placeholder}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: LOFI.surface,
    borderRadius: 999,
    paddingHorizontal: 22,
    height: 48,
    justifyContent: 'center',
  },
  invalid: { backgroundColor: '#F2C9C9' },
  input: {
    fontSize: 15,
    color: LOFI.text,
    padding: 0,
  },
});
