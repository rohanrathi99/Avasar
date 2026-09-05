import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Job, JobOutcome } from "@/api/types";
import { Button } from "@/components/Button";
import { OptionSheet, type SheetOption } from "@/components/OptionSheet";
import { toUserMessage } from "@/utils/errors";
import { fontSize, radius, spacing, useTheme } from "@/theme/theme";
import {
  useDeleteStageEvent,
  useStageEvents,
  useTransitionStage,
} from "./hooks";
import {
  deriveCurrentStage,
  isPositiveOutcome,
  nextStageOptions,
  OUTCOME_OPTIONS,
  outcomeLabel,
  stageIndex,
  stageLabel,
  STAGE_ORDER,
} from "./stages";
import { Timeline } from "./Timeline";

// Progress steps exclude the terminal "closed" stage.
const PROGRESS_STAGES = STAGE_ORDER.filter((s) => s !== "closed");

export function ApplicationSection({ job }: { job: Job }) {
  const { colors } = useTheme();
  const events = useStageEvents(job.id);
  const transition = useTransitionStage(job.id);
  const remove = useDeleteStageEvent(job.id);

  const [sheet, setSheet] = useState<null | "advance" | "outcome">(null);
  const [error, setError] = useState<string | null>(null);

  const list = events.data ?? [];
  const currentStage = useMemo(() => deriveCurrentStage(list), [list]);
  const advanceOptions = nextStageOptions(currentStage);
  const currentIndex = currentStage ? stageIndex(currentStage) : -1;

  function run(p: Promise<unknown>) {
    setError(null);
    p.catch((e) => setError(toUserMessage(e)));
  }

  function onPickAdvance(key: string) {
    setSheet(null);
    run(transition.mutateAsync({ toStage: key as (typeof STAGE_ORDER)[number] }));
  }

  function onPickOutcome(key: string) {
    setSheet(null);
    // Terminal outcomes both close the application and log a timeline entry.
    run(
      transition.mutateAsync({
        toStage: "closed",
        outcome: key as JobOutcome,
      }),
    );
  }

  const busy = transition.isPending;

  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Application
      </Text>

      {job.outcome ? (
        <View
          style={[
            styles.outcome,
            {
              backgroundColor: isPositiveOutcome(job.outcome)
                ? `${colors.success}22`
                : `${colors.textMuted}22`,
            },
          ]}
        >
          <Text
            style={[
              styles.outcomeText,
              {
                color: isPositiveOutcome(job.outcome)
                  ? colors.success
                  : colors.textMuted,
              },
            ]}
          >
            Outcome: {outcomeLabel(job.outcome)}
          </Text>
        </View>
      ) : null}

      {/* Stage progress */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stepper}
      >
        {PROGRESS_STAGES.map((stage) => {
          const done = currentIndex >= stageIndex(stage);
          return (
            <View
              key={stage}
              style={[
                styles.step,
                {
                  backgroundColor: done ? colors.primary : colors.surfaceAlt,
                  borderColor: done ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color: done ? colors.primaryText : colors.textMuted,
                  fontSize: fontSize.xs,
                  fontWeight: "700",
                }}
              >
                {stageLabel(stage)}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Timeline */}
      {events.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
      ) : list.length ? (
        <View style={styles.timeline}>
          <Timeline
            events={list}
            onDelete={(id) => run(remove.mutateAsync(id))}
            deletingId={remove.isPending ? remove.variables : null}
          />
        </View>
      ) : (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          No timeline yet. Record a stage to start tracking this application.
        </Text>
      )}

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        {advanceOptions.length ? (
          <Button
            title={
              currentStage ? "Advance stage" : "Record first stage"
            }
            onPress={() => setSheet("advance")}
            loading={busy}
          />
        ) : null}
        {currentStage && !job.outcome ? (
          <Button
            title="Mark outcome"
            variant="secondary"
            onPress={() => setSheet("outcome")}
            loading={busy}
          />
        ) : null}
      </View>

      <OptionSheet
        visible={sheet === "advance"}
        title="Advance to stage"
        onClose={() => setSheet(null)}
        onSelect={onPickAdvance}
        options={advanceOptions.map(
          (s): SheetOption => ({ key: s, label: stageLabel(s) }),
        )}
      />
      <OptionSheet
        visible={sheet === "outcome"}
        title="Mark outcome"
        onClose={() => setSheet(null)}
        onSelect={onPickOutcome}
        options={OUTCOME_OPTIONS.map(
          (o): SheetOption => ({
            key: o,
            label: outcomeLabel(o),
            destructive: o === "rejected" || o === "withdrawn",
          }),
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: "700" },
  outcome: { padding: spacing.sm, borderRadius: radius.sm },
  outcomeText: { fontSize: fontSize.sm, fontWeight: "700" },
  stepper: { gap: spacing.xs, paddingVertical: spacing.xs },
  step: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  timeline: { marginTop: spacing.sm },
  empty: { fontSize: fontSize.sm, marginVertical: spacing.sm },
  error: { fontSize: fontSize.sm },
  actions: { gap: spacing.md },
});
