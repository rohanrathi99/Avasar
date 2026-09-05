import { Screen } from "@/components/Screen";
import { EmptyState } from "@/components/States";

// Placeholder for the Resume phase. The backend exposes a single editable
// "Design Resume" document (/api/design-resume/*) plus per-job tailoring; this
// screen will surface viewing, AI tailoring progress (SSE), and PDF export in
// the next implementation pass.
export default function ResumeScreen() {
  return (
    <Screen padded>
      <EmptyState
        title="Resume Studio"
        message="Viewing, AI tailoring, and PDF export arrive in the next phase. Your resume lives on the JobOps backend and stays the source of truth."
      />
    </Screen>
  );
}
