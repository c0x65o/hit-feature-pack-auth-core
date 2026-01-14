# Auth Core Feature Pack — Self-Contained Requirements (TypeScript-only)

## Goal

Make `@hit/feature-pack-auth-core` **fully self-contained** so it has **zero runtime dependency** on the Python auth module (`hit-modules/hit-module-auth`) and **no dependence** on hit-modules provisioner logic.

This document enumerates what FP Auth Core must include (responsibilities, data models, migrations, runtime services, public interfaces), and what the Python auth module currently provides that FP must replace.

## Scope / Definition of Done

- **Single migration source**: Auth-related schema is defined in **feature pack migrations** (`hit-feature-pack-auth-core/migrations/*`) and synced into consuming apps (e.g. `applications/*/migrations/feature-packs/auth-core__*.sql`).
- **Single language runtime**: all auth runtime is **TypeScript** running inside the app runtime (e.g. Next.js route handlers / server runtime used by feature pack dispatcher).
- **No Python services**: no `/api/proxy/auth` routing to Python, no `HIT_AUTH_URL` usage.
- **No provisioner / no service tokens**: no `X-HIT-Service-Token` flows, no “resolve config via provisioner”, no shared-db/SSO coupling, no cross-project semantics.
- **Single app DB**: Auth Core uses the app’s database connection directly (Drizzle) with no indirection.
- **Not backward compatible (data/runtime)**: V2 does **not** preserve Python auth DB state, active sessions, tokens, or legacy schema/behavior. Feature parity is maintained, not data compatibility.
- **Self-contained**: all endpoints required by Auth Core UI + SDK + other feature packs are served by FP-owned TypeScript server handlers.

## Current architecture (what exists today)

### What the app does today (cross-runtime boundary)

- The app implements a custom proxy route:
  - `applications/hitcents-erp/app/api/proxy/auth/[...path]/route.ts`
  - It forwards requests to `HIT_AUTH_URL` / `NEXT_PUBLIC_HIT_AUTH_URL` (default `http://localhost:8001` in dev).
- The Auth Core feature pack and SDK call `"/api/proxy/auth"` by default.
  - Some calls also forward `X-HIT-Service-Token` today; that entire concept is removed in the TS-only design.

### What Auth Core FP does today

Auth Core FP includes:

- **UI surfaces**: login/signup/forgot/reset/verify flows and admin pages.
- **Org dimension + assignment storage** (TypeScript/Drizzle): `org_*` tables are already owned by FP migrations.
- **Server APIs for org dimensions**: `src/server/api/*` for divisions/departments/locations/assignments + org scope.

Auth Core FP still **depends on Python auth module** for:

- Users directory + user CRUD
- Groups CRUD
- Sessions, devices, invites, audit log
- Permission checks (page/action/metric ACL)
- OAuth, 2FA, verification, password reset, magic link
- Feature flags `/features` (runtime)

Concretely:

- `hit-feature-pack-auth-core/src/server/api/users.ts` proxies `/directory/users`
- `hit-feature-pack-auth-core/src/server/api/auth-users*.ts` proxies `/users*`
- `hit-feature-pack-auth-core/src/server/api/auth-groups*.ts` proxies `/admin/groups*`
- `hit-feature-pack-auth-core/src/server/lib/require-action.ts` calls `/api/proxy/auth/permissions/actions/check/{actionKey}`

## Required responsibilities (what FP Auth Core must own)

### 1) Identity, sessions, and tokens

- **Register** (optional via feature flag): create user, hash password, issue access+refresh tokens
- **Login**: validate credentials, enforce lock/email-verified/2FA requirements, issue tokens
- **Refresh**: exchange refresh token for new access+refresh token
- **Logout**: revoke refresh token (and/or session record)
- **Logout-all**: revoke all sessions for user
- **Validate token**: app-side validation for JWTs issued by FP (no cross-runtime / no provisioner tokens)
- **Me**: return current user profile and claims
- **Cookie + header support**:
  - Accept `Authorization: Bearer <jwt>` and `hit_token` cookie
  - Preserve behavior used by existing UI hooks (`localStorage hit_token` + cookie)

### 2) Users (admin + directory)

- **Directory users** (for pickers): `/directory/users`
- **Users list/get/create/update/delete**:
  - Used by admin UI entity (`auth.user`) and org pickers
  - Must preserve the “userKey is email” convention currently used by org assignment tables (`org_user_assignments.user_key`)
