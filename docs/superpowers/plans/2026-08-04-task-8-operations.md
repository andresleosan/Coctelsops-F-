# Task 8 Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure inventory, promotions, business configuration, aggregate reports, audit coverage, internal notifications, and their responsive admin screens.

**Architecture:** Pure calculators in `src/types/operations.ts` own stock and promotion invariants. Firestore repositories use Admin SDK transactions and explicit actor arguments. API routes verify the active user and required permission before parsing or mutating data; admin pages call those routes through the existing shell.

**Tech Stack:** Next.js App Router, TypeScript, Firebase Admin Firestore, Zod, Vitest, Tailwind, Radix primitives already present in the repository.

## Global Constraints

- Every admin API verifies an active user and an explicit permission server-side.
- Inventory mutations are transactional, reject insufficient stock, and audit actor and reason.
- Promotion validation covers dates, active state, scope, usage limits, and discount caps; checkout uses the same pure calculator.
- Configuration has validated fallback defaults and controls WhatsApp, hours, zones, messages, and estimated time.
- Reports expose aggregates only and require `reportes.read`.
- Audit records cover role, user, order, product, inventory, promotion, and configuration mutations.
- Notifications are internal records; WhatsApp is only a prepared link.
- UI copy is Spanish and preserves the Coctels OPS responsive visual language.

## Implementation Tasks

### Task 1: Pure domain contracts and tests

- [ ] Add operations types, fallback configuration, pure stock delta helper, promotion calculator, and report aggregation types.
- [ ] Add tests for additions, deductions, insufficient stock, expired/inactive promotions, minimum subtotal, scope, usage limit, caps, deterministic totals, and report aggregation.
- [ ] Run the focused tests and confirm they fail only because implementations are absent.

### Task 2: Server repositories

- [ ] Implement transactional inventory movement and availability updates with audit records.
- [ ] Implement promotion CRUD, validation, usage checks, and checkout calculation helper.
- [ ] Implement configuration parsing/defaults and CRUD.
- [ ] Implement bounded audit and notification reads/writes.
- [ ] Implement aggregate order reporting without returning order documents.

### Task 3: Protected APIs and cross-module audit/notifications

- [ ] Add permission-protected inventory, promotion, configuration, report, and notification routes.
- [ ] Add audit calls to order/product/category mutations where Task 8 owns the coverage.
- [ ] Add order-state customer notifications and new-order admin notifications without sending WhatsApp automatically.

### Task 4: Admin screens and navigation

- [ ] Add six Spanish responsive screens with loading/error/empty states, bounded lists, permission gates, and confirmations for destructive actions.
- [ ] Add their navigation entries and required route-level permission mapping.

### Task 5: Verification and delivery

- [ ] Run focused and full tests, typecheck, lint, and build.
- [ ] Review security and data exposure, inspect the diff, commit only Task 8 files, and write the requested report.
