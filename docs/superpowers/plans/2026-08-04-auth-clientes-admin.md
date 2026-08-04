# Coctels OPS Auth, Clientes y Administracion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Coctels OPS into an authenticated customer and configurable admin platform while preserving its storefront and WhatsApp confirmation flow.

**Architecture:** Keep one Next.js App Router application. Use Firebase Auth in the browser, Firebase Admin in server routes, Firestore repositories for domain operations, and Zod schemas at every API boundary. The client will not write orders or administrative data directly; protected API routes will authorize each operation.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Firebase Auth/Firestore, `firebase-admin`, Zod, Tailwind CSS, Vitest, Testing Library, Firebase Emulator Suite where available.

## Global Constraints

- Firebase Auth must support Google, email/password, email verification, password recovery, and logout.
- Purchases require an authenticated user with a verified email; guest checkout is not supported.
- Roles are configurable by module and action.
- The UI and copy remain in Spanish and the storefront keeps the Coctels OPS neon mobile-first identity.
- Order confirmation remains a prepared WhatsApp message; no payment gateway or official WhatsApp API is included.
- Firebase Admin is server-only and credentials remain in environment variables.
- Prices, promotions, stock, permissions, and ownership are validated on the server.
- Existing `orders` data must remain available during migration to `pedidos`.
- Do not copy Mundo Celular visual tokens or visual components; use only its structural boundaries as reference.

---

## Delivery Tracks

The implementation is intentionally divided into five independently verifiable tracks:

1. Foundation and identity.
2. Server authorization and domain data.
3. Authenticated checkout and customer account.
4. Admin shell and operational modules.
5. Advanced modules, migration, and release verification.

Do not start a later track until the preceding track's checks pass.

### Task 1: Establish Testing and Firebase Server Foundation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `next.config.ts`
- Modify: `.gitignore`
- Create: `.env.example`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `src/lib/firebase-admin.ts`
- Create: `src/lib/server-env.ts`
- Test: `tests/lib/server-env.test.ts`

**Interfaces:**
- Produces `getAdminApp(): App`, `getAdminAuth(): Auth`, and `getAdminDb(): Firestore` for server modules.
- Produces `requireEnv(name: string): string` for server-only configuration.

- [ ] **Step 1: Add the test and server dependencies.**

Add `firebase-admin` to dependencies. Add `vitest`, `jsdom`, `@testing-library/react`, and `@testing-library/jest-dom` to dev dependencies. Add scripts:

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 2: Create the test configuration and environment test.**

Configure Vitest with the TypeScript path alias and write:

```ts
import { describe, expect, it } from "vitest";
import { requireEnv } from "@/lib/server-env";

describe("requireEnv", () => {
  it("returns a configured value", () => {
    process.env.TEST_VALUE = "configured";
    expect(requireEnv("TEST_VALUE")).toBe("configured");
  });

  it("throws when a value is missing", () => {
    delete process.env.TEST_VALUE;
    expect(() => requireEnv("TEST_VALUE")).toThrow("Falta la variable TEST_VALUE");
  });
});
```

- [ ] **Step 3: Implement server environment validation.**

`src/lib/server-env.ts` must export `requireEnv` and must never expose private values to client modules. `.env.example` must list `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, and the public `NEXT_PUBLIC_FIREBASE_*` values without real credentials.

- [ ] **Step 4: Implement Firebase Admin initialization.**

Use `cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") })`, reuse an existing app when available, and export typed accessors. Import this module only from server code or route handlers.

- [ ] **Step 5: Remove build bypasses after the baseline is green.**

Keep the existing storefront behavior while fixing any baseline TypeScript errors exposed by the new test setup. Remove `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` from `next.config.ts` only after `npm run typecheck` and `npm run lint` pass.

- [ ] **Step 6: Verify the foundation.**

Run: `npm test -- --run tests/lib/server-env.test.ts`

Expected: both environment tests pass.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 7: Commit the foundation.**

```powershell
git add package.json package-lock.json next.config.ts .gitignore .env.example vitest.config.ts tests/setup.ts src/lib/firebase-admin.ts src/lib/server-env.ts tests/lib/server-env.test.ts
git commit -m "feat: preparar base de auth y pruebas"
```

