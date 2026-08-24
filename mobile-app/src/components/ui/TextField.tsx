import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, FontSize, FontWeight, Radius, Spacing, Touch } from '@/constants/theme';

interface Props extends TextInputProps {
  label: string;
}

export function TextField({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={Colors.textMuted}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  label: { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.text },
  input: {
    minHeight: Touch.minSize,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.subtitle,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
});
