# JobOps Mobile (React Native + Expo)

Native Android & iOS client for the existing **JobOps** backend. It is a real
React Native app (not a WebView) that talks to the same Express API under
`orchestrator/` that the web app uses — the backend stays the single source of
truth for auth, jobs, AI scoring, applications, resumes, and integrations.

```
React Native / Expo  →  JobOps API (/api on :3001)  →  existing business logic
                                                        (DB · extractors · LLM · resume engine · Gmail)
```

This workspace was added under `mobile/` in the monorepo. It reuses the shared
TypeScript contracts from `job-ops-shared` (`../shared`) so mobile and web share
data models.

> **Status:** Implemented — auth, API client, navigation + guards, Jobs
> list/detail + AI scoring, Applications stage timeline, Resume Studio (view,
> per-job AI tailoring, PDF export/share), and Ghostwriter chat (live SSE
> streaming, cancel, reset). Push notifications and document capture land in
> later phases (see [Roadmap](#roadmap)).

---

## 1. Prerequisites

- Node 22 (matches the repo's Volta pin) and npm.
- A running JobOps backend (`npm --workspace orchestrator run dev`, serving on
  `http://localhost:3001`).
- For device/simulator runs: the **Expo Go** app, or a development build (see
  below). For production builds: an **Expo account** + **EAS CLI**
  (`npm i -g eas-cli`), plus Apple Developer / Google Play accounts.

## 2. Install

Dependencies are installed from the **repo root** (npm workspaces):

```bash
npm install
```

This installs the `mobile` workspace alongside the others. (Adding this
workspace changes the root lockfile; run `npm install` once after pulling.)

## 3. Configure the API URL

Only **public** config is bundled. Copy the example and point it at your API:

```bash
cp mobile/.env.example mobile/.env
```

`EXPO_PUBLIC_API_URL` rules:

| Where the app runs | Value |
| --- | --- |
| iOS simulator (same Mac) | `http://localhost:3001` |
| Android emulator | `http://10.0.2.2:3001` |
| Physical device on your Wi‑Fi | `http://<your-computer-LAN-IP>:3001` |
| Staging / production | your HTTPS origin, e.g. `https://api.example.com` |

The app appends `/api` itself; give it a bare origin.

> **Never** put server secrets (LLM keys, `JWT_SECRET`, Gmail client secret, DB
> creds, SMTP, Stripe) in `.env` or any `EXPO_PUBLIC_*` var. The app only ever
> holds a per-user JWT obtained at runtime from `POST /api/auth/login`.

## 4. Run in development

```bash
cd mobile
npm start          # Expo dev server + QR code
npm run android    # open on Android emulator/device
npm run ios        # open on iOS simulator (macOS)
```

- **Android emulator** can't see `localhost`; use `http://10.0.2.2:3001`.
- On first launch the app calls `GET /api/app/status` + `/api/auth/bootstrap-status`
  to decide whether to show **Sign in**, first-run **Create admin** (local mode),
  or **Create account** (hosted mode).

## 5. Type-check, lint & test

```bash
cd mobile
npm run check:types   # tsc --noEmit
npm run lint          # expo lint
npm run test:run      # jest (unit tests)
```

The mobile workspace is intentionally **excluded from the repo-root Biome check**
(`biome.json`) — it uses Expo's own lint config so RN/Expo conventions don't
fight the server rules. It does not affect `npm run check:all`, the orchestrator
type-check, or the orchestrator test suite.

---

## Architecture

### Authentication (reuses the backend, no second auth system)

- JWT (HS256) **Bearer token** in the `Authorization` header — the same scheme
  the web app uses. No cookies.
- The token is stored in the OS keychain/keystore via **Expo Secure Store**
  (`src/auth/secureStore.ts`), never in AsyncStorage or plain files.
- `src/auth/AuthContext.tsx` restores the session on launch: it loads the token,
  skips the probe if it's already expired (`src/auth/token.ts` decodes the
  public JWT payload — the signature is verified server-side, never on device),
  then validates it with `GET /api/auth/me`.
- The API client (`src/api/http.ts`) attaches the token to every request. A
  `401` clears the session; the root `AuthGate` redirects to `(auth)/sign-in`.
- Logout calls `POST /api/auth/logout` (server-side revocation) and clears the
  keychain + query cache.

### API layer

`src/api/` is the single place that knows about the backend:

| File | Responsibility |
| --- | --- |
| `http.ts` | fetch wrapper: `{ ok, data, meta }` envelope unwrap, bearer auth, timeouts, 401 handling, `ApiError`/`NetworkError` |
| `types.ts` | re-exports shared contracts (`Job`, `JobListItem`, `ApiResponse`, …) + declares auth/user shapes the shared pkg omits |
| `auth.ts` | login / setup / signup / me / logout / bootstrap-status |
| `app.ts` | `GET /api/app/status` (mode + capabilities) |
| `jobs.ts` | list / revision / detail / rescore / apply / skip / PDF path |
| `sse.ts` | POST-stream SSE reader for long-running AI (ghostwriter, batch actions) |

Server state uses **TanStack Query** (`src/query/queryClient.ts`) — auth/client
errors are never retried; transient/5xx errors back off.

> **Jobs are not paginated/searched/sorted server-side.** `GET /api/jobs` filters
> by `status` only and returns the full status-filtered set sorted
> `discoveredAt DESC`. Search, sort, and virtualization are done on-device
> (`src/features/jobs/format.ts` + `FlatList`).

### AI scoring & long-running operations

- Scoring is server-side only: `POST /api/jobs/:id/rescore` → the existing
  `scorer` → `LlmService`. The app never calls an LLM directly and never holds
  LLM credentials. Failures (`SERVICE_UNAVAILABLE`/`LlmNotConfigured`) surface as
  friendly messages (`src/utils/errors.ts`).
- The backend has **no operation-id/polling model**. Progress for chat/tailoring
  is delivered as **POST requests with `stream: true`** returning
  `text/event-stream`. Native `EventSource` can't do POST + headers, so
  `src/api/sse.ts` reads the response body stream (via `expo/fetch`) and parses
  `data:` frames — the same approach as the web client's `lib/sse.ts`.

### Navigation (Expo Router)

- File-based routes in `app/`. Groups: `(auth)` (sign-in, setup) and `(tabs)`
  (Jobs, Applications, Resume, Profile, Settings), plus `job/[id]` presented
  over the tabs.
- The single guard is `AuthGate` in `app/_layout.tsx`: it redirects between
  `(auth)` and `(tabs)` based on session status. Protected content lives under
  `(tabs)`.
- Deep links use the `jobops://` scheme (`app.config.ts`); `typedRoutes` is on.

---

## Native configuration

`app.config.ts` (dynamic Expo config) sets:

- **iOS** bundle id `com.jobops.mobile`, build number, camera/photo usage
  strings.
- **Android** package `com.jobops.mobile`, version code, `CAMERA` /
  `POST_NOTIFICATIONS` permissions, deep-link intent filter.
- Plugins: `expo-router`, `expo-secure-store`, `expo-splash-screen`,
  `expo-image-picker`, `expo-notifications`.

Override the app id per environment with `EXPO_PUBLIC_APP_ID`.

## Builds (EAS)

`eas.json` defines three profiles: `development` (dev client, APK),
`preview` (internal APK), `production` (AAB, auto-increment). Each sets its own
`EXPO_PUBLIC_API_URL`.

> The build/signing/submission steps below require **your** Expo, Apple
> Developer, and Google Play accounts and signing keys. They are run by you —
> they can't be executed from this repo.

```bash
cd mobile
eas login
eas init                       # links the project, writes the EAS project id

# Development client
eas build --profile development --platform android
eas build --profile development --platform ios

# Production
eas build --profile production --platform android   # → .aab for Google Play
eas build --profile production --platform ios        # → TestFlight / App Store
```

### App signing

- **Android:** let EAS manage the keystore (`eas build` prompts on first run) or
  supply your own. Keep the keystore out of git (`.gitignore` already excludes
  `*.jks`, `*.p12`, `*.key`).
- **iOS:** EAS manages certificates/provisioning profiles, or use
  `eas credentials` to bring your own. `*.p8`/`*.mobileprovision` are gitignored.

### Publishing

- **Google Play:** upload the `.aab`, or `eas submit --platform android` with a
  Play service-account key configured in `eas.json → submit`.
- **App Store / TestFlight:** `eas submit --platform ios` after a production
  build, or upload via Transporter/App Store Connect.

Validate production config with an actual build — a working `expo start` does not
prove the store build is correct.

## Push notifications (planned)

The backend currently has **no** push infrastructure. The planned design:
mobile registers its Expo push token with a new backend endpoint, and the Gmail
email-routing flow (which already classifies interview/offer/rejection emails)
emits a notification via FCM/APNs. This requires backend changes + FCM/APNs
credentials and is tracked as a follow-up.

## Roadmap

| Phase | Scope | State |
| --- | --- | --- |
| Foundation | workspace, API client, auth + guards, Jobs list/detail, scoring | ✅ |
| Applications | stage timeline, advance-stage & outcome transitions (`/jobs/:id/stages`, `/outcome`), delete entries | ✅ |
| Resume | base resume view, per-job AI tailoring (`/summarize`), PDF generate + download/share (`expo-file-system`+`expo-sharing`) | ✅ |
| Notifications | push-token registration + backend hook into Gmail routing | ⏳ |
| Documents | camera/file capture → base64 upload endpoints | ⏳ |
| Ghostwriter chat | per-job AI chat over POST-stream SSE (`/jobs/:id/chat`), live token streaming, cancel, reset | ✅ (default thread) |
| Resilience/perf | offline states, SSE recovery, FlashList | ⏳ |

## Security notes

- Treat the app as an untrusted client; the backend validates auth, ownership,
  and resource access. Client-supplied ids are never trusted server-side.
- No LLM keys, DB creds, JWT secret, SMTP, Stripe, or Gmail client secret are
  bundled — verify with `grep -R "EXPO_PUBLIC" app.config.ts .env*`.
- Identity/face verification is **not** part of JobOps and is not implemented.
