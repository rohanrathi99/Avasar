import { Redirect } from "expo-router";

// Entry point. The AuthGate in the root layout redirects to (auth) when there
// is no session, so pointing here at the main tabs is safe.
export default function Index() {
  return <Redirect href="/(tabs)/jobs" />;
}
