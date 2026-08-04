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
