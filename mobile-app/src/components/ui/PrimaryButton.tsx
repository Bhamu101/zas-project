import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, FontWeight, Radius, Spacing, Touch } from '@/constants/theme';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  // 'outline' = neutral secondary action on a light background (border/text in
  // brand green). 'outlineLight' = same, but for use on a dark/colored
  // background like the Splash screen (white border/text).
  variant?: 'primary' | 'danger' | 'outline' | 'outlineLight';
  icon?: React.ReactNode;
}

export function PrimaryButton({ title, onPress, disabled, loading, variant = 'primary', icon }: Props) {
  const isOutline = variant === 'outline' || variant === 'outlineLight';
  const bg = variant === 'danger' ? Colors.critical : variant === 'primary' ? Colors.primary : 'transparent';
  const outlineColor = variant === 'outlineLight' ? Colors.textOnPrimary : Colors.primaryDark;
  // The lime `primary` fill is too light for white text — use near-black instead;
  // 'danger' (red) and 'outlineLight' (on a dark bg) keep white, which still reads fine there.
  const filledLabelColor = variant === 'primary' ? Colors.primaryDark : Colors.textOnPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg },
        isOutline && { borderWidth: 1.5, borderColor: outlineColor },
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={isOutline ? outlineColor : filledLabelColor} />
        ) : (
          <>
            {icon}
            <Text style={[styles.label, { color: isOutline ? outlineColor : filledLabelColor }]}>{title}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Touch.minSize + 8,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  label: {
    color: Colors.textOnPrimary,
    fontSize: FontSize.subtitle,
    fontWeight: FontWeight.bold,
  },
});