### Task 2: Implement Client Authentication and User Profiles

**Files:**
- Modify: `src/firebase/index.ts`
- Modify: `src/firebase/provider.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/lib/auth-client.ts`
- Create: `src/lib/auth-claims.ts`
- Create: `src/components/auth/AuthProvider.tsx`
- Create: `src/components/auth/AuthStatus.tsx`
- Create: `src/components/auth/LoginForm.tsx`
- Create: `src/components/auth/RegisterForm.tsx`
- Create: `src/components/auth/PasswordRecoveryForm.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/app/registro/page.tsx`
- Create: `src/app/recuperar-acceso/page.tsx`
- Create: `src/app/verificar-email/page.tsx`
- Create: `src/hooks/use-auth.ts`
- Test: `tests/lib/auth-client.test.ts`
- Test: `tests/lib/auth-claims.test.ts`

**Interfaces:**
- `useAuth(): { user: User | null; loading: boolean; isVerified: boolean; isAdmin: boolean; refreshClaims(): Promise<void> }`.
- `loginWithGoogle(): Promise<UserCredential>`.
- `loginWithEmail(email: string, password: string): Promise<UserCredential>`.
- `registerWithEmail(email: string, password: string, displayName: string): Promise<UserCredential>`.
- `sendPasswordReset(email: string): Promise<void>`.
- `sendVerificationEmail(user: User): Promise<void>`.
- `logout(): Promise<void>`.

- [ ] **Step 1: Write auth error translation tests.**

Cover invalid credentials, email already in use, weak password, network failure, too many attempts, popup blocked, and unknown errors. Every case must return Spanish user-facing text without exposing Firebase internals.

- [ ] **Step 2: Implement auth client functions.**