- **Profile picture** upload and retrieval (if current UI supports it)
- **Dynamic profile fields** storage and metadata

### 3) Email-based flows

- **Email verification**:
  - Code-based verify (`/verify-email`) and link-based tokens (existing Python model includes `hit_auth_email_verification_tokens`)
  - Resend verification (`/resend-verification`)
  - Verification status (`/verification-status`)
- **Password reset**:
  - Request reset email (`/forgot-password`)
  - Reset by token (`/reset-password`)
- **Magic link** login:
  - Request (`/magic-link/request`)
  - Verify (`/magic-link/verify`)

Note: email delivery must be done via a TypeScript email capability (likely the new TS-only Email Core feature pack). Auth Core must define a **stable internal interface** for “send verification/reset/invite/magic-link emails”.

### 4) 2FA (TOTP + backup codes)

- Setup (`/2fa/setup`)
- Verify setup (`/2fa/verify-setup`)
- Disable (`/2fa/disable`)
- Backup codes: list/regenerate (`/2fa/backup-codes`)
- Legacy endpoints currently used by SDK:
  - `/enable-2fa`
  - `/verify-2fa`

### 5) OAuth providers

- Provider authorize URL (`/oauth/{provider}/url` and/or `/oauth/url`)
- Callback exchange (`/oauth/callback` + any provider-specific callback support)
- Store provider links per user

### 6) Security events, audit log, and rate limiting

- Record login attempts for brute-force protection
- Rate limiting for login and sensitive endpoints (password reset, magic link, 2FA)
- Security/audit event log (`/audit-log`) with sufficient metadata (actor/user, ip, user agent, event type)

### 7) Impersonation (admin support tooling)

- Start impersonation (`/impersonate/start`)
- End impersonation (`/impersonate/end`)
- Persist impersonation sessions and audit events

### 8) Groups and principals

- Groups CRUD for admin:
  - `/admin/groups`, `/admin/groups/{id}`
- Membership endpoints:
  - `/me/groups` (non-admin)
  - `/admin/groups/{group_id}/users`
  - `/admin/users/{user_email}/groups`
- **No dynamic groups in V2**:
  - We do not support segment-backed/dynamic membership.
  - Use **Permission Sets (“Security Groups”)** for access control, templates, and defaults.

### 9) Authorization / permissions (pages, actions, metrics)

Auth Core owns platform authorization, including:

- **Catalog ingestion**:
  - Current Python auth fetches a compiled permissions catalog from the app at runtime (`/api/permissions/catalog`).
  - In TS-only world, FP should read catalog from the **same compiled artifact** the app uses (no HTTP hop).
- **Permission checks**:
  - `GET /permissions/actions/check/{action_key}` (used by `requireAuthCoreAction`)
  - Page checks and batch checks used by router/middleware
  - Metric checks (for dashboards/metrics access)
- **Admin management APIs**:
  - Role/group/user overrides
  - Permission sets (“Security Groups”) + assignments + grants
  - Effective permissions endpoint(s)

### 10) Feature flags/config surface

Auth Core FP must expose a config surface compatible with existing consumers:

- `GET /config` and/or `GET /features` returning:
  - `allow_signup`, `password_login`, `password_reset`, `magic_link_login`, `email_verification`, `two_factor_auth`, `oauth_providers`
  - `available_roles` (V2 defaults to **only** `admin` and `user`) and group-related flags used by principals picker UI (`user_groups_enabled`, `dynamic_groups_enabled=false`)

Important: current `useAuthConfig()` reads from `window.__HIT_CONFIG.auth` (static build-time config). Admin hooks also call `/features` (runtime). Decide whether `/features` becomes purely derived from config or includes runtime capability checks.

## Required data models (must exist in app DB; owned by feature pack)

### Existing Auth Core FP tables (already in FP migrations)

From `hit-feature-pack-auth-core/migrations/0000_org_dimensions.sql` (+ follow-ons):

- `org_location_types`
- `org_locations`
- `org_divisions`
- `org_departments`
- `org_user_assignments`
- plus subsequent FP migrations:
  - `0001_org_entity_scopes.sql`
  - `0002_single_user_org_assignment.sql`
  - `0003_drop_cost_center_code.sql`

### Auth identity + security tables (currently in Python module)

From `hit-modules/hit-module-auth/app/models.py` (these must be recreated in TypeScript schema + FP migrations):

