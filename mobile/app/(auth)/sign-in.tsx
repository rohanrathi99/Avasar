import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getAppStatus } from "@/api/app";
import { bootstrapStatus } from "@/api/auth";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/auth/AuthContext";
import { toUserMessage } from "@/utils/errors";
import { fontSize, spacing, useTheme } from "@/theme/theme";

export default function SignInScreen() {
  const { colors } = useTheme();
  const { signIn } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Public endpoints that shape the auth UI.
  const status = useQuery({ queryKey: ["appStatus"], queryFn: getAppStatus });
  const bootstrap = useQuery({
    queryKey: ["bootstrap"],
    queryFn: bootstrapStatus,
  });

  const setupRequired = bootstrap.data?.setupRequired ?? false;
  const hostedSignups =
    status.data?.appMode === "hosted" &&
    Boolean(status.data?.capabilities?.hostedSignups);
  const demoMode = Boolean(status.data?.demoMode);

  const canSubmit = username.trim().length > 0 && password.length > 0;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(username.trim(), password);
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
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
          <Text style={[styles.brand, { color: colors.text }]}>JobOps</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Sign in to your workspace
          </Text>

          {demoMode ? (
            <View style={[styles.banner, { backgroundColor: `${colors.warning}22` }]}>
              <Text style={[styles.bannerText, { color: colors.warning }]}>
                This is a read-only public demo. Sign-up and changes are disabled.
              </Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <TextField
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="you"
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            {error ? (
              <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
            ) : null}

            <Button
              title="Sign in"
              onPress={handleSubmit}
              loading={submitting}
              disabled={!canSubmit}
            />
          </View>

          {setupRequired ? (
            <Link href="/(auth)/setup" style={styles.linkWrap}>
              <Text style={[styles.link, { color: colors.primary }]}>
                First time here? Create the admin account →
              </Text>
            </Link>
          ) : null}
          {hostedSignups && !setupRequired ? (
            <Link href="/(auth)/setup" style={styles.linkWrap}>
              <Text style={[styles.link, { color: colors.primary }]}>
                Don't have an account? Create one →
              </Text>
            </Link>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", paddingVertical: spacing.xxl },
  brand: { fontSize: fontSize.xxl, fontWeight: "800", textAlign: "center" },
  subtitle: {
    fontSize: fontSize.md,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  form: { marginTop: spacing.md },
  banner: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  bannerText: { fontSize: fontSize.sm, fontWeight: "600" },
  error: { fontSize: fontSize.sm, marginBottom: spacing.md },
  linkWrap: { marginTop: spacing.xl, alignSelf: "center" },
  link: { fontSize: fontSize.sm, fontWeight: "600" },
});