Use `signInWithPopup` with `GoogleAuthProvider`, `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `sendEmailVerification`, `sendPasswordResetEmail`, and `signOut`. Reject password registration unless it meets the chosen minimum of 8 characters.

- [ ] **Step 3: Write claim helper tests.**

Test `esClaimAdmin(claims)` for true, false, missing, and non-boolean values. Keep this helper pure.

- [ ] **Step 4: Implement `AuthProvider`.**

Subscribe to `onIdTokenChanged`, expose loading state until the first token resolution completes, refresh claims explicitly after login, and clear local user state on logout. Do not call Firebase Admin from the browser.

- [ ] **Step 5: Mount the provider.**

Update `src/app/layout.tsx` so `AuthProvider` wraps the existing cart, header, main content, footer, and toaster without changing storefront styling.

- [ ] **Step 6: Build the authentication pages.**

The login page must offer Google and email/password, link to registration and recovery, display translated errors, and redirect to the saved destination. Registration must send verification email and route to `/verificar-email`. Recovery must show a confirmation state without revealing whether an email exists.

- [ ] **Step 7: Add auth UI to the existing header.**

`AuthStatus` must show login/register actions for visitors and account/logout actions for authenticated users. It must remain usable on mobile and not expose admin navigation until authorization is known.

- [ ] **Step 8: Verify identity flows.**

Run: `npm test -- --run tests/lib/auth-client.test.ts tests/lib/auth-claims.test.ts`

Expected: all pure auth tests pass.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 9: Commit the identity track.**

```powershell
git add src/firebase/index.ts src/firebase/provider.tsx src/app/layout.tsx src/lib/auth-client.ts src/lib/auth-claims.ts src/components/auth src/app/login src/app/registro src/app/recuperar-acceso src/app/verificar-email src/hooks/use-auth.ts tests/lib/auth-client.test.ts tests/lib/auth-claims.test.ts
git commit -m "feat: agregar autenticacion de clientes"
```

### Task 3: Add User Synchronization, Authorization, and Firestore Rules

**Files:**
- Create: `src/lib/auth/verify-request.ts`
- Create: `src/lib/auth/permissions.ts`
- Create: `src/lib/firestore/users.ts`
- Create: `src/lib/firestore/roles.ts`
- Create: `src/app/api/auth/sync/route.ts`
- Create: `src/app/api/auth/session/route.ts`
- Create: `src/app/api/admin/roles/route.ts`
- Create: `src/app/api/admin/roles/[id]/route.ts`
- Create: `src/app/api/admin/users/route.ts`
- Create: `src/app/api/admin/users/[uid]/route.ts`
- Create: `src/components/admin/AdminGuard.tsx`
- Create: `src/components/admin/PermissionGate.tsx`
- Create: `firestore.rules`
- Create: `firestore.indexes.json`
- Create: `scripts/set-admin.ts`
- Create: `tests/lib/permissions.test.ts`
- Create: `tests/api/auth-sync.test.ts`
- Create: `tests/api/admin-roles.test.ts`

**Interfaces:**
- `verifyRequest(request: NextRequest): Promise<VerifiedUser>`.
- `requirePermission(request: NextRequest, permission: Permission): Promise<VerifiedUser>`.
- `hasPermission(user: UserProfile, permission: Permission): boolean`.
- `syncUser(uid: string, data: AuthProfile): Promise<UserProfile>`.
- `listRoles(): Promise<Role[]>`.
- `updateRole(id: string, input: RoleInput): Promise<void>`.

- [ ] **Step 1: Define shared domain types.**

Create `src/types/auth.ts` with `UserProfile`, `Role`, `Permission`, `AccountType`, `Address`, and `VerifiedUser`. Use explicit unions for `customer`, `staff`, and `admin`.

- [ ] **Step 2: Write authorization tests before implementation.**

Cover missing bearer token, invalid token, inactive user, missing permission, direct user ownership, and admin access. Assert that unauthorized requests return 401 and forbidden requests return 403.

- [ ] **Step 3: Implement request verification.**

Extract `Authorization: Bearer <token>`, call Firebase Admin `verifyIdToken`, load `users/{uid}`, reject inactive or missing profiles, and return a typed verified user. Do not trust role or permission values sent in request bodies.

- [ ] **Step 4: Implement role and permission evaluation.**

Load assigned role documents from Firestore, ignore inactive roles, and require every requested permission explicitly. Keep admin bootstrap separate from normal role editing.

- [ ] **Step 5: Implement user sync and admin APIs.**

`POST /api/auth/sync` creates or updates the signed-in profile with default `customer` role. Admin routes list users, activate/deactivate users, assign roles, create roles, update permissions, and write an audit entry for each mutation.

- [ ] **Step 6: Implement client and admin guards.**

`AdminGuard` redirects unauthenticated users to `/admin/login`, renders an access-denied state for authenticated users without permissions, and never replaces server authorization. `PermissionGate` hides controls only after loading completes.

- [ ] **Step 7: Write restrictive Firestore rules.**

Allow customers to read/update only their own profile fields allowed by the schema and read only their own orders. Allow admin writes only when `request.auth.token.admin == true`; keep order creation and sensitive mutations server-only. Add indexes for user role, order customer, order state, and timestamps.

- [ ] **Step 8: Add first-admin bootstrap.**

Create `scripts/set-admin.ts` accepting a UID argument, set the Firebase custom claim, create/update the corresponding profile, and print a success message without printing private credentials.

- [ ] **Step 9: Verify authorization.**

Run: `npm test -- --run tests/lib/permissions.test.ts tests/api/auth-sync.test.ts tests/api/admin-roles.test.ts`

Expected: unauthorized and forbidden cases are covered and pass.

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 10: Commit authorization.**

```powershell
git add src/types/auth.ts src/lib/auth src/lib/firestore/users.ts src/lib/firestore/roles.ts src/app/api/auth src/app/api/admin/roles src/app/api/admin/users src/components/admin firestore.rules firestore.indexes.json scripts/set-admin.ts tests/lib/permissions.test.ts tests/api/auth-sync.test.ts tests/api/admin-roles.test.ts
git commit -m "feat: proteger usuarios y permisos administrativos"
```

### Task 4: Move the Catalog into Firestore

**Files:**
- Modify: `src/app/lib/products.ts`
- Create: `src/types/catalog.ts`
- Create: `src/lib/firestore/products.ts`
- Create: `src/lib/firestore/categories.ts`
- Create: `src/lib/validation/catalog.ts`
- Create: `scripts/seed-catalog.ts`
- Modify: `src/app/menu/page.tsx`
- Modify: `src/components/products/ProductCard.tsx`
- Modify: `src/components/products/ProductCustomizer.tsx`
- Test: `tests/lib/catalog-validation.test.ts`
- Test: `tests/lib/products-repository.test.ts`

**Interfaces:**
- `listActiveProducts(): Promise<Product[]>`.
- `getProductById(id: string): Promise<Product | null>`.
- `createProduct(input: ProductInput): Promise<string>`.
- `updateProduct(id: string, input: ProductInput): Promise<void>`.
- `listCategories(): Promise<Category[]>`.

- [ ] **Step 1: Define catalog types and Zod schemas.**

Represent current cocktail customizations explicitly: category, base price, available flavors, add-ons with prices, image, stock, active, and featured fields.

- [ ] **Step 2: Write validation tests.**

Cover valid product input, zero/negative price, missing name, invalid category, negative stock, duplicate add-on names, and malformed image URL.

- [ ] **Step 3: Implement repositories.**

Use Firestore converters or explicit mapping to return typed products. Public reads must filter `active == true`; admin reads may include inactive records.

- [ ] **Step 4: Seed current static products.**

Map all entries from `PRODUCTS` into Firestore with stable IDs and preserve current image URLs/customizations. Make the script idempotent by writing the same document IDs.

- [ ] **Step 5: Update the menu and cart product source.**

Replace static `PRODUCTS` reads in the menu with the repository or a server-loaded query. Keep cart item snapshots for display, but treat IDs as authoritative during checkout.

- [ ] **Step 6: Verify catalog behavior.**

Run: `npm test -- --run tests/lib/catalog-validation.test.ts tests/lib/products-repository.test.ts`

Expected: validation and repository mapping tests pass.

### Task 5: Implement Secure Orders and Authenticated Checkout

**Files:**
- Create: `src/types/orders.ts`
- Create: `src/lib/validation/orders.ts`
- Create: `src/lib/firestore/orders.ts`
- Create: `src/app/api/pedidos/route.ts`
- Create: `src/app/api/pedidos/[id]/route.ts`
- Create: `src/lib/orders/whatsapp-message.ts`
- Modify: `src/app/checkout/page.tsx`
- Modify: `src/app/order-status/[id]/page.tsx`
- Modify: `src/context/cart-context.tsx`
- Test: `tests/lib/order-validation.test.ts`
- Test: `tests/lib/whatsapp-message.test.ts`
- Test: `tests/api/orders.test.ts`

**Interfaces:**
- `createOrder(user: VerifiedUser, input: CreateOrderInput): Promise<Order>`.
- `getCustomerOrder(user: VerifiedUser, id: string): Promise<Order>`.
- `updateOrderStatus(user: VerifiedUser, id: string, input: StatusUpdate): Promise<Order>`.
- `buildWhatsAppMessage(order: Order, phone: string): string`.

- [ ] **Step 1: Define order types and state transitions.**

Use states `pendiente`, `confirmado`, `preparando`, `en_camino`, `entregado`, and `cancelado`. Define allowed transitions in a pure map and reject invalid transitions.

- [ ] **Step 2: Write order validation tests.**

Cover empty cart, unknown product, inactive product, changed price, invalid quantity, missing name/phone/address, invalid promotion, unauthorized customer read, and invalid state transition.

- [ ] **Step 3: Implement server-side order creation.**

The route must verify the user and email verification, load every product by ID, recalculate customizations and totals, validate delivery details, create an immutable item snapshot, and write `clienteUid` plus audit metadata. Do not accept client-provided totals or status.

- [ ] **Step 4: Implement customer order reads and admin status updates.**

Customer reads require matching `clienteUid`. Admin updates require `pedidos.update`, validate the state transition, store actor and timestamp, and create a notification record.

- [ ] **Step 5: Replace direct checkout writes.**

Remove `addDoc(collection(db, "orders"), ...)` from `src/app/checkout/page.tsx`. Submit the cart to `POST /api/pedidos`, handle 401/403/422/500 separately, clear the cart only after success, and navigate to the new order status page.

- [ ] **Step 6: Add WhatsApp message generation.**

Generate an encoded URL from the configured business phone and the server-created order. Do not send messages automatically.

- [ ] **Step 7: Verify order security.**

Run: `npm test -- --run tests/lib/order-validation.test.ts tests/lib/whatsapp-message.test.ts tests/api/orders.test.ts`

Expected: no test can create an order with a forged price, forged customer UID, or invalid state.

### Task 6: Build Customer Account and Order History

**Files:**
- Create: `src/app/cuenta/layout.tsx`
- Create: `src/app/cuenta/page.tsx`
- Create: `src/app/cuenta/perfil/page.tsx`
- Create: `src/app/cuenta/pedidos/page.tsx`
- Create: `src/app/cuenta/pedidos/[id]/page.tsx`
- Create: `src/app/api/account/profile/route.ts`
- Create: `src/components/account/AccountNav.tsx`
- Create: `src/components/account/ProfileForm.tsx`
- Create: `src/components/account/OrderHistory.tsx`
- Create: `src/components/account/OrderStatusTimeline.tsx`
- Test: `tests/api/account-profile.test.ts`

**Interfaces:**
- `GET /api/account/profile` returns the current profile.
- `PATCH /api/account/profile` accepts only editable profile and address fields.
- `GET /api/pedidos?mine=true` returns only the current user's orders.

- [ ] **Step 1: Write profile ownership tests.**

Assert that a customer can update phone and addresses, cannot update role/email/active fields, and cannot request another UID.

- [ ] **Step 2: Implement the account profile API.**

Validate with Zod, update allowed fields only, and write an audit record for profile changes without storing passwords.

- [ ] **Step 3: Build account layout and profile form.**

Add loading, validation, success, and error states. Preserve the storefront typography and mobile spacing.

- [ ] **Step 4: Build order history and detail.**

Display immutable item snapshots, total, delivery data, status timeline, timestamps, and the WhatsApp confirmation action. Hide admin-only audit metadata from customers.

- [ ] **Step 5: Verify the account track.**

Run: `npm test -- --run tests/api/account-profile.test.ts`

Expected: ownership and field filtering tests pass.

### Task 7: Build the Admin Shell and Core Operations

**Files:**
- Modify: `src/app/admin/dashboard/page.tsx`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/components/admin/AppSidebar.tsx`
- Create: `src/components/admin/Breadcrumbs.tsx`
- Create: `src/components/admin/StatsCards.tsx`
- Create: `src/app/admin/pedidos/page.tsx`
- Create: `src/app/admin/pedidos/[id]/page.tsx`
- Create: `src/app/admin/productos/page.tsx`
- Create: `src/app/admin/productos/nueva/page.tsx`
- Create: `src/app/admin/productos/[id]/page.tsx`
- Create: `src/app/admin/categorias/page.tsx`
- Create: `src/app/admin/categorias/nueva/page.tsx`
- Create: `src/app/admin/categorias/[id]/page.tsx`
- Create: `src/app/admin/clientes/page.tsx`
- Create: `src/app/admin/usuarios/page.tsx`
- Create: `src/app/admin/roles/page.tsx`
- Modify: `src/components/layout/Header.tsx`
- Test: `tests/components/admin-navigation.test.tsx`