- `hit_auth_users`
- `hit_auth_refresh_tokens`
- `hit_auth_oauth_accounts`
- `hit_auth_totp_secrets`
- `hit_auth_backup_codes`
- `hit_auth_login_attempts`
- `hit_auth_events`
- `hit_auth_magic_link_tokens`
- `hit_auth_password_reset_tokens`
- `hit_auth_email_verification_tokens`
- `hit_auth_devices`
- `hit_auth_invites`
- `hit_auth_impersonation_sessions`
- `hit_auth_profile_field_metadata`
- `hit_auth_groups`
- `hit_auth_user_groups`

### Authorization / permissions tables (currently in Python module)

Also from `hit-modules/hit-module-auth/app/models.py`:

- `hit_auth_role_page_permissions`
- `hit_auth_group_page_permissions`
- `hit_auth_user_page_overrides`
- `hit_auth_permission_actions`
- `hit_auth_role_action_permissions`
- `hit_auth_group_action_permissions`
- `hit_auth_user_action_overrides`
- `hit_auth_permission_sets`
- `hit_auth_permission_set_assignments`
- `hit_auth_permission_set_page_grants`
- `hit_auth_permission_set_action_grants`
- `hit_auth_permission_set_metric_grants`
- `hit_auth_permission_seed_keys`

## Required migrations (feature pack owned)

### Guiding principles

- Prefer **FP-owned SQL schema installs** in `hit-feature-pack-auth-core/migrations/*` (already the pattern for org dimensions).
- Terminology note: these are “migrations” only in the mechanical sense (how HIT applies schema changes). **We are not migrating data from Python auth to V2.** We are installing a replacement schema (`hit_auth_v2_*`).
- This is a **new auth schema**. Do not carry forward Python-era compatibility logic.

### Migration source mapping (Python → FP)

Python auth schema is evolved via Alembic scripts:

- `hit-modules/hit-module-auth/alembic/versions/001_create_users_table.py`
- `.../002_add_session_and_oauth_tables.py`
- `.../003_add_remaining_auth_tables.py`
- `.../004_convert_roles_to_single_role.py`
- `.../005_add_locked_column.py`
- `.../006_add_profile_features.py`
- `.../007_add_last_login_column.py`
- `.../008_add_user_can_edit_to_profile_fields.py`
- `.../009_increase_profile_picture_url_size.py`
- `.../010_add_page_permissions.py`
- `.../011_add_user_groups.py`
- `.../012_add_group_page_permissions.py`
- `.../013_add_action_permissions.py`
- `.../014_add_permission_sets.py`
- `.../015_add_permission_seed_keys.py`
- `.../016_add_permission_set_template_role.py`

Auth Core FP must create SQL migrations (new files after `0003_*`) that reproduce the **required feature set**.
This does **not** require matching historical Alembic evolution or carrying legacy columns/behaviors.

Recommended grouping for FP SQL migrations:

- `0004_auth_users_and_core_tables.sql` (users + refresh tokens + login attempts + events)
- `0005_auth_oauth_and_2fa.sql` (oauth accounts + totp + backup codes + devices)
- `0006_auth_email_tokens_and_flows.sql` (magic link, reset, verification)
- `0007_auth_groups.sql` (groups + memberships)
- `0008_auth_profile_fields.sql` (profile metadata + any profile picture adjustments)
- `0009_auth_permissions_pages.sql` (role/user/group page permissions)
- `0010_auth_permissions_actions.sql` (actions registry + overrides)
- `0011_auth_permission_sets.sql` (permission sets + grants + seed keys + template role)

## Required runtime services (TypeScript-only)

### Server execution model

Auth Core FP must provide TypeScript server handlers that run in the app runtime:

- Next.js route handlers (via feature pack dispatcher) for all auth endpoints listed below
- A DB access layer using the app’s database connection (Drizzle)
- A crypto/auth layer:
  - password hashing (Argon2 or equivalent)
  - JWT issuing/verification and key management
  - token hashing for one-time tokens (magic/reset/verification) and refresh tokens

### Must replace Python-only infrastructure dependencies

Python auth module currently depends on:

- **Provisioner** for config + DB DSN resolution (`hit-modules/hit-module-auth/app/database.py`)
- **hit-modules FastAPI middleware** for config injection + standard routes
- **service tokens** (`X-HIT-Service-Token`) for privileged calls

In the TS-only world, Auth Core FP must instead:

- Use **direct app DB connection** (no provisioner indirection)
- **Eliminate** privileged “service token” concepts entirely:
  - No service-token auth mode
  - No “admin via service token”
  - No shared-db or project-scoped token claims
  - All privileged operations are enforced using the **same user JWT + role/permission system** as everything else, or are **build/dev-time DB seeds** (see bootstrap).

