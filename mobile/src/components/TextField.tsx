import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { fontSize, radius, spacing, useTheme } from "@/theme/theme";

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = "none",
  autoComplete,
  textContentType,
  editable = true,
  errorText,
  onSubmitEditing,
  returnKeyType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?: "username" | "password" | "name" | "off";
  textContentType?: "username" | "password" | "newPassword" | "name" | "none";
  editable?: boolean;
  errorText?: string;
  onSubmitEditing?: () => void;
  returnKeyType?: "done" | "next" | "go";
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        autoComplete={autoComplete}
        textContentType={textContentType}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: errorText
              ? colors.danger
              : focused
                ? colors.primary
                : colors.border,
          },
        ]}
      />
      {errorText ? (
        <Text style={[styles.error, { color: colors.danger }]}>{errorText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
  },
  error: { fontSize: fontSize.xs, marginTop: spacing.xs },
});
