import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScoreBadge, StatusBadge } from "@/components/Badge";
import type { JobListItem } from "@/api/types";
import { formatSalary, relativeTime, statusLabel } from "./format";
import { fontSize, radius, spacing, useTheme } from "@/theme/theme";

export const JobCard = memo(function JobCard({
  job,
  onPress,
}: {
  job: JobListItem;
  onPress: (id: string) => void;
}) {
  const { colors } = useTheme();
  const salary = formatSalary(job);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(job.id)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <ScoreBadge score={job.suitabilityScore} />
        {job.status ? (
          <StatusBadge status={job.status} label={statusLabel(job.status)} />
        ) : null}
      </View>

      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {job.title}
      </Text>
      <Text style={[styles.employer, { color: colors.textMuted }]} numberOfLines={1}>
        {job.employer}
      </Text>

      <View style={styles.metaRow}>
        {job.location ? (
          <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
            {job.location}
          </Text>
        ) : null}
        {salary ? (
          <Text style={[styles.meta, { color: colors.text }]} numberOfLines={1}>
            {salary}
          </Text>
        ) : null}
      </View>

      <View style={styles.footerRow}>
        {job.source ? (
          <Text style={[styles.source, { color: colors.textMuted }]}>
            {job.source}
          </Text>
        ) : null}
        <Text style={[styles.source, { color: colors.textMuted }]}>
          {relativeTime(job.discoveredAt)}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.lg, fontWeight: "700" },
  employer: { fontSize: fontSize.sm, fontWeight: "500" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  meta: { fontSize: fontSize.sm, flexShrink: 1 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  source: { fontSize: fontSize.xs, textTransform: "capitalize" },
});
