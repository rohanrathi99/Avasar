import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { JobListItem, JobStatus } from "@/api/types";
import { Screen } from "@/components/Screen";
import {
  EmptyState,
  ErrorState,
  LoadingView,
  useThemedRefreshControl,
} from "@/components/States";
import { JobCard } from "@/features/jobs/JobCard";
import {
  filterJobs,
  type JobSort,
  sortJobs,
} from "@/features/jobs/format";
import { useJobsList } from "@/features/jobs/hooks";
import { toUserMessage } from "@/utils/errors";
import { fontSize, radius, spacing, useTheme } from "@/theme/theme";

const FILTERS: { label: string; status?: JobStatus[] }[] = [
  { label: "All" },
  { label: "Ready", status: ["ready"] },
  { label: "New", status: ["discovered"] },
  { label: "Applied", status: ["applied"] },
  { label: "In progress", status: ["in_progress"] },
];

export default function JobsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [filterIndex, setFilterIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<JobSort>("recent");

  const activeFilter = FILTERS[filterIndex];
  const query = useJobsList(activeFilter.status);

  const jobs: JobListItem[] = useMemo(() => {
    const raw = query.data?.jobs ?? [];
    return sortJobs(filterJobs(raw as JobListItem[], search), sort);
  }, [query.data, search, sort]);

  const openJob = useCallback(
    (id: string) => router.push(`/job/${id}`),
    [router],
  );

  const refresh = useThemedRefreshControl(query.isRefetching, () => {
    void query.refetch();
  });

  const renderItem = useCallback(
    ({ item }: { item: JobListItem }) => (
      <JobCard job={item} onPress={openJob} />
    ),
    [openJob],
  );

  return (
    <Screen edges={["top"]}>
      <View style={styles.controls}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search title, company, location"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.search,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />

        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f.label}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          renderItem={({ item, index }) => {
            const active = index === filterIndex;
            return (
              <Pressable
                onPress={() => setFilterIndex(index)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.surfaceAlt,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? colors.primaryText : colors.textMuted,
                    fontWeight: "600",
                    fontSize: fontSize.sm,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />

        <Pressable
          onPress={() => setSort((s) => (s === "recent" ? "score" : "recent"))}
          style={styles.sortToggle}
        >
          <Text style={[styles.sortText, { color: colors.primary }]}>
            Sort: {sort === "recent" ? "Most recent" : "Best match"}
          </Text>
        </Pressable>
      </View>

      {query.isLoading ? (
        <LoadingView label="Loading jobs…" />
      ) : query.isError ? (
        <ErrorState
          message={toUserMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(j) => j.id}
          renderItem={renderItem}
          refreshControl={refresh}
          contentContainerStyle={styles.list}
          initialNumToRender={8}
          windowSize={10}
          removeClippedSubviews
          ListEmptyComponent={
            <EmptyState
              title={search ? "No matches" : "No jobs yet"}
              message={
                search
                  ? "Try a different search term."
                  : "Jobs discovered by JobOps will appear here."
              }
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  search: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
  },
  chips: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  sortToggle: { alignSelf: "flex-start", paddingVertical: spacing.xs },
  sortText: { fontSize: fontSize.sm, fontWeight: "600" },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
});
