import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingView } from "@/components/States";
import { ChatBubble } from "@/features/ghostwriter/ChatBubble";
import { useGhostwriterChat } from "@/features/ghostwriter/useChat";
import { fontSize, radius, spacing, useTheme } from "@/theme/theme";

interface Row {
  key: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  pending: boolean;
}

export default function GhostwriterScreen() {
  const { colors } = useTheme();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const chat = useGhostwriterChat(jobId);
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<Row>>(null);

  const rows = useMemo<Row[]>(() => {
    const items: Row[] = chat.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        key: m.id,
        role: m.role,
        content: m.content,
        pending: false,
      }));
    if (chat.pendingUser) {
      items.push({
        key: chat.pendingUser.id,
        role: "user",
        content: chat.pendingUser.content,
        pending: false,
      });
    }
    if (chat.isStreaming) {
      items.push({
        key: "streaming-draft",
        role: "assistant",
        content: chat.streamingText ?? "",
        pending: true,
      });
    }
    return items;
  }, [chat.messages, chat.pendingUser, chat.isStreaming, chat.streamingText]);

  function handleSend() {
    const text = draft.trim();
    if (!text || chat.isStreaming) return;
    chat.send(text);
    setDraft("");
  }

  function confirmReset() {
    Alert.alert("Reset conversation?", "This permanently clears all messages.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: () => chat.reset() },
    ]);
  }

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Ghostwriter",
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable onPress={confirmReset} hitSlop={12}>
              <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}
      >
        {chat.loading ? (
          <LoadingView />
        ) : chat.loadError ? (
          <ErrorState message={chat.loadError} onRetry={chat.reload} />
        ) : (
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(r) => r.key}
            renderItem={({ item }) => (
              <ChatBubble
                role={item.role}
                content={item.content}
                pending={item.pending}
              />
            )}
            contentContainerStyle={styles.list}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Ask Ghostwriter
                </Text>
                <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
                  Draft a cover note, tailor your pitch, or ask about this role.
                  Replies are generated on the JobOps backend.
                </Text>
              </View>
            }
          />
        )}

        {chat.sendError ? (
          <Text style={[styles.error, { color: colors.danger }]}>
            {chat.sendError}
          </Text>
        ) : null}

        <View
          style={[
            styles.inputBar,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message Ghostwriter…"
            placeholderTextColor={colors.textMuted}
            editable={!chat.isStreaming}
            multiline
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceAlt,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
          />
          {chat.isStreaming ? (
            <Pressable
              onPress={chat.cancel}
              style={[styles.send, { backgroundColor: colors.danger }]}
            >
              <Ionicons name="stop" size={20} color={colors.primaryText} />
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSend}
              disabled={!draft.trim()}
              style={[
                styles.send,
                {
                  backgroundColor: draft.trim() ? colors.primary : colors.surfaceAlt,
                },
              ]}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={draft.trim() ? colors.primaryText : colors.textMuted}
              />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: spacing.lg, flexGrow: 1 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: "700" },
  emptyBody: { fontSize: fontSize.sm, textAlign: "center", paddingHorizontal: spacing.xl },
  error: { fontSize: fontSize.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.xs },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    fontSize: fontSize.md,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
