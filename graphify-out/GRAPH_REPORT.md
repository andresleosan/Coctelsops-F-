# Graph Report - F:\Proyectos\Coctelsops-F--main\Dev  (2026-08-09)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1236 nodes · 2911 edges · 95 communities (53 shown, 42 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a458d53e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- e2e-local-state.ts
- firestore/products.ts
- index.ts
- operations.ts
- devDependencies
- use-toast.ts
- cn
- verify-request.ts
- users.ts
- requirePermission
- auth-client.ts
- sidebar.tsx
- getAdminDb
- bash
- button.tsx
- auth.ts
- compilerOptions
- migrate-orders.ts
- card.tsx
- cuenta/pedidos/[id]/page.tsx
- categories.ts
- checkout/page.tsx
- useAuth
- components.json
- pedidos/[id]/route.ts
- types/orders.ts
- menubar.tsx
- chart.tsx
- validation/orders.ts
- ProductCustomizer.tsx
- firestore/orders.ts
- sheet.tsx
- alert-dialog.tsx
- carousel.tsx
- run-firestore-rules-tests.ts
- dashboard/page.tsx
- notifications/route.ts
- status-timeline.ts
- form.tsx
- dependencies
- dropdown-menu.tsx
- lib/firebase-admin.ts
- table.tsx
- OrderHistory.tsx
- orders-audit.test.ts
- cuenta/layout.tsx
- alert.tsx
- firestore-rules-emulator.test.ts
- admin-guards.test.ts
- class-variance-authority
- clsx
- date-fns
- dotenv
- embla-carousel-react
- eslint.config.mjs
- firebase
- firebase-admin
- genkit
- @genkit-ai/google-genai
- @hookform/resolvers
- lucide-react
- next
- next-env.d.ts
- patch-package
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-avatar
- @radix-ui/react-checkbox
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-radio-group
- @radix-ui/react-select
- @radix-ui/react-separator
- @radix-ui/react-slider
- @radix-ui/react-slot
- @radix-ui/react-switch
- @radix-ui/react-tooltip
- react-day-picker
- react-dom
- react-hook-form
- recharts
- server-only
- tailwind-merge
- zod
- postcss.config.mjs
- firestore-rules.test.ts
- vitest.config.mts

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 62 edges
2. `getAdminDb()` - 60 edges
3. `requirePermission()` - 56 edges
4. `cn()` - 45 edges
5. `toAuthorizationResponse()` - 44 edges
6. `Button` - 40 edges
7. `Card` - 33 edges
8. `CardContent` - 33 edges
9. `writeAuditInTransaction()` - 29 edges
10. `CardHeader` - 23 edges

## Surprising Connections (you probably didn't know these)
- `AppSidebar()` --references--> `react`  [EXTRACTED]
  src/components/admin/AppSidebar.tsx → package.json
- `useCarousel()` --references--> `react`  [EXTRACTED]
  src/components/ui/carousel.tsx → package.json
- `useChart()` --references--> `react`  [EXTRACTED]
  src/components/ui/chart.tsx → package.json
- `useFormField()` --references--> `react`  [EXTRACTED]
  src/components/ui/form.tsx → package.json
- `useSidebar()` --references--> `react`  [EXTRACTED]
  src/components/ui/sidebar.tsx → package.json

## Import Cycles
- None detected.

## Communities (95 total, 42 thin omitted)

### Community 0 - "e2e-local-state.ts"
Cohesion: 0.05
Nodes (71): nextConfig, assertCleanupEnvironment(), cleanupLocalE2EState(), CleanupOptions, deleteOwnedLocalE2EData(), deleteReferences(), findReferencesByField(), getOwnedAuthUsers() (+63 more)

### Community 1 - "firestore/products.ts"
Cohesion: 0.06
Nodes (54): getSeedAdminDb(), requireSeedEnv(), CATEGORY_SEEDS, seedCatalog(), Context, DELETE(), errorResponse(), GET() (+46 more)