**Interfaces:**
- `AppSidebar` receives no data and derives visible navigation from `useAuth` permissions.
- Each mutation form calls its protected API route and invalidates its query/list state after success.
- `AdminDashboard` consumes typed stats and recent orders instead of `any` documents.

- [ ] **Step 1: Write navigation permission tests.**

Assert that a role with only `pedidos.read` does not see catalog, users, roles, or configuration links, while an admin sees all assigned modules.

- [ ] **Step 2: Build the admin layout.**

Mount `AdminGuard`, responsive sidebar, breadcrumb header, main content region, logout action, and return-to-store action. Do not reuse Mundo Celular visual tokens.

- [ ] **Step 3: Build typed dashboard stats.**

Create a protected stats endpoint that counts orders by state, active products, customers, and current revenue. Add loading skeletons and empty states.

- [ ] **Step 4: Build order operations.**

List/filter orders, open details, transition valid states, show customer and delivery data, and expose the prepared WhatsApp action. All status buttons require `pedidos.update`.

- [ ] **Step 5: Build product and category CRUD.**

Create list, create, edit, activate/deactivate, and delete-with-confirmation flows. Use shared Zod schemas on client and server. Product writes require `productos.write`; category writes require `categorias.write`.

- [ ] **Step 6: Build customer, user, and role management.**

