# FitFlow Pro Constitution

**Purpose**: Define non-negotiable engineering standards for FitFlow Pro, a mobile-first fitness training application implementing evidence-based Renaissance Periodization methodology.

## Core Principles

### I. Test-First Development (TDD) - NON-NEGOTIABLE

**Mandate**: All features MUST follow strict TDD discipline.

**Requirements**:
- Contract tests MUST be written first and MUST FAIL before any implementation
- Red-Green-Refactor cycle strictly enforced
- Tests document behavior (tests are living specification)
- No implementation without failing tests

**Violations**: Any PR with implementation before failing tests will be rejected

### II. Performance Standards - NON-NEGOTIABLE

**Mandate**: App MUST meet performance targets for optimal user experience during workouts.

**Requirements**:
- **Backend SQLite writes**: < 5ms (p95), < 10ms (p99)
- **API response times**: < 200ms (p95)
- **UI interactions**: < 100ms perceived latency
- **Rest timer accuracy**: ±2 seconds
- Performance tests MUST be automated and run in CI

**Rationale**: Users log sets mid-workout; any lag breaks flow and reduces adherence

### III. Security Requirements

**Mandate**: User data and authentication MUST be protected.

**Requirements**:
- **Password hashing**: bcrypt with cost ≥ 12
- **JWT tokens**: HMAC-SHA256 with 30-day expiration (documented exception for home server single-user use case)
- **Input validation**: JSON Schema validation on ALL API endpoints
- **SQL injection prevention**: Parameterized queries ONLY (better-sqlite3 prepared statements)
- **Sensitive data**: NEVER log passwords, tokens, or PII

**Documented Exception**:
- JWT 30-day expiration (vs. industry standard 24h) justified for home server deployment with single user per Raspberry Pi 5 instance

### IV. Testing Requirements

**Mandate**: Code MUST be comprehensively tested before merge.

**Requirements**:
- **Overall coverage**: ≥ 80%
- **Critical paths**: 100% coverage (auth, workout logging, sync queue, data persistence)
- **Test execution time**: < 5 seconds per test suite
- **Deterministic tests**: No flaky tests; tests must pass 100 consecutive runs
- **Test isolation**: Each test MUST be independent (no shared state)

**Test Pyramid**:
- Unit tests: 60-70% (fast, isolated)
- Integration tests: 20-30% (API + DB)
- E2E tests: 5-10% (critical user flows only)

### V. Code Quality Standards

**Mandate**: Code MUST be maintainable and readable.

**Requirements**:
- **TypeScript strict mode**: Enabled; no `any` types (use `unknown` if truly dynamic)
- **ESLint compliance**: Zero warnings, zero errors
- **Cyclomatic complexity**: ≤ 10 per function
- **Function length**: ≤ 50 lines (prefer smaller)
- **Code reviews**: All PRs require approval before merge

### VI. Offline-First Architecture - NON-NEGOTIABLE

**Mandate**: App MUST work offline for workout logging (core use case).

**Requirements**:
- **Workout logging**: MUST work offline (write-through cache)
- **Sync queue**: Background sync with exponential backoff (1s, 2s, 4s, 8s, 16s)
- **Conflict resolution**: Last-write-wins based on server timestamp
- **NO mobile SQLite**: Backend better-sqlite3 is single source of truth
- **User experience**: Never block user interactions waiting for server

**Rationale**: Users train in gyms with poor connectivity; app must not fail during workouts

### VII. Backend SQLite Only - NON-NEGOTIABLE

**Mandate**: NO mobile database (no expo-sqlite). Backend SQLite is single source of truth.

**Requirements**:
- Mobile app is API client ONLY
- All persistence through backend API endpoints
- Sync queue for offline writes (retry with exponential backoff)
- Programs cached via API responses (read-only offline)
- Editing programs requires active internet connection

**Rationale**: Simplifies architecture, eliminates sync conflicts, centralizes data integrity

## Quality Gates

### Pre-Merge Gates

All PRs MUST pass:
1. All tests passing (unit, integration, contract)
2. Test coverage ≥ 80% (critical paths 100%)
3. ESLint zero warnings/errors
4. TypeScript strict mode compliance
5. Performance benchmarks met (if applicable)
6. Code review approved

### Pre-Release Gates

All releases MUST pass:
1. All pre-merge gates
2. Manual E2E testing of 5 quickstart scenarios
3. Performance testing on target hardware (Raspberry Pi 5)
4. No known CRITICAL or HIGH severity bugs

## Technology Stack

**Mandated Technologies** (cannot change without constitution amendment):
- **Backend**: Fastify 4.26+, better-sqlite3, TypeScript 5.3+, Node.js 20 LTS
- **Mobile**: React Native (Expo SDK 54+), TypeScript 5.3+
- **Database**: SQLite with WAL mode (backend ONLY)
- **State Management**: Zustand (mobile)
- **API Client**: TanStack Query (mobile)
- **Testing**: Vitest (backend), React Native Testing Library (mobile), Tap (contract tests)

**Deployment**:
- **Target Platform**: Raspberry Pi 5 ARM64 (home server)
- **Process Manager**: PM2
- **Reverse Proxy**: Nginx with Let's Encrypt

## Governance

### Constitution Authority

- Constitution supersedes all other practices and documentation
- Conflicts between constitution and other docs: Constitution wins
- CRITICAL violations (security, data loss risk): Immediate rollback required
- Non-CRITICAL violations: Create remediation plan within 1 sprint

### Amendment Process

Constitution changes require:
1. Written proposal with rationale
2. Impact analysis on existing code
3. Migration plan (if breaking change)
4. Approval from project owner
5. Version bump and changelog entry

### Enforcement

- All PRs MUST verify constitution compliance in review
- Automated checks where possible (ESLint, TypeScript, test coverage)
- Manual verification for subjective principles (code clarity, complexity)

**Version**: 2.1.1
**Ratified**: 2025-10-03
**Last Amended**: 2025-10-03
**Next Review**: 2026-01-03
