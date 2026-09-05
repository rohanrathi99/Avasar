import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { fontSize, radius, spacing, useTheme } from "@/theme/theme";

export function ChatBubble({
  role,
  content,
  pending = false,
}: {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  pending?: boolean;
}) {
  const { colors } = useTheme();
  const isUser = role === "user";

  return (
    <View
      style={[
        styles.row,
        { justifyContent: isUser ? "flex-end" : "flex-start" },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
            : {
                backgroundColor: colors.surfaceAlt,
                borderBottomLeftRadius: 4,
              },
        ]}
      >
        {pending && !content ? (
          <ActivityIndicator
            size="small"
            color={isUser ? colors.primaryText : colors.textMuted}
          />
        ) : (
          <Text
            style={[
              styles.text,
              { color: isUser ? colors.primaryText : colors.text },
            ]}
          >
            {content}
            {pending ? <Text style={{ color: colors.textMuted }}> ▍</Text> : null}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: "100%", marginBottom: spacing.sm },
  bubble: {
    maxWidth: "86%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  text: { fontSize: fontSize.md, lineHeight: 22 },
});
