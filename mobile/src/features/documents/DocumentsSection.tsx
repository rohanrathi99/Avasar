import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { jobDocumentContentEndpoint } from "@/api/documents";
import type { JobDocument } from "@/api/types";
import { Button } from "@/components/Button";
import { OptionSheet } from "@/components/OptionSheet";
import { downloadAndShareFile, formatBytes } from "@/utils/download";
import { toUserMessage } from "@/utils/errors";
import { fontSize, radius, spacing, useTheme } from "@/theme/theme";
import {
  captureFromCamera,
  type CapturedFile,
  pickDocument,
  pickImageFromLibrary,
} from "./capture";
import { useDeleteDocument, useJobDocuments, useUploadDocument } from "./hooks";

function iconFor(mediaType: string | null): keyof typeof Ionicons.glyphMap {
  if (!mediaType) return "document-outline";
  if (mediaType.startsWith("image/")) return "image-outline";
  if (mediaType === "application/pdf") return "document-text-outline";
  return "document-outline";
}

export function DocumentsSection({ jobId }: { jobId: string }) {
  const { colors } = useTheme();
  const docs = useJobDocuments(jobId);
  const upload = useUploadDocument(jobId);
  const remove = useDeleteDocument(jobId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addFrom(source: "camera" | "library" | "file") {
    setSheetOpen(false);
    setError(null);
    setBusy(true);
    try {
      let file: CapturedFile | null = null;
      if (source === "camera") file = await captureFromCamera();
      else if (source === "library") file = await pickImageFromLibrary();
      else file = await pickDocument();
      if (file) await upload.mutateAsync(file);
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function openDoc(doc: JobDocument) {
    setError(null);
    try {
      await downloadAndShareFile(
        jobDocumentContentEndpoint(jobId, doc.id),
        doc.fileName,
        doc.mediaType ? { mimeType: doc.mediaType } : undefined,
      );
    } catch (e) {
      setError(toUserMessage(e));
    }
  }

  function confirmDelete(doc: JobDocument) {
    Alert.alert("Delete document?", `Remove “${doc.fileName}”?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setError(null);
          remove.mutateAsync(doc.id).catch((e) => setError(toUserMessage(e)));
        },
      },
    ]);
  }

  const list = docs.data ?? [];

  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Documents</Text>
        {busy ? <ActivityIndicator color={colors.primary} /> : null}
      </View>

      {docs.isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
      ) : list.length ? (
        list.map((doc) => (
          <Pressable
            key={doc.id}
            onPress={() => openDoc(doc)}
            onLongPress={() => confirmDelete(doc)}
            disabled={remove.isPending}
            style={({ pressed }) => [
              styles.docRow,
              {
                borderColor: colors.border,
                backgroundColor: pressed ? colors.surfaceAlt : "transparent",
              },
            ]}
          >
            <Ionicons name={iconFor(doc.mediaType)} size={22} color={colors.textMuted} />
            <View style={styles.docMeta}>
              <Text style={[styles.docName, { color: colors.text }]} numberOfLines={1}>
                {doc.fileName}
              </Text>
              <Text style={[styles.docSub, { color: colors.textMuted }]}>
                {formatBytes(doc.byteSize)} · tap to open · hold to delete
              </Text>
            </View>
          </Pressable>
        ))
      ) : (
        <Text style={[styles.empty, { color: colors.textMuted }]}>
          Attach a photo, scan, or file (résumé, cover letter, offer). Max 10 MB.
        </Text>
      )}

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}

      <Button
        title="Add document"
        variant="secondary"
        onPress={() => setSheetOpen(true)}
        loading={busy}
      />

      <OptionSheet
        visible={sheetOpen}
        title="Add a document"
        onClose={() => setSheetOpen(false)}
        onSelect={(key) => void addFrom(key as "camera" | "library" | "file")}
        options={[
          { key: "camera", label: "Take a photo" },
          { key: "library", label: "Choose from library" },
          { key: "file", label: "Choose a file" },
        ]}
      />
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
  },
  title: { fontSize: fontSize.md, fontWeight: "700" },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  docMeta: { flex: 1 },
  docName: { fontSize: fontSize.sm, fontWeight: "600" },
  docSub: { fontSize: fontSize.xs, marginTop: 1 },
  empty: { fontSize: fontSize.sm, marginVertical: spacing.xs },
  error: { fontSize: fontSize.sm },
});
