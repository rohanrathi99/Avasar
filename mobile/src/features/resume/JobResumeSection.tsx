import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { jobPdfEndpoint } from "@/api/jobs";
import type { Job } from "@/api/types";
import { Button } from "@/components/Button";
import { toUserMessage } from "@/utils/errors";
import { fontSize, radius, spacing, useTheme } from "@/theme/theme";
import { useGenerateJobPdf, useTailorJob } from "./hooks";
import { downloadAndSharePdf } from "./pdf";

const FRESHNESS_LABEL: Record<string, string> = {
  missing: "No PDF yet",
  uploaded: "Uploaded PDF",
  current: "PDF up to date",
  stale: "PDF out of date — regenerate",
  regenerating: "Generating…",
};

export function JobResumeSection({ job }: { job: Job }) {
  const { colors } = useTheme();
  const tailor = useTailorJob(job.id);
  const genPdf = useGenerateJobPdf(job.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTailored = Boolean(
    job.tailoredSummary || job.tailoredHeadline || job.tailoredSkills,
  );
  const hasPdf = job.pdfFreshness !== "missing";

  function run(p: Promise<unknown>) {
    setError(null);
    p.catch((e) => setError(toUserMessage(e)));
  }

  async function handleDownload() {
    setBusy(true);
    setError(null);
    try {
      const name = `${job.employer ?? "resume"}-${job.title ?? "job"}`;
      await downloadAndSharePdf(jobPdfEndpoint(job.id), name);
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Tailored resume</Text>
        <Text style={[styles.status, { color: colors.textMuted }]}>
          {FRESHNESS_LABEL[job.pdfFreshness] ?? job.pdfFreshness}
        </Text>
      </View>

      {isTailored && job.tailoredHeadline ? (
        <Text style={[styles.headline, { color: colors.text }]}>
          {job.tailoredHeadline}
        </Text>
      ) : null}
      {isTailored && job.tailoredSummary ? (
        <Text style={[styles.body, { color: colors.textMuted }]} numberOfLines={6}>
          {job.tailoredSummary}
        </Text>
      ) : null}
      {!isTailored ? (
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Generate an AI-tailored resume for this role. The tailoring runs on the
          JobOps backend and updates the resume PDF.
        </Text>
      ) : null}

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          title={isTailored ? "Re-tailor with AI" : "Tailor with AI"}
          onPress={() => run(tailor.mutateAsync(isTailored ? { force: true } : undefined))}
          loading={tailor.isPending}
        />
        <Button
          title="Generate PDF"
          variant="secondary"
          onPress={() => run(genPdf.mutateAsync())}
          loading={genPdf.isPending}
        />
        {hasPdf ? (
          <Button
            title="Download / Share PDF"
            variant="secondary"
            onPress={handleDownload}
            loading={busy}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.md, fontWeight: "700" },
  status: { fontSize: fontSize.xs, flexShrink: 1, textAlign: "right" },
  headline: { fontSize: fontSize.sm, fontWeight: "700" },
  body: { fontSize: fontSize.sm, lineHeight: 20 },
  error: { fontSize: fontSize.sm },
  actions: { gap: spacing.md, marginTop: spacing.xs },
});
