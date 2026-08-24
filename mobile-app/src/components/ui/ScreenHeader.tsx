import { Bell } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  onNotificationsPress?: () => void;
}

export function ScreenHeader({ title, subtitle, onNotificationsPress }: Props) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {onNotificationsPress && (
        <Pressable onPress={onNotificationsPress} hitSlop={8} style={styles.bellButton}>
          <Bell size={20} color={Colors.text} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  title: { fontSize: FontSize.heading, fontWeight: FontWeight.bold, color: Colors.text },
  subtitle: { fontSize: FontSize.body, color: Colors.textSecondary, marginTop: 2 },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
