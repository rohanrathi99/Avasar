import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button } from "./Button";
import { fontSize, spacing, useTheme } from "@/theme/theme";

export function LoadingView({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      {label ? (
        <Text style={[styles.muted, { color: colors.textMuted }]}>{label}</Text>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message ? (
        <Text style={[styles.muted, { color: colors.textMuted }]}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="secondary"
          style={{ marginTop: spacing.lg }}
        />
      ) : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <Text style={[styles.title, { color: colors.danger }]}>
        Something went wrong
      </Text>
      <Text style={[styles.muted, { color: colors.textMuted }]}>{message}</Text>
      {onRetry ? (
        <Button
          title="Try again"
          onPress={onRetry}
          variant="secondary"
          style={{ marginTop: spacing.lg }}
        />
      ) : null}
    </View>
  );
}

/** Standard pull-to-refresh control wired to the theme. */
export function useThemedRefreshControl(refreshing: boolean, onRefresh: () => void) {
  const { colors } = useTheme();
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.lg, fontWeight: "700", textAlign: "center" },
  muted: { fontSize: fontSize.sm, textAlign: "center" },
});
