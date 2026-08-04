# Task 5 Report: Secure Orders and Authenticated Checkout

## Status

Implemented in the isolated worktree `coctels-ops-auth-admin`.

Purchases now require a verified Firebase user and are created only through `POST /api/pedidos`. The server owns customer identity, catalog reads, customization validation, stock checks, prices, totals, status, immutable item snapshots, audit metadata, and notification creation for status changes.

## Implemented

- Added typed order model and explicit states: `pendiente`, `confirmado`, `preparando`, `en_camino`, `entregado`, `cancelado`.
- Added validated transition map and rejection of invalid or unknown states.
- Added Zod validation for delivery data, cart items, quantities, customizations, promotions, and status updates.
- Recalculated base prices, size multipliers, add-ons, subtotals, totals, and aggregate stock from active Firestore products.
- Ignored client names, prices, totals, status, and `clienteUid` by parsing only the trusted order input contract.
- Added Firebase Admin repository functions for create, owner-only read, and permission-checked transactional status updates.
- Added `GET /api/pedidos/[id]` with verified-email and ownership enforcement.
- Added `PATCH /api/pedidos/[id]` with `pedidos.update`, transition validation, actor/timestamp audit data, and a `notificaciones` record.
- Replaced checkout browser `addDoc(collection(db, "orders"))` with authenticated `POST /api/pedidos`.
- Replaced admin browser order updates with authenticated API PATCH requests.
- Updated order status page to API-backed authenticated reads and prepared WhatsApp links only.
- Added configured `NEXT_PUBLIC_WHATSAPP_PHONE` example value; no WhatsApp API or payment gateway was added.

## Tests

TDD red phase confirmed missing production modules before implementation. Focused tests then passed:

```text
14 tests passed: order validation, forged pricing, inactive/unknown products,
customizations, stock, ownership, transitions, malformed JSON, API auth,
WhatsApp encoding.
```

Final full suite:

```text
npm test                         18 files, 100 tests passed
npm run typecheck                passed
npm run lint                     passed with existing warnings only
npm run build                    passed
```

The source scan found no browser `addDoc`, `updateDoc`, `setDoc`, or `deleteDoc` calls for orders. Remaining `pedidos` client usage is the existing admin read-only listener; all order creation and updates use protected server routes and Firebase Admin.

## Security Review

- Authentication: `requireVerifiedEmail` protects purchase and customer read routes.
- Authorization: owner matching protects customer reads; `requirePermission(..., "pedidos.update")` plus repository defense-in-depth protects status writes.
- Input validation: malformed JSON and invalid schemas return 422; auth failures remain 401/403; unexpected failures remain generic 500 responses.
- Trust boundary: server never uses client totals, status, customer UID, product names, or client prices.
- Firestore direct writes: rules already deny direct `pedidos` and `orders` create/update/delete; this task removes the browser mutations.
- Secrets: no real credentials were added.

## Concerns

- `npm audit --audit-level=high` reports 94 existing transitive vulnerabilities, including high/critical issues through the current Next.js, Genkit, Firebase, and tooling dependency graph. Fixing them requires dependency upgrades outside Task 5 and may include a Next.js major-range change.
- Lint reports existing warnings in unrelated files (`layout.tsx`, `page.tsx`, `Footer.tsx`, `use-memo-firebase.tsx`, and `use-toast.ts`).
- Promotion codes are rejected until the promotions domain is implemented; no unvalidated discount is accepted.
- No rate limiting was introduced for the new endpoints; Firebase Auth and token validation remain the current abuse controls.
