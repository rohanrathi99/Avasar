import Constants from "expo-constants";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/auth/AuthContext";
import { env } from "@/config/env";
import { fontSize, radius, spacing, useTheme } from "@/theme/theme";

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text
        style={[styles.rowValue, { color: colors.text }]}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {value}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const version = Constants.expoConfig?.version ?? "—";

  return (
    <Screen padded>
      <Text style={[styles.section, { color: colors.textMuted }]}>CONNECTION</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Row label="API server" value={env.apiBaseUrl} />
        <Row label="Auth" value="Bearer token (Secure Store)" />
      </View>

      <Text style={[styles.section, { color: colors.textMuted }]}>ABOUT</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Row label="App version" value={version} />
        <Row label="Theme" value="Follows system appearance" />
      </View>

      <Button
        title="Sign out"
        variant="danger"
        onPress={() => void signOut()}
        style={{ marginTop: spacing.xl }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  card: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  rowLabel: { fontSize: fontSize.sm },
  rowValue: { fontSize: fontSize.sm, fontWeight: "600", flexShrink: 1 },
});