Customers are read-only operational profiles except for explicit admin actions. User management can activate/deactivate and assign roles. Role editing must prevent removing the last administrator without a replacement.

- [ ] **Step 7: Verify admin behavior.**

Run: `npm test -- --run tests/components/admin-navigation.test.tsx`

Expected: visible navigation and protected actions match permissions.

### Task 8: Add Inventory, Promotions, Configuration, Reports, Audit, and Notifications

**Files:**
- Create: `src/types/operations.ts`
- Create: `src/lib/firestore/inventory.ts`
- Create: `src/lib/firestore/promotions.ts`
- Create: `src/lib/firestore/configuration.ts`
- Create: `src/lib/firestore/audit.ts`
- Create: `src/lib/firestore/notifications.ts`
- Create: `src/lib/reports/order-report.ts`
- Create: `src/app/admin/inventario/page.tsx`
- Create: `src/app/admin/promociones/page.tsx`
- Create: `src/app/admin/configuracion/page.tsx`
- Create: `src/app/admin/reportes/page.tsx`
- Create: `src/app/admin/auditoria/page.tsx`
- Create: `src/app/admin/notificaciones/page.tsx`
- Create: `src/app/api/admin/inventory/route.ts`
- Create: `src/app/api/admin/promotions/route.ts`
- Create: `src/app/api/admin/configuration/route.ts`
- Create: `src/app/api/admin/reports/orders/route.ts`
- Create: `src/app/api/notifications/route.ts`
- Test: `tests/lib/inventory.test.ts`
- Test: `tests/lib/promotions.test.ts`
- Test: `tests/lib/order-report.test.ts`