## Public interfaces (must be provided by FP)

### Primary auth API (SDK + UI)

These endpoints are required because the TypeScript SDK (`hit-sdks/hit-sdk-typescript/src/auth.ts`) calls them:

- `POST /register`
- `POST /login`
- `POST /refresh`
- `POST /logout`
- `POST /logout-all`
- `POST /validate`
- `GET /me`
- `POST /verify-email`
- `POST /enable-2fa`
- `POST /verify-2fa`
- `POST /oauth/url` (or maintain the provider-scoped variant and keep this alias)
- `POST /oauth/callback`
- `GET /config`
- `GET /features`

### Admin + directory APIs (used by Auth Core FP UI)

Based on current TypeScript feature pack code and hooks:

- Directory:
  - `GET /directory/users`
- Users:
  - `GET /users`
  - `GET /users/{email}`
  - `POST /users`
  - `PUT /users/{email}`
  - `DELETE /users/{email}`
  - `POST /admin/users/{email}/resend-verification`
  - `PUT /admin/users/{email}/verify`
  - `POST /admin/users/{email}/reset-password`
- Sessions:
  - `GET /sessions`
  - `GET /admin/sessions`
  - `GET /admin/users/{email}/sessions`
  - `DELETE /admin/users/{email}/sessions`
  - `DELETE /sessions/{session_id}`
- Devices:
  - `GET /devices`
  - `POST /devices/{device_id}/trust`
  - `DELETE /devices/{device_id}`
- Invites:
  - `POST /invites`
  - `GET /invites`
  - `POST /invites/accept`
  - `POST /invites/reject`
  - `POST /invites/{invite_id}/resend`
  - `DELETE /invites/{invite_id}`
- Audit log:
  - `GET /audit-log`
- Groups:
  - `GET /admin/groups`
  - `POST /admin/groups`
  - `GET /admin/groups/{group_id}`
  - `PUT /admin/groups/{group_id}`
  - `DELETE /admin/groups/{group_id}`
  - `GET /admin/groups/{group_id}/users`
  - `GET /admin/users/{user_email}/groups`
- Permissions:
  - `GET /permissions/actions/check/{action_key:path}` (used today indirectly by `requireAuthCoreAction`)
  - plus the admin permissions surfaces (roles/users/groups pages & actions, permission sets)

### Feature pack-owned org APIs (already in FP)

These are already TypeScript-only and remain part of FP Auth Core:

- `/api/org/*` endpoints implemented in `hit-feature-pack-auth-core/src/server/api/*`:
  - divisions/departments/locations/location-types
  - assignments + assignments-id
  - me/scope and users/[userKey]/scope

Important: today these endpoints still call `requireAuthCoreAction`, which calls into `/api/proxy/auth/...`. That must be replaced with a local authorization check implementation.

## Replacements required inside Auth Core FP (implementation checklist)

### A) Remove proxy dependency from FP

- Replace all `getAuthUrl(): ... '/api/proxy/auth'` patterns inside FP server code with **local calls**:
  - `src/server/api/users.ts`
  - `src/server/api/auth-users.ts`
  - `src/server/api/auth-users-id.ts`
  - `src/server/api/auth-groups.ts`
  - `src/server/api/auth-groups-id.ts`
  - `src/server/lib/require-action.ts`
- Replace client-side hooks that call `/api/proxy/auth/*` with calls to FP-owned endpoints (same paths, but local).

### B) Provide a TypeScript auth runtime inside the feature pack

Implement in FP (or generated into the app by FP dispatcher):

- JWT issuing + verification
- Password hashing
- Refresh token management
- One-time token generation + hashing (magic/reset/verification)
- Rate limiting storage
- Audit/event recording

### C) Provide a TypeScript authorization engine

- Represent principals:
  - user (email)
  - group (uuid)
  - role (string)
- Define precedence (match Python behavior):
  - user overrides > group overrides > role > default catalog
- Support:
  - page checks
  - action checks
  - metric checks
- Seed/track catalog keys (`hit_auth_permission_seed_keys`) to safely introduce new keys without re-enabling removed ones.

### D) Email integration interface (TS-only)

Auth Core must define a stable internal interface for email sending:

- Send verification
- Send password reset
- Send magic link
- Send invite

Implementation will be provided by the TS-only Email Core pack (or an app adapter).

