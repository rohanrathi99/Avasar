import { StyleSheet, Text, View } from "react-native";
import type { JobStatus } from "@/api/types";
import { scoreBand } from "@/features/jobs/format";
import { fontSize, radius, useTheme } from "@/theme/theme";

export function Badge({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  const { colors } = useTheme();
  const band = scoreBand(score);
  const color =
    band === "high"
      ? colors.scoreHigh
      : band === "mid"
        ? colors.scoreMid
        : colors.scoreLow;
  const label = band === "none" ? "Not scored" : `${Math.round(score as number)} match`;
  return <Badge label={label} color={color} bg={`${color}22`} />;
}

const STATUS_TONE: Record<JobStatus, "primary" | "success" | "warning" | "muted"> = {
  discovered: "muted",
  processing: "warning",
  ready: "primary",
  applied: "success",
  in_progress: "primary",
  skipped: "muted",
  expired: "warning",
};

export function StatusBadge({
  status,
  label,
}: {
  status: JobStatus;
  label: string;
}) {
  const { colors } = useTheme();
  const tone = STATUS_TONE[status] ?? "muted";
  const color =
    tone === "primary"
      ? colors.primary
      : tone === "success"
        ? colors.success
        : tone === "warning"
          ? colors.warning
          : colors.textMuted;
  return <Badge label={label} color={color} bg={`${color}22`} />;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  text: { fontSize: fontSize.xs, fontWeight: "700" },
});
