import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { useAuth } from "@/auth/AuthContext";
import { registerDeviceWithBackend } from "./registration";

// Foreground presentation: show a banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }) as Notifications.NotificationBehavior,
});

type Router = ReturnType<typeof useRouter>;

function routeFromData(data: unknown, router: Router): void {
  if (!data || typeof data !== "object") return;
  const jobId = (data as { jobId?: unknown }).jobId;
  if (typeof jobId === "string" && jobId) {
    router.push(`/job/${jobId}`);
  }
}

/**
 * Mounts once under the auth provider. Registers the device's push token when
 * signed in, and deep-links to the relevant job when a notification is tapped
 * (both while running and from a cold start).
 */
export function NotificationsProvider(): null {
  const { status } = useAuth();
  const router = useRouter();
  const registered = useRef(false);

  useEffect(() => {
    if (status !== "signedIn") {
      registered.current = false;
      return;
    }
    if (registered.current) return;
    registered.current = true;
    void registerDeviceWithBackend();
  }, [status]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        routeFromData(response.notification.request.content.data, router);
      },
    );
    // Handle the notification that cold-started the app, if any.
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          routeFromData(response.notification.request.content.data, router);
        }
      })
      .catch(() => {});
    return () => subscription.remove();
  }, [router]);

  return null;
}