### Community 2 - "index.ts"
Cohesion: 0.05
Nodes (36): localEmulatorEnvironment, metadata, AuthContext, AuthContextValue, AuthProvider(), syncUserProfile(), useAuthContext(), Footer() (+28 more)

### Community 3 - "operations.ts"
Cohesion: 0.06
Nodes (43): GET(), GET(), auditData(), AuditInput, createAuditEntry(), businessHourSchema, getStoreConfiguration(), parseConfiguration() (+35 more)

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (47): eslint, eslint-config-next, @firebase/rules-unit-testing, genkit-cli, jsdom, devDependencies, eslint, eslint-config-next (+39 more)

### Community 5 - "use-toast.ts"
Cohesion: 0.08
Nodes (32): aiFlavorSuggester(), aiFlavorSuggesterFlow, AIFlavorSuggesterInput, AIFlavorSuggesterInputSchema, AIFlavorSuggesterOutput, AIFlavorSuggesterOutputSchema, aiFlavorSuggesterPrompt, ai (+24 more)

### Community 6 - "cn"
Cohesion: 0.08
Nodes (24): AccordionContent, AccordionItem, AccordionTrigger, Avatar, AvatarFallback, AvatarImage, PopoverContent, Progress (+16 more)

### Community 7 - "verify-request.ts"
Cohesion: 0.12
Nodes (24): GET(), POST(), GET(), POST(), toOrderResponse(), isPermission(), isUserOwner(), requireUserOwnership() (+16 more)

### Community 8 - "users.ts"
Cohesion: 0.11
Nodes (26): GET(), PATCH(), toCustomerProfile(), toProfileResponse(), Context, errorResponse(), GET(), PATCH() (+18 more)

### Community 9 - "requirePermission"
Cohesion: 0.14
Nodes (26): GET(), GET(), errorResponse(), GET(), PUT(), errorResponse(), GET(), movementSchema (+18 more)

### Community 10 - "auth-client.ts"
Cohesion: 0.14
Nodes (22): VerifyEmailPage(), AuthStatus(), LoginForm(), PasswordRecoveryForm(), RegisterForm(), Label, labelVariants, AUTH_ERROR_MESSAGES (+14 more)

### Community 11 - "sidebar.tsx"
Cohesion: 0.07
Nodes (28): Separator, Sidebar, SidebarContent, SidebarContext, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent (+20 more)

### Community 12 - "getAdminDb"
Cohesion: 0.15
Nodes (25): Context, DELETE(), errorResponse(), GET(), PATCH(), roleInputSchema, GET(), jsonError() (+17 more)

### Community 13 - "bash"
Cohesion: 0.07
Nodes (28): agent, cronos, cat *credential*, cat *.env*, cat *secret*, env, git push --force*, history (+20 more)

### Community 14 - "button.tsx"
Cohesion: 0.23
Nodes (15): statuses, blank, blank, permissions, AdminGuard(), AdminGuardProps, SessionResponse, canAccessAdmin() (+7 more)

### Community 15 - "auth.ts"
Cohesion: 0.11
Nodes (18): AdminDataScope, canManageRoleAssignments(), getAdminDataScopes(), ADMIN_NAVIGATION, AdminNavigationItem, ADVANCED_ADMIN_NAVIGATION, getVisibleAdminNavigation(), AppSidebar() (+10 more)

### Community 16 - "compilerOptions"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+19 more)

### Community 17 - "migrate-orders.ts"
Cohesion: 0.14
Nodes (24): asRecord(), CollectionLike, DocumentReferenceLike, DocumentSnapshotLike, findDifference(), getDb(), isAlreadyExists(), isExisting() (+16 more)

### Community 18 - "card.tsx"
Cohesion: 0.21
Nodes (7): AdminLoginContent(), ProductForm(), Card, CardContent, CardDescription, CardHeader, CardTitle