### E) Bootstrap/seeding (replace CLI auto-provision)

Today `hit-cli` auto-provisions an admin user by calling Python auth (`hit_cli/commands/run.py::_auto_provision_auth_admin`).

In TS-only world, **do not** introduce a new privileged HTTP surface. Prefer deterministic, local behavior:

- **DB seed** step owned by app/FP: if env `HIT_AUTH_USERNAME/HIT_AUTH_PASSWORD` exist, create the admin user directly in DB at dev bootstrap time (idempotent).
- For production, rely on normal onboarding flows and/or a one-time migration/seed executed as part of app deployment (still DB-local, still TypeScript).

## Notes on compatibility (what to preserve)

Even though V2 is not backward compatible at the data/runtime level, preserving these *integration contracts* reduces churn:

- **User identity key**: org assignments use `userKey` as a string (currently email). Keep email as the canonical user key for now.
- **Cookie name**: keep `hit_token` so existing UI/middleware continues to function.
- **Response shapes** (SDK/UI contract):
  - Keep `TokenResponse` fields (`token`, `refresh_token`, `email_verified`, `two_factor_required?`, `expires_in?`).
  - Keep user fields expected by admin UI (`email_verified`, `two_factor_enabled`, `role`, `locked`, `profile_fields`, `last_login`).

## Immediate next steps (execution)

1) Port schema: implement FP migrations for all `hit_auth_*` tables (see mapping above).
2) Implement TypeScript server routes for the core auth API (SDK paths first), then admin + permissions surfaces.
3) Replace `requireAuthCoreAction` to evaluate permissions locally (no `/api/proxy/auth`).
4) Remove app-level `api/proxy/auth` route and delete Python auth module from manifests and runtime.

## Incremental cutover strategy (recommended)

To avoid a “flag day” migration, run a **dual-backend** phase where `/api/proxy/auth/*` can be served by:

- **Python (current)**: the existing Python auth service
- **TypeScript V2 (new)**: feature-pack-owned handlers running inside the app runtime

### Proposed toggle

Use `HIT_AUTH_BACKEND`:

- `python` (default): proxy to Python auth
- `ts` (or `v2`): route to TS V2 only; return 501 for unimplemented endpoints

This enables building endpoints **one-by-one** while Python remains the active backend, then flipping to TS when complete, and deleting Python immediately after.

### Non-backward-compatible cutover (DB)

V2 does not migrate data from Python auth. Choose one cutover approach:

- **Destructive cutover (simplest)**:
  - Add an FP migration that drops Python-era `hit_auth_*` tables (if present) and creates the V2 schema.
  - Outcome: users/sessions/invites/audit are reset; everyone re-onboards.
- **Side-by-side schema (recommended)**:
  - Create V2 tables under a new prefix: **`hit_auth_v2_*`** and point V2 runtime at them.
  - After full rollout and verification, add a later migration to drop the old Python-era `hit_auth_*` tables.

Either way, the endpoint surface can remain stable via the `HIT_AUTH_BACKEND` dual-backend switch.

## Implementation checklist (go one-by-one)

This is the execution checklist for making Auth Core FP fully self-contained. Check items off as they land.

### Phase 0 — Wiring / scaffolding (keep the system fundamentally the same)

- [x] Add `/api/proxy/auth/*` backend toggle: `HIT_AUTH_BACKEND=python|ts`
- [x] Add TypeScript V2 shim handler (feature-pack-owned) and route a few endpoints through it
  - [x] `GET /healthz`
  - [x] `GET /config`
  - [x] `GET /features`
- [x] V2 DB cutover mode: side-by-side prefix **`hit_auth_v2_*`**

### Phase 1 — Schema + migrations (TypeScript-owned)

- [ ] Create FP migrations for Auth V2 identity/security schema (tables + indexes)
  - [x] users (`hit_auth_v2_users`)
  - [x] refresh tokens/sessions (`hit_auth_v2_refresh_tokens`)
  - [ ] login attempts + rate limiting (`hit_auth_v2_login_attempts` or equivalent)
  - [ ] audit/events (`hit_auth_v2_events`)
  - [ ] email verification/reset/magic link tokens
  - [ ] 2FA (totp + backup codes)
  - [ ] OAuth accounts
  - [ ] devices
  - [ ] invites
  - [ ] impersonation sessions
  - [ ] profile field metadata + profile fields storage
  - [ ] groups + memberships
