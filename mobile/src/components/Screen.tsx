import { StyleSheet, View } from "react-native";
import type { Edge } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/theme/theme";

/** Themed, safe-area-aware page container. */
export function Screen({
  children,
  edges = ["top", "bottom"],
  padded = false,
}: {
  children: React.ReactNode;
  edges?: Edge[];
  padded?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View style={[styles.inner, padded && styles.padded]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1 },
  padded: { paddingHorizontal: 16 },
});
