import { StyleSheet, Text, View } from "react-native";
import type { ResumeProfile } from "@/api/types";
import { fontSize, spacing, useTheme } from "@/theme/theme";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

export function ResumeView({ profile }: { profile: ResumeProfile }) {
  const { colors } = useTheme();
  const basics = profile.basics ?? {};
  const sections = profile.sections ?? {};

  const contact = [
    basics.email,
    basics.phone,
    [basics.location?.city, basics.location?.region].filter(Boolean).join(", "),
  ]
    .filter((v) => v && String(v).trim())
    .join("  ·  ");

  const experience = (sections.experience?.items ?? []).filter(
    (i) => i.visible !== false,
  );
  const skills = (sections.skills?.items ?? []).filter((i) => i.visible !== false);
  const projects = (sections.projects?.items ?? []).filter(
    (i) => i.visible !== false,
  );
  const summary = sections.summary?.content?.trim() || basics.summary?.trim();

  return (
    <View style={styles.root}>
      <Text style={[styles.name, { color: colors.text }]}>
        {basics.name ?? "Your resume"}
      </Text>
      {basics.headline || basics.label ? (
        <Text style={[styles.headline, { color: colors.textMuted }]}>
          {basics.headline ?? basics.label}
        </Text>
      ) : null}
      {contact ? (
        <Text style={[styles.contact, { color: colors.textMuted }]}>{contact}</Text>
      ) : null}

      {summary ? (
        <Section title="Summary">
          <Text style={[styles.body, { color: colors.text }]}>{summary}</Text>
        </Section>
      ) : null}

      {experience.length ? (
        <Section title="Experience">
          {experience.map((item) => (
            <View key={item.id} style={styles.entry}>
              <Text style={[styles.entryTitle, { color: colors.text }]}>
                {item.position}
              </Text>
              <Text style={[styles.entryMeta, { color: colors.textMuted }]}>
                {[item.company, item.location, item.date]
                  .filter(Boolean)
                  .join("  ·  ")}
              </Text>
              {item.summary ? (
                <Text style={[styles.body, { color: colors.text }]}>
                  {item.summary}
                </Text>
              ) : null}
            </View>
          ))}
        </Section>
      ) : null}

      {projects.length ? (
        <Section title="Projects">
          {projects.map((item) => (
            <View key={item.id} style={styles.entry}>
              <Text style={[styles.entryTitle, { color: colors.text }]}>
                {item.name}
              </Text>
              {item.summary || item.description ? (
                <Text style={[styles.body, { color: colors.text }]}>
                  {item.summary || item.description}
                </Text>
              ) : null}
            </View>
          ))}
        </Section>
      ) : null}

      {skills.length ? (
        <Section title="Skills">
          <View style={styles.chips}>
            {skills.map((item) => (
              <View
                key={item.id}
                style={[styles.chip, { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={[styles.chipText, { color: colors.text }]}>
                  {item.name}
                </Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  name: { fontSize: fontSize.xxl, fontWeight: "800" },
  headline: { fontSize: fontSize.md, fontWeight: "600" },
  contact: { fontSize: fontSize.sm, marginTop: spacing.xs },
  section: { marginTop: spacing.xl, gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: "700", letterSpacing: 1 },
  entry: { gap: 2, marginBottom: spacing.md },
  entryTitle: { fontSize: fontSize.md, fontWeight: "700" },
  entryMeta: { fontSize: fontSize.xs },
  body: { fontSize: fontSize.sm, lineHeight: 21, marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  chipText: { fontSize: fontSize.xs, fontWeight: "600" },
});
