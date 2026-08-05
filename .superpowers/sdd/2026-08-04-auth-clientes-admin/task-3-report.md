# Task 3 Report: User Synchronization, Authorization, and Firestore Rules

## Status

Implemented and committed in `21408b2` (`feat: proteger usuarios y permisos administrativos`).

## Delivered

- Added shared auth domain types for customers, staff, admins, addresses, roles, permissions, auth profiles, and verified users.
- Added server-only bearer-token verification with Firebase Admin, active-profile checks, and explicit 401/403 authorization errors.
- Added role resolution from active Firestore role documents. API permission checks do not trust request-body roles or permissions.
- Added customer profile synchronization at `POST /api/auth/sync` and the authenticated session endpoint at `GET /api/auth/session`.
- Added role APIs for listing, creating, reading, updating, and deleting roles.
- Added user APIs for listing profiles, reading a profile, activation/deactivation, and role assignment.
- Added an audit entry for every role and user mutation.
- Added `AdminGuard` and `PermissionGate` as client-only navigation helpers. They never replace API authorization and do not import Firebase Admin.
- Added restrictive Firestore rules:
  - Customers can read only their own profile and orders.
  - Customers can update only `displayName`, `photoURL`, `telefono`, and `addresses`, with type checks.
  - Direct order creation, order mutation, role writes, audit writes, and sensitive writes are blocked for normal clients.
  - Administrative Firestore access requires the strict boolean claim `request.auth.token.admin == true`.
- Added indexes for user roles, customer orders, order state, order timestamps, and legacy order timestamps.
- Added `scripts/set-admin.ts`, which sets the custom claim, creates or updates the application profile, and never prints credentials.

## Tests

- Focused authorization suite: `npm test -- --run tests/lib/permissions.test.ts tests/api/auth-sync.test.ts tests/api/admin-roles.test.ts`
  - Result: 3 files passed, 13 tests passed.
- Full available test suite: `npm test`
  - Result: 8 files passed, 50 tests passed.
- Typecheck: `npm run typecheck`
  - Result: passed.
- Lint: `npm run lint`
  - Result: passed with existing warnings for the custom font, unused storefront symbols, a Firebase hook dependency, and the deprecated `next lint` command.
- Production build: `npm run build`
  - Result: passed. The same existing lint warnings were emitted during the build.
- `git diff --cached --check`
  - Result: passed before the implementation commit.

## Security Review

- Firebase Admin remains isolated to server-only modules and route handlers. No client component imports it.
- Sync derives the UID, email, display name, and photo URL from the verified token; client-provided UID, role, and admin fields are ignored or rejected.
- An `accountType: "admin"` profile cannot bypass API authorization unless the verified token also contains `admin: true`.
- Inactive or missing profiles receive 401. Valid identities without a required permission receive 403.
- Firestore rules independently prevent client-side order creation and sensitive mutations.
- No credentials or private environment values were added to the repository.

## Known Concerns

- Firestore rules were reviewed statically but not executed against the Firebase Emulator Suite because no emulator test command or emulator configuration is available in this worktree.
- The public sync endpoint requires a valid Firebase token but does not yet have application-level rate limiting. Firebase Auth protections remain active; endpoint throttling should be added before high-volume production exposure.
- Existing lint warnings and the `next lint` deprecation are outside Task 3 and were not changed.
- Admin UI navigation is only a guard layer. Every future operational API must continue to call `verifyRequest` and `requirePermission` server-side.

## Review Fixes

Applied in the follow-up fix commit:

- Added `requireVerifiedEmail(request)`, a separate server authorization boundary that requires `token.email_verified === true`; `/api/auth/sync` continues using token-only verification for new profiles.
- Made `syncUser` reject existing inactive profiles before any write while preserving active `customer` creation for new profiles.
- Moved role creation/update/deletion and user mutations plus their audit documents into Firestore transactions. Route handlers pass the verified actor UID into the repository transaction.
- Added Firestore validation for every allowed `Address` field, optional `notes`, unknown-key rejection, and a bounded list of up to ten addresses.
- Removed UI `accountType` authorization bypasses. `AdminGuard` and `PermissionGate` require `useAuth().isAdmin`, which is populated only from the strict boolean claim, and `AdminGuard` now wraps `/admin/dashboard`.
- Added explicit `requireUserOwnership` denial coverage for requests targeting another UID.
- Added regression coverage for verified email, inactive/new sync behavior, transactional audit writes, strict client guard contracts, and dashboard wiring.

## Review-Fix Verification

- Focused fixes: `npm test -- --run tests/lib/permissions.test.ts tests/api/auth-sync.test.ts tests/lib/users.test.ts tests/lib/firestore-atomic.test.ts tests/components/admin-guards.test.ts tests/api/admin-roles.test.ts`
  - Result: 6 files passed, 22 tests passed.
- Full available suite: `npm test`
  - Result: 11 files passed, 59 tests passed.
- `npm run typecheck`
  - Result: passed.
- `npm run lint`
  - Result: passed with the existing warnings listed above.
- `npm run build`
  - Result: passed.
- Firestore Rules Emulator load: `firebase emulators:exec --only firestore --config firebase.task3.json --project demo-task3 --non-interactive "node --version"`
  - Result: Firestore emulator started and loaded `firestore.rules` successfully; the temporary config and log were removed afterward.

## Deployment Hold

The existing direct `addDoc(collection(db, 'orders'), ...)` in `src/app/checkout/page.tsx` was intentionally not changed. Deployment must remain blocked until Task 5 replaces direct order writes with the authenticated, verified-email, server-validated order API.

## Staff Permission Regression Fix

The previous strict-claim guard change was narrowed incorrectly: it rejected staff before checking the server-resolved role permissions. The guards now use the client-safe `canAccessAdmin` helper with permissions returned by `GET /api/auth/session`:

- Staff users can enter a guard with an explicitly assigned permission such as `pedidos.read`.
- Customers with no assigned administrative permissions remain blocked.
- `isAdmin` still grants only the strict claim-admin elevated path; no `accountType` value is trusted by the UI.
- The API and Firestore authorization paths remain unchanged and continue to enforce server-side checks.
- No checkout or order-write files were modified.

## Staff Regression Verification

- Focused guard suite: `npm test -- --run tests/components/admin-permissions.test.ts tests/components/admin-guards.test.ts`
  - Result: 2 files passed, 5 tests passed.
- Full available suite: `npm test`
  - Result: 12 files passed, 62 tests passed.
- `npm run typecheck`
  - Result: passed.
- `npm run lint`
  - Result: passed with the existing warnings listed above.
- `npm run build`
  - Result: passed.