### Community 19 - "cuenta/pedidos/[id]/page.tsx"
Cohesion: 0.16
Nodes (17): AdminOrderDetailPage(), AdminOrdersPage(), AccountOrderDetailPage(), formatDate(), responseError(), statusLabels, OrderStatusPage(), statusLabel() (+9 more)

### Community 20 - "categories.ts"
Cohesion: 0.19
Nodes (19): Context, DELETE(), errorResponse(), PATCH(), errorResponse(), GET(), POST(), dynamic (+11 more)

### Community 21 - "checkout/page.tsx"
Cohesion: 0.16
Nodes (11): CheckoutPage(), newAddress(), ProfileForm(), readError(), emptyProduct, ProductCard(), ProductCatalogBrowserProps, CardFooter (+3 more)

### Community 22 - "useAuth"
Cohesion: 0.13
Nodes (17): AuditPage(), EditCategoryPage(), CategoriesPage(), CustomersPage(), ConfigurationPage(), InventoryPage(), NotificationsPage(), EditProductPage() (+9 more)

### Community 23 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 24 - "pedidos/[id]/route.ts"
Cohesion: 0.22
Nodes (15): GET(), PATCH(), RouteContext, toOrderResponse(), hasPermission(), getAdminOrder(), getCustomerOrder(), isOrderStatus() (+7 more)

### Community 25 - "types/orders.ts"
Cohesion: 0.16
Nodes (14): CartContext, CartContextType, CartItem, toCustomerOrder(), CheckoutItemInput, CreateOrderInput, CustomerStatusHistoryEntry, Order (+6 more)

### Community 26 - "menubar.tsx"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 27 - "chart.tsx"
Cohesion: 0.12
Nodes (13): react, react, useCarousel(), ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent (+5 more)

### Community 28 - "validation/orders.ts"
Cohesion: 0.17
Nodes (13): allowedTransitions, assertDistinct(), assertOrderOwnership(), assertValidTransition(), CalculatedOrder, calculateOrder(), createOrderInputSchema, customizationSchema (+5 more)

### Community 29 - "ProductCustomizer.tsx"
Cohesion: 0.22
Nodes (10): ProductCustomizerProps, Checkbox, DialogContent, DialogDescription, DialogFooter(), DialogHeader(), DialogOverlay, DialogTitle (+2 more)

### Community 30 - "firestore/orders.ts"
Cohesion: 0.22
Nodes (11): createOrder(), OrderCreationOptions, orderFingerprint(), OrderNotFoundError, stableOrderId(), productFromData(), getPromotionByCode(), toPromotion() (+3 more)

### Community 31 - "sheet.tsx"
Cohesion: 0.21
Nodes (11): CartPage(), Header(), SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay (+3 more)

### Community 32 - "alert-dialog.tsx"
Cohesion: 0.17
Nodes (11): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle (+3 more)

### Community 33 - "carousel.tsx"
Cohesion: 0.15
Nodes (12): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+4 more)

### Community 34 - "run-firestore-rules-tests.ts"
Cohesion: 0.33
Nodes (11): assertLoopbackHost(), commandName(), createEmulatorConfig(), EmulatorConfig, findFreeLoopbackPort(), main(), quoteWindowsArgument(), run() (+3 more)

### Community 35 - "dashboard/page.tsx"
Cohesion: 0.23
Nodes (10): AdminDashboard(), OrdersResponse, scopeStatKeys, SessionResponse, StatsResponse, statusLabel(), AdminStatKey, AdminStats (+2 more)

### Community 36 - "notifications/route.ts"
Cohesion: 0.36
Nodes (8): GET(), PATCH(), createNotification(), listAdminNotifications(), listNotifications(), markNotificationRead(), toNotification(), { requirePermission, verifyRequest, markNotificationRead }

