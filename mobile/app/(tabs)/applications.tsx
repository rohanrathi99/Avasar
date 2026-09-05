import { useRouter } from "expo-router";
import { useCallback } from "react";
import { FlatList, StyleSheet } from "react-native";
import type { JobListItem } from "@/api/types";
import { Screen } from "@/components/Screen";
import {
  EmptyState,
  ErrorState,
  LoadingView,
  useThemedRefreshControl,
} from "@/components/States";
import { JobCard } from "@/features/jobs/JobCard";
import { useJobsList } from "@/features/jobs/hooks";
import { toUserMessage } from "@/utils/errors";
import { spacing } from "@/theme/theme";

// Applications ARE jobs in JobOps — the tracked ones are those past "applied".
export default function ApplicationsScreen() {
  const router = useRouter();
  const query = useJobsList(["applied", "in_progress"]);
  const jobs = (query.data?.jobs ?? []) as JobListItem[];

  const openJob = useCallback((id: string) => router.push(`/job/${id}`), [router]);
  const refresh = useThemedRefreshControl(query.isRefetching, () => {
    void query.refetch();
  });

  if (query.isLoading) return <LoadingView label="Loading applications…" />;
  if (query.isError) {
    return (
      <Screen>
        <ErrorState
          message={toUserMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]}>
      <FlatList
        data={jobs}
        keyExtractor={(j) => j.id}
        renderItem={({ item }) => <JobCard job={item} onPress={openJob} />}
        refreshControl={refresh}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            title="No applications yet"
            message="Jobs you apply to will be tracked here through each stage."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
});
