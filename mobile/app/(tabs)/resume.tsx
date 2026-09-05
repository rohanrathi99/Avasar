import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ApiError } from "@/api/http";
import { designResumePdfEndpoint } from "@/api/resume";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import {
  EmptyState,
  ErrorState,
  LoadingView,
  useThemedRefreshControl,
} from "@/components/States";
import { downloadAndSharePdf } from "@/features/resume/pdf";
import { ResumeView } from "@/features/resume/ResumeView";
import {
  useGenerateDesignResumePdf,
  useResumeProfile,
} from "@/features/resume/hooks";
import { toUserMessage } from "@/utils/errors";
import { fontSize, spacing, useTheme } from "@/theme/theme";

export default function ResumeScreen() {
  const { colors } = useTheme();
  const profile = useResumeProfile();
  const generate = useGenerateDesignResumePdf();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useThemedRefreshControl(profile.isRefetching, () => {
    void profile.refetch();
  });

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      const pdf = await generate.mutateAsync();
      await downloadAndSharePdf(designResumePdfEndpoint(), pdf.fileName);
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (profile.isLoading) return <LoadingView label="Loading your resume…" />;

  // A missing resume is a normal state (nothing imported yet), not an error.
  const notFound =
    profile.isError &&
    profile.error instanceof ApiError &&
    profile.error.code === "NOT_FOUND";

  if (notFound) {
    return (
      <Screen padded>
        <EmptyState
          title="No resume yet"
          message="Import a resume in JobOps on the web to view it here and generate tailored PDFs."
          actionLabel="Reload"
          onAction={() => void profile.refetch()}
        />
      </Screen>
    );
  }

  if (profile.isError || !profile.data) {
    return (
      <Screen padded>
        <ErrorState
          message={toUserMessage(profile.error)}
          onRetry={() => void profile.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={refresh}
      >
        <ResumeView profile={profile.data} />
        <View style={styles.actions}>
          <Button
            title="Download / Share PDF"
            onPress={handleExport}
            loading={busy}
          />
        </View>
        {error ? (
          <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  actions: { marginTop: spacing.xl },
  error: { fontSize: fontSize.sm, marginTop: spacing.md },
});