### Community 37 - "status-timeline.ts"
Cohesion: 0.35
Nodes (8): formatDate(), OrderStatusTimeline(), getOrderTimeline(), isTimelineConnectorComplete(), OrderTimelineEvent, statusSteps, CustomerOrder, cancelledOrder

### Community 38 - "form.tsx"
Cohesion: 0.18
Nodes (9): FormControl, FormDescription, FormFieldContext, FormFieldContextValue, FormItem, FormItemContext, FormItemContextValue, FormLabel (+1 more)

### Community 39 - "dependencies"
Cohesion: 0.22
Nodes (10): dependencies, @radix-ui/react-collapsible, @radix-ui/react-scroll-area, @radix-ui/react-tabs, @radix-ui/react-toast, tailwindcss-animate, @radix-ui/react-collapsible, @radix-ui/react-scroll-area (+2 more)

### Community 40 - "dropdown-menu.tsx"
Cohesion: 0.20
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### Community 41 - "lib/firebase-admin.ts"
Cohesion: 0.42
Nodes (5): main(), getAdminApp(), getAdminAuth(), isServerEmulatorMode(), requireEnv()

### Community 42 - "table.tsx"
Cohesion: 0.22
Nodes (8): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow

### Community 43 - "OrderHistory.tsx"
Cohesion: 0.43
Nodes (4): formatDate(), OrderHistory(), readError(), statusLabels

### Community 44 - "orders-audit.test.ts"
Cohesion: 0.29
Nodes (6): auditReference, { collection, runTransaction, transactionCreate, transactionGet, getProductById, productFromData }, movementReference, notificationReference, orderReference, productReference

### Community 45 - "cuenta/layout.tsx"
Cohesion: 0.50
Nodes (3): AccountLayout(), AccountNav(), links

### Community 46 - "alert.tsx"
Cohesion: 0.40
Nodes (4): Alert, AlertDescription, AlertTitle, alertVariants

### Community 47 - "firestore-rules-emulator.test.ts"
Cohesion: 0.50
Nodes (3): fixturePaths, seedFixtures(), userProfile()

### Community 48 - "admin-guards.test.ts"
Cohesion: 0.50
Nodes (3): adminGuard, dashboard, permissionGate

## Knowledge Gaps
- **418 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+413 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`, `chart.tsx`, `class-variance-authority`, `clsx`, `date-fns`, `dotenv`, `embla-carousel-react`, `firebase`, `firebase-admin`, `genkit`, `@genkit-ai/google-genai`, `@hookform/resolvers`, `lucide-react`, `next`, `patch-package`, `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-avatar`, `@radix-ui/react-checkbox`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-label`, `@radix-ui/react-menubar`, `@radix-ui/react-popover`, `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-select`, `@radix-ui/react-separator`, `@radix-ui/react-slider`, `@radix-ui/react-slot`, `@radix-ui/react-switch`, `@radix-ui/react-tooltip`, `react-day-picker`, `react-dom`, `react-hook-form`, `recharts`, `server-only`, `tailwind-merge`, `zod`?**
  _High betweenness centrality (0.198) - this node is a cross-community bridge._
- **Why does `react` connect `chart.tsx` to `sidebar.tsx`, `auth.ts`, `use-toast.ts`, `dependencies`?**
  _High betweenness centrality (0.189) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `alert-dialog.tsx`, `carousel.tsx`, `use-toast.ts`, `form.tsx`, `dropdown-menu.tsx`, `auth-client.ts`, `sidebar.tsx`, `table.tsx`, `alert.tsx`, `button.tsx`, `card.tsx`, `checkout/page.tsx`, `menubar.tsx`, `chart.tsx`, `ProductCustomizer.tsx`, `sheet.tsx`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _418 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `e2e-local-state.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05067920585161965 - nodes in this community are weakly interconnected._
- **Should `firestore/products.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05921325051759834 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.053939714436805924 - nodes in this community are weakly interconnected._