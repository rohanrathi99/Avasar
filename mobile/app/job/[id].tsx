import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScoreBadge, StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingView } from "@/components/States";
import { formatSalary, statusLabel } from "@/features/jobs/format";
import {
  useApplyToJob,
  useJob,
  useRescoreJob,
  useSkipJob,
} from "@/features/jobs/hooks";
import { toUserMessage } from "@/utils/errors";
import { fontSize, radius, spacing, useTheme } from "@/theme/theme";

export default function JobDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useJob(id);
  const rescore = useRescoreJob();
  const apply = useApplyToJob();
  const skip = useSkipJob();

  const [actionError, setActionError] = useState<string | null>(null);

  const job = query.data;
  const applyUrl = job?.applicationLink || job?.jobUrl || null;

  function runAction(fn: () => Promise<unknown>) {
    setActionError(null);
    fn().catch((e) => setActionError(toUserMessage(e)));
  }

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: job?.employer ?? "Job",
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />

      {query.isLoading ? (
        <LoadingView />
      ) : query.isError || !job ? (
        <ErrorState
          message={query.error ? toUserMessage(query.error) : "Job not found."}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.badges}>
            <ScoreBadge score={job.suitabilityScore} />
            {job.status ? (
              <StatusBadge status={job.status} label={statusLabel(job.status)} />
            ) : null}
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{job.title}</Text>
          <Text style={[styles.employer, { color: colors.textMuted }]}>
            {job.employer}
          </Text>

          <View style={styles.metaGrid}>
            {job.location ? (
              <Meta icon="location-outline" text={job.location} />
            ) : null}
            {formatSalary(job) ? (
              <Meta icon="cash-outline" text={formatSalary(job) as string} />
            ) : null}
            {job.source ? (
              <Meta icon="globe-outline" text={job.source} />
            ) : null}
          </View>

          {/* AI match / scoring */}
          <View
            style={[
              styles.section,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                AI match
              </Text>
              <Pressable
                onPress={() => runAction(() => rescore.mutateAsync(job.id))}
                disabled={rescore.isPending}
              >
                <Text style={[styles.action, { color: colors.primary }]}>
                  {rescore.isPending ? "Scoring…" : "Re-score"}
                </Text>
              </Pressable>
            </View>
            <Text style={[styles.reason, { color: colors.textMuted }]}>
              {job.suitabilityReason ||
                "Not scored yet. Tap Re-score to run the AI matcher on the backend."}
            </Text>
          </View>

          {/* Description */}
          {job.jobDescription ? (
            <View
              style={[
                styles.section,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Description
              </Text>
              <Text style={[styles.body, { color: colors.text }]}>
                {job.jobDescription}
              </Text>
            </View>
          ) : null}

          {actionError ? (
            <Text style={[styles.error, { color: colors.danger }]}>
              {actionError}
            </Text>
          ) : null}

          {/* Actions */}
          <View style={styles.actions}>
            {applyUrl ? (
              <Button
                title="Open posting"
                variant="secondary"
                onPress={() => void Linking.openURL(applyUrl)}
              />
            ) : null}
            {job.status !== "applied" && job.status !== "in_progress" ? (
              <Button
                title="Mark as applied"
                onPress={() => runAction(() => apply.mutateAsync(job.id))}
                loading={apply.isPending}
              />
            ) : null}
            {job.status === "discovered" || job.status === "ready" ? (
              <Button
                title="Skip"
                variant="secondary"
                onPress={() => runAction(() => skip.mutateAsync(job.id))}
                loading={skip.isPending}
              />
            ) : null}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

function Meta({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={[styles.metaText, { color: colors.textMuted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  badges: { flexDirection: "row", gap: spacing.sm },
  title: { fontSize: fontSize.xl, fontWeight: "800" },
  employer: { fontSize: fontSize.md, fontWeight: "500" },
  metaGrid: { gap: spacing.xs, marginTop: spacing.xs },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  metaText: { fontSize: fontSize.sm, textTransform: "capitalize" },
  section: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: "700" },
  action: { fontSize: fontSize.sm, fontWeight: "700" },
  reason: { fontSize: fontSize.sm, lineHeight: 20 },
  body: { fontSize: fontSize.sm, lineHeight: 21 },
  error: { fontSize: fontSize.sm },
  actions: { gap: spacing.md, marginTop: spacing.sm },
});
