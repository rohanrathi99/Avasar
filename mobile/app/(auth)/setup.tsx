import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { getAppStatus } from "@/api/app";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/auth/AuthContext";
import { toUserMessage } from "@/utils/errors";
import { fontSize, spacing, useTheme } from "@/theme/theme";

/**
 * Dual-purpose account creation:
 *   - local mode  → first-run admin via POST /api/auth/setup
 *   - hosted mode → new user via POST /api/auth/signup
 * The screen picks the right call from the app mode.
 */
export default function SetupScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { runSetup, runSignup } = useAuth();

  const status = useQuery({ queryKey: ["appStatus"], queryFn: getAppStatus });
  const hosted = status.data?.appMode === "hosted";

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordTooShort = password.length > 0 && password.length < 8;
  const canSubmit =
    username.trim().length > 0 && password.length >= 8 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const name = displayName.trim() || undefined;
      if (hosted) {
        await runSignup(username.trim(), password, name);
      } else {
        await runSetup(username.trim(), password, name);
      }
    } catch (e) {
      setError(toUserMessage(e));
      setSubmitting(false);
    }
  }

  return (
    <Screen padded>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: colors.text }]}>
            {hosted ? "Create your account" : "Create the admin account"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {hosted
              ? "Set up your JobOps workspace login."
              : "This is a self-hosted instance — create the first user."}
          </Text>

          <TextField
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoComplete="username"
            textContentType="username"
          />
          <TextField
            label="Display name (optional)"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="newPassword"
            errorText={passwordTooShort ? "At least 8 characters." : undefined}
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
          />

          {error ? (
            <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
          ) : null}

          <Button
            title={hosted ? "Create account" : "Create admin"}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!canSubmit}
          />
          <Button
            title="Back to sign in"
            variant="secondary"
            onPress={() => router.replace("/(auth)/sign-in")}
            style={{ marginTop: spacing.md }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingVertical: spacing.xxl },
  title: { fontSize: fontSize.xl, fontWeight: "800" },
  subtitle: { fontSize: fontSize.sm, marginTop: spacing.xs, marginBottom: spacing.xl },
  error: { fontSize: fontSize.sm, marginBottom: spacing.md },
});
