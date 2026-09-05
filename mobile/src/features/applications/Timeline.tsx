import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { StageEvent } from "@/api/types";
import { fontSize, spacing, useTheme } from "@/theme/theme";
import { eventTitle, formatEventTimestamp } from "./stages";

/**
 * Vertical timeline of stage events, most recent first. Long-press a row to
 * delete it (with confirmation).
 */
export function Timeline({
  events,
  onDelete,
  deletingId,
}: {
  events: StageEvent[];
  onDelete?: (eventId: string) => void;
  deletingId?: string | null;
}) {
  const { colors } = useTheme();
  // API returns ascending; show newest at the top.
  const ordered = [...events].sort((a, b) => b.occurredAt - a.occurredAt);

  return (
    <View>
      {ordered.map((event, index) => {
        const isLast = index === ordered.length - 1;
        const note = event.metadata?.note?.trim();
        const isNote = event.metadata?.eventType === "note";
        return (
          <Pressable
            key={event.id}
            disabled={!onDelete || deletingId === event.id}
            onLongPress={() => {
              if (!onDelete) return;
              Alert.alert(
                "Delete timeline entry?",
                "This removes the entry and may change the application's current stage.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => onDelete(event.id),
                  },
                ],
              );
            }}
            style={styles.row}
          >
            <View style={styles.gutter}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isNote ? colors.surfaceAlt : colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
              />
              {!isLast ? (
                <View style={[styles.line, { backgroundColor: colors.border }]} />
              ) : null}
            </View>

            <View style={styles.content}>
              <View style={styles.headerRow}>
                <Text
                  style={[styles.title, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {eventTitle(event)}
                </Text>
                <Text style={[styles.time, { color: colors.textMuted }]}>
                  {formatEventTimestamp(event.occurredAt)}
                </Text>
              </View>
              {note ? (
                <Text style={[styles.note, { color: colors.textMuted }]}>
                  {note}
                </Text>
              ) : null}
              {deletingId === event.id ? (
                <Text style={[styles.note, { color: colors.textMuted }]}>
                  Removing…
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md },
  gutter: { alignItems: "center", width: 16 },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 3,
  },
  line: { width: 2, flex: 1, marginTop: 2 },
  content: { flex: 1, paddingBottom: spacing.lg },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.md, fontWeight: "700", flexShrink: 1 },
  time: { fontSize: fontSize.xs },
  note: { fontSize: fontSize.sm, marginTop: 2, lineHeight: 19 },
});