- [ ] Create FP migrations for Auth V2 authorization schema
  - [ ] page permissions (role/group/user)
  - [ ] action permissions registry + overrides
  - [ ] permission sets (“Security Groups”) + grants + seed keys

### Phase 2 — Core auth API (SDK/UI contract) — implement in TS V2

These must be supported because the TypeScript SDK calls them:

- [ ] `POST /register`
- [x] `POST /login`
- [x] `POST /refresh`
- [x] `POST /logout`
- [x] `POST /logout-all`
- [x] `POST /validate`
- [x] `GET /me`

Email-driven and security flows:

- [ ] `POST /verify-email`
- [ ] `POST /resend-verification`
- [ ] `GET /verification-status`
- [ ] `POST /forgot-password`
- [ ] `POST /reset-password`
- [ ] `POST /magic-link/request`
- [ ] `POST /magic-link/verify`

2FA + OAuth (keep endpoint compatibility with current SDK where applicable):

- [ ] `POST /enable-2fa` (legacy alias)
- [ ] `POST /verify-2fa` (legacy alias)
- [ ] `POST /2fa/setup`
- [ ] `POST /2fa/verify-setup`
- [ ] `POST /2fa/disable`
- [ ] `GET /2fa/backup-codes`
- [ ] `POST /oauth/url` (alias)
- [ ] `POST /oauth/callback`
- [ ] Provider-scoped URLs (if still needed by UI): `GET/POST /oauth/{provider}/url`

### Phase 3 — Admin + directory APIs (used by Auth Core FP UI)

- [ ] Directory:
  - [x] `GET /directory/users`
- [ ] Users:
  - [x] `GET /users`
  - [x] `GET /users/{email}`
  - [x] `POST /users`
  - [x] `PUT /users/{email}`
  - [x] `DELETE /users/{email}`
  - [ ] `POST /admin/users/{email}/resend-verification`
  - [ ] `PUT /admin/users/{email}/verify`
  - [ ] `POST /admin/users/{email}/reset-password`
- [ ] Sessions:
  - [ ] `GET /sessions`
  - [ ] `DELETE /sessions/{session_id}`
  - [ ] `GET /admin/sessions`
  - [ ] `GET /admin/users/{email}/sessions`
  - [ ] `DELETE /admin/users/{email}/sessions`
- [ ] Devices:
  - [ ] `GET /devices`
  - [ ] `POST /devices/{device_id}/trust`
  - [ ] `DELETE /devices/{device_id}`
- [ ] Invites:
  - [ ] `POST /invites`
  - [ ] `GET /invites`
  - [ ] `POST /invites/accept`
  - [ ] `POST /invites/reject`
  - [ ] `POST /invites/{invite_id}/resend`
  - [ ] `DELETE /invites/{invite_id}`
- [ ] Audit log:
  - [ ] `GET /audit-log`
- [ ] Impersonation:
  - [ ] `POST /impersonate/start`
  - [ ] `POST /impersonate/end`
- [ ] Groups + principals:
  - [ ] `GET /admin/groups`
  - [ ] `POST /admin/groups`
  - [ ] `GET /admin/groups/{group_id}`
  - [ ] `PUT /admin/groups/{group_id}`
  - [ ] `DELETE /admin/groups/{group_id}`
  - [ ] `GET /me/groups`
  - [ ] `GET /admin/groups/{group_id}/users`
  - [ ] `GET /admin/users/{user_email}/groups`

### Phase 4 — Authorization engine (replace `/api/proxy/auth/permissions/*`)

- [ ] Catalog ingestion reads from app-local compiled artifacts (no HTTP hop)
- [ ] Implement action checks:
  - [ ] `GET /permissions/actions/check/{action_key:path}`
- [ ] Implement page checks + batch checks (used by router/middleware/admin UI)
- [ ] Implement metric checks (if required by dashboard/metrics packs)
- [ ] Implement admin permission management surfaces (roles/users/groups/pages/actions)
- [ ] Implement permission sets (“Security Groups”) CRUD + assignment + grant APIs
- [ ] Replace `requireAuthCoreAction` to evaluate locally (no proxy call)

### Phase 5 — Final cutover + deletion

- [ ] Set `HIT_AUTH_BACKEND=ts` in the app(s) once coverage is complete
- [ ] Remove `/api/proxy/auth` route (or reduce to a thin internal router to V2 only)
- [ ] Remove Python auth module from manifests/runtime and delete dead code
- [ ] Remove any remaining Python-derived assumptions (service tokens, provisioner config lookup)