**Interfaces:**
- `recordInventoryMovement(input: InventoryMovementInput): Promise<void>`.
- `calculatePromotion(input: PromotionContext): PromotionResult`.
- `getStoreConfiguration(): Promise<StoreConfiguration>`.
- `generateOrderReport(filter: OrderReportFilter): Promise<OrderReport>`.
- `createAuditEntry(input: AuditInput): Promise<void>`.
- `listNotifications(uid: string): Promise<Notification[]>`.

- [ ] **Step 1: Write pure inventory and promotion tests.**

Cover stock additions, deductions, negative-result rejection, expired promotion, inactive promotion, minimum subtotal, product scope, usage limit, and deterministic total calculation.

- [ ] **Step 2: Implement inventory movements.**

Use Firestore transactions for stock changes, reject insufficient stock, write a movement with actor/reason, and update product availability atomically.

- [ ] **Step 3: Implement promotions.**

Validate date ranges, active state, product/category scope, limits, and discount caps. Reuse the same pure calculator in checkout and admin previews.

- [ ] **Step 4: Implement business configuration.**

Store WhatsApp number, hours, delivery zones, estimated time, and customer-facing messages in one configuration document with validated fallback defaults.

- [ ] **Step 5: Implement reports.**

Generate date-filtered order counts, revenue by state, top products, customers, and cancellation totals. Return aggregated data only; require `reportes.read`.

- [ ] **Step 6: Implement audit and notifications.**

Write audit entries for role, user, order, product, inventory, promotion, and configuration mutations. Create customer notifications on order state changes and admin notifications for new orders.

- [ ] **Step 7: Build the six admin screens.**

Use shared tables/forms, permission gates, pagination or bounded queries, empty states, and explicit confirmation dialogs. Keep all labels in Spanish.

- [ ] **Step 8: Verify advanced modules.**

Run: `npm test -- --run tests/lib/inventory.test.ts tests/lib/promotions.test.ts tests/lib/order-report.test.ts`

