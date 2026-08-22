/**
 * Wishlist page - jobs the user saved to apply to later.
 *
 * Jobs are added from the actions section on the jobs page and are removed
 * automatically when marked as applied.
 */

import type { JobListItem } from "@shared/types.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Heart, HeartOff, Loader2, MapPin } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryErrorToast } from "@/client/hooks/useQueryErrorToast";
import { showErrorToast } from "@/client/lib/error-toast";
import { queryKeys } from "@/client/lib/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import * as api from "../api";
import {
  EmptyState,
  ListItem,
  ListPanel,
  PageHeader,
  PageMain,
  StatusBadge,
} from "../components";

export const WishlistJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [removingJobId, setRemovingJobId] = useState<string | null>(null);

  const jobsQuery = useQuery({
    queryKey: queryKeys.jobs.wishlist(),
    queryFn: () => api.getJobs(),
  });
  useQueryErrorToast(jobsQuery.error, "Failed to load wishlist");

  const wishlistedJobs = useMemo(() => {
    const jobs = jobsQuery.data?.jobs ?? [];
    return jobs
      .filter((job): job is JobListItem & { wishlistedAt: string } =>
        Boolean(job.wishlistedAt),
      )
      .sort((a, b) => b.wishlistedAt.localeCompare(a.wishlistedAt));
  }, [jobsQuery.data]);

  const removeMutation = useMutation({
    mutationFn: (jobId: string) => api.removeJobFromWishlist(jobId),
    onMutate: (jobId: string) => {
      setRemovingJobId(jobId);
    },
    onSuccess: async () => {
      toast.success("Removed from wishlist");
      await queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
    onError: (error) => {
      showErrorToast(error, "Failed to remove job from wishlist");
    },
    onSettled: () => {
      setRemovingJobId(null);
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Heart}
        title="Wishlist"
        subtitle="Jobs you saved to apply to later"
        badge={
          wishlistedJobs.length > 0 ? String(wishlistedJobs.length) : undefined
        }
      />

      <PageMain>
        <ListPanel
          header={
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Saved jobs</div>
              <div className="text-xs text-muted-foreground">
                Marking a job as applied removes it from the wishlist
                automatically.
              </div>
            </div>
          }
        >
          {jobsQuery.isLoading ? (
            <output
              className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-muted-foreground"
              aria-live="polite"
            >
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              Loading wishlist…
            </output>
          ) : wishlistedJobs.length === 0 ? (
            <EmptyState
              icon={Heart}
              title="Your wishlist is empty"
              description="Save jobs you want to apply to later using “Add to Wishlist” in the job actions on the Jobs page."
              action={
                <Button variant="outline" onClick={() => navigate("/jobs/all")}>
                  Browse jobs
                </Button>
              }
            />
          ) : (
            wishlistedJobs.map((job) => (
              <ListItem key={job.id} onClick={() => navigate(`/job/${job.id}`)}>
                <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {job.title}
                      </span>
                      <StatusBadge status={job.status} />
                      {typeof job.suitabilityScore === "number" && (
                        <Badge variant="outline" className="text-xs">
                          {Math.round(job.suitabilityScore)}% match
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="truncate">{job.employer}</span>
                      {job.location && (
                        <span className="flex min-w-0 items-center gap-1">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{job.location}</span>
                        </span>
                      )}
                      <span>Saved {formatDateTime(job.wishlistedAt)}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        window.open(
                          job.applicationLink || job.jobUrl,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                    >
                      <ExternalLink className="size-3.5" />
                      Open listing
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={removingJobId === job.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeMutation.mutate(job.id);
                      }}
                    >
                      {removingJobId === job.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <HeartOff className="size-3.5" />
                      )}
                      Remove
                    </Button>
                  </div>
                </div>
              </ListItem>
            ))
          )}
        </ListPanel>
      </PageMain>
    </div>
  );
};
