# Task 8 Report

## Status

Implemented Task 8 in the isolated worktree `coctels-ops-auth-admin`.

The implementation adds inventory, promotions, business configuration, aggregate order reports, audit coverage, internal notifications, six responsive admin screens, protected APIs, and focused tests. The changes preserve the existing Coctels OPS admin shell and Spanish UI.

## Delivered

- `src/types/operations.ts` defines inventory, promotion, configuration, audit, notification, and report contracts plus validated client-safe defaults.
- Inventory movements use Firestore transactions, reject invalid or insufficient stock, update product availability, and write actor/reason audit data.
- Promotion calculation is pure and deterministic. It validates active state, dates, minimum subtotal, product/category scope, usage limits, percentage bounds, and discount caps.
- Checkout now uses the same promotion calculator and atomically increments the promotion usage count while creating the order.
- Configuration stores WhatsApp, seven business-hour entries, delivery zones, estimated delivery time, and customer messages with schema validation and fallback defaults.
- Reports read bounded order data and return aggregates only: counts, revenue by status, top products, top customers, and cancellations.
- Audit coverage includes roles, users, orders, products, categories, inventory, promotions, and configuration mutations. Order status changes write audit and customer notification records transactionally.
- New orders create internal admin notifications. WhatsApp remains a prepared-link flow and is never sent automatically.
- New protected APIs require active-user verification and explicit permissions: `inventario.*`, `promociones.*`, `configuracion.*`, `reportes.read`, `auditoria.read`, and `notificaciones.read` for admin views.
- Admin navigation and route-level gates include inventory, promotions, reports, configuration, audit, and notifications.

## Tests

Commands run from the isolated worktree:

```text
npm test -- --run tests/lib/inventory.test.ts tests/lib/promotions.test.ts tests/lib/order-report.test.ts
PASS: 3 files, 8 tests

npm test
PASS: 26 files, 131 tests

npm run typecheck
PASS

npm run lint
PASS with existing warnings only

npm run build
PASS: Next.js production build completed

git diff --check
PASS: no whitespace errors
```

## Security Review

- Admin routes call `requirePermission`, which verifies the bearer token, active profile, and explicit permission server-side.
- Customer notification reads use `verifyRequest` and the authenticated UID; admin notification reads require `notificaciones.read`.
- Client-provided totals, actor IDs, status, role, and promotion usage are not trusted. The server recalculates order totals and actor identity.
- Inventory and promotion mutations validate input with Zod and use transactional Firestore writes where invariants can race.
- Reports do not return order documents or customer delivery details.
- No credentials or private environment values were added.

## Concerns

- `npm audit --omit=dev` reports 86 transitive vulnerabilities in the existing dependency graph, including advisories affecting Next.js, Firebase/Google Cloud, and Genkit. Several fixes require dependency upgrades or `--force`; dependency remediation was intentionally not mixed into Task 8.
- Lint reports pre-existing warnings in `src/app/layout.tsx`, `src/app/page.tsx`, `src/firebase/firestore/use-memo-firebase.tsx`, and `src/hooks/use-toast.ts`.
- Firestore production deployments still need the appropriate composite indexes and rules for the new bounded queries.
- No Firebase emulator or browser E2E run was available in this task; the pure invariants and complete Vitest suite were executed.

## Review Fixes

The follow-up review fixes are included in the next commit:

- `PATCH /api/notifications` now requires `notificaciones.read` through `requirePermission` and still passes the authenticated UID to the ownership check.
- `usageCount` was removed from the writable promotion input schema. Promotion updates read and preserve the stored counter inside their transaction.
- Order creation re-reads and parses the promotion inside the order transaction, revalidates code, active state, date range, scope, minimum subtotal, caps, and usage count, then increments usage and creates the order together.
- Reports use Firestore `createdAt` range filters without a 500-document limit, reject inverted date ranges with `422`, and expose anonymous `Cliente N` buckets instead of customer UIDs.
- Product, category, promotion, configuration, and order-create audit records are now written with their business mutation in the same Firestore transaction.
- Customer and admin order views load `/api/configuration`; WhatsApp links use the configured business number and configured order/status messages are displayed. A public read-only configuration endpoint exposes the validated customer-facing settings.
- Business-hour validation now rejects impossible times such as `29:90`; the promotion form exposes active state, scope, and usage limits.

### Review Verification

```text
npm test -- --run tests/lib/promotions.test.ts tests/lib/order-report.test.ts tests/lib/configuration.test.ts tests/api/notifications-review.test.ts tests/lib/products-repository.test.ts
PASS: 5 files, 18 tests

npm run typecheck
PASS
```

Final post-fix verification:

```text
npm test
PASS: 28 files, 135 tests

npm run lint
PASS with the same pre-existing warnings in storefront/infra files only

npm run typecheck
PASS

npm run build
PASS: Next.js production build completed
```