Expected: calculations and invariant tests pass.

### Task 9: Migrate Orders and Remove Unsafe Direct Firestore Writes

**Files:**
- Create: `scripts/migrate-orders.ts`
- Create: `scripts/verify-migration.ts`
- Create: `firestore.rules`
- Modify: `src/app/admin/dashboard/page.tsx`
- Modify: `src/app/order-status/[id]/page.tsx`
- Modify: `src/app/checkout/page.tsx`
- Test: `tests/scripts/migrate-orders.test.ts`

**Interfaces:**
- `mapLegacyOrder(id: string, data: LegacyOrder): Order`.
- `migrateLegacyOrders(options: MigrationOptions): Promise<MigrationSummary>`.
- `verifyMigration(): Promise<MigrationVerification>`.

- [ ] **Step 1: Write legacy mapping tests.**

Map `customerName`, `phone`, `address`, `notes`, `items`, `total`, `status`, and `createdAt`. Assert current status names map to the new lowercase state union and missing `clienteUid` is marked historical.

- [ ] **Step 2: Implement idempotent migration.**

Read `orders`, write `pedidos/{sameId}` with a `legacy: true` marker, skip documents already migrated, and output counts for migrated, skipped, and failed records. Never delete `orders` automatically.

- [ ] **Step 3: Implement verification script.**

Compare source and target counts, IDs, totals, item counts, and status mappings. Exit non-zero if any mismatch exists.

- [ ] **Step 4: Update all reads to `pedidos`.**

Remove `orders` queries from dashboard and order status pages. Use repository/API reads with ownership and permission checks.

- [ ] **Step 5: Lock down rules.**

Remove public client-side order creation and unrestricted updates. Only server-side Admin SDK routes can create orders; customers can read their own records and admins can update allowed state fields.

- [ ] **Step 6: Verify migration and security.**

Run: `npm test -- --run tests/scripts/migrate-orders.test.ts`

Expected: mapping is idempotent and preserves totals and item snapshots.

Run: `npm run typecheck`

Expected: no direct `orders` client writes remain.

### Task 10: End-to-End Release Verification and Documentation

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Create: `docs/superpowers/reports/2026-08-04-auth-clientes-admin.md`
- Create: `tests/e2e/auth-checkout-admin.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Document local Firebase setup.**

Document required public/private environment variables, Firebase Auth providers, Firestore indexes/rules deployment, first-admin bootstrap, catalog seed, and order migration commands. Never include real credentials.

- [ ] **Step 2: Add end-to-end scenarios.**

Cover registration, verification gate, login, account profile, authenticated checkout, customer order history, admin login, permission-limited navigation, order status update, and logout. Mock WhatsApp navigation at the browser boundary.

- [ ] **Step 3: Run the full verification suite.**

Run:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all commands exit with code 0. If Firebase Emulator Suite is configured, also run the Firestore rules suite against the emulator.

- [ ] **Step 4: Perform manual responsive verification.**

Check 375px mobile and desktop widths for login, checkout, account history, admin sidebar, order detail, product form, and tables. Confirm no horizontal overflow, inaccessible controls, or missing loading/error states.

- [ ] **Step 5: Write the release report.**

Record commands, results, migration summary, known environment requirements, and any deliberately deferred payment/WhatsApp API work.

- [ ] **Step 6: Commit and push the implementation.**

```powershell
git status
git diff --check
git add src tests scripts firestore.rules firestore.indexes.json package.json package-lock.json README.md AGENTS.md docs
git commit -m "feat: completar auth clientes y panel administrativo"
git push origin main
```

## Plan Self-Review

- Spec coverage: authentication, customer accounts, role permissions, protected APIs, catalog, orders, inventory, promotions, configuration, reports, audit, notifications, migration, responsive UI, and verification each have a task.
- Placeholder scan: every implementation step contains a concrete file, interface, command, or expected result.
- Type consistency: shared interfaces are introduced before consumers; order states and permission names are reused consistently across API, UI, rules, and tests.
- Safety: the plan never deletes legacy `orders` automatically and never stages unrelated worktree changes.
