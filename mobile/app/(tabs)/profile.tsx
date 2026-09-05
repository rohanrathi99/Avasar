import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/auth/AuthContext";
import { fontSize, radius, spacing, useTheme } from "@/theme/theme";

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();

  return (
    <Screen padded>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarText, { color: colors.primaryText }]}>
            {(user?.displayName ?? user?.username ?? "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>
          {user?.displayName ?? user?.username ?? "—"}
        </Text>
        <Text style={[styles.handle, { color: colors.textMuted }]}>
          @{user?.username ?? "—"}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Row label="Workspace" value={user?.workspaceName ?? "—"} />
        <Row label="Role" value={user?.isSystemAdmin ? "Admin" : "Member"} />
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
  header: { alignItems: "center", paddingVertical: spacing.xl },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: fontSize.xxl, fontWeight: "800" },
  name: { fontSize: fontSize.xl, fontWeight: "700" },
  handle: { fontSize: fontSize.sm, marginTop: 2 },
  card: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: fontSize.sm },
  rowValue: { fontSize: fontSize.sm, fontWeight: "600" },
});
