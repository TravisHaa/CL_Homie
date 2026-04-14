# Contributing to Homie

This guide describes how to contribute to Homie using a spec-driven workflow with Claude Code. It applies to both human contributors and AI-assisted development sessions.

---

## Mandatory Requirements

These four rules are non-negotiable. A PR that violates any of them will not be merged.

### 1. Use Planning Mode before writing code

Every non-trivial change must start in planning mode. Before touching a file, use `/plan` (or `EnterPlanMode`) to produce a written implementation plan. The plan must identify:

- Which files will be read, which will be changed, which will stay untouched
- What the current behavior is and what the new behavior should be
- Any side effects (Firestore writes, store updates, navigation changes)

Do not exit plan mode until the approach is agreed on. Small, self-contained fixes (typo, one-line config change) may skip this — use judgment.

### 2. PR descriptions must be hand-written

Do not paste AI output into a PR description. Write it yourself. A good PR description answers:

- What does this change do?
- Why is it needed?
- What did you test?

One paragraph is fine. Bullet lists of main changes are fine. Auto-generated summaries are not.

### 3. Bugs caught by automated PR review must be fixed before merging

If the automated review flags a bug (logic error, missing null check, broken Firestore query, type mismatch), resolve it before requesting a merge. Do not dismiss or override review comments without explaining why they are wrong.

### 4. Work one feature at a time — no multi-agent sprawl

Do not open worktrees or spawn parallel agents across multiple features simultaneously. **Pick one feature/issue**, finish it or reach a clear stopping point, then move to the next. Working across five features at the same time produces conflicts, half-finished integrations, and debugging sessions that are impossible to untangle.

---

## Spec-Driven Development Workflow

The cycle for every feature or fix is: **read → plan → implement → verify**.

### Step 1 — Read before you touch anything

Before writing a single line of code, read the files involved. This is not optional. For any change of medium size or larger, the prompt should look like:

> "Read `app/(tabs)/shopping.tsx`, `src/hooks/useShoppingList.ts`, and `src/types/index.ts`, then [describe the change]."

Skipping this step causes real problems in this codebase: hook return shapes have specific names that must match (`items`, not `shoppingItems`), Firestore refs must come from `src/firebase/firestore.ts` (not raw `collection(db, ...)`), and the two visual themes must never be mixed. None of these constraints are obvious without reading the files first.

For larger changes, also read:
- `src/types/index.ts` — all Firestore document shapes live here
- `src/store/authStore.ts` / `src/store/houseStore.ts` — before touching anything that reads auth or house state
- `app/_layout.tsx` — before touching routing or the auth gate

### Step 2 — Write the spec

Before implementing, write down what the feature does in plain terms. Include:

- The user-facing behavior (what does the user see/do?)
- The data flow (which hook, which Firestore collection, what query?)
- The component tree (what renders what?)
- Edge cases (empty state, loading state, error state)

This does not need to be long. A short numbered list is enough. The goal is to catch misunderstandings before code is written, not after.

### Step 3 — Implement against the spec

Build what the spec describes. Do not add features that weren't in the spec. Do not refactor surrounding code unless it is blocking the change. Do not add comments, error handling, or fallbacks for scenarios that cannot happen.

Check CLAUDE.md for the full architecture reference — hook shapes, Firestore patterns, design system tokens — before making assumptions.

### Step 4 — Verify before marking done

For UI changes: start the dev server (`npm run web`) and test the golden path. Check that the feature works and that adjacent screens are not broken.

For data changes: confirm Firestore reads/writes appear in the Firebase console. Confirm the correct collection ref from `src/firebase/firestore.ts` is being used.

---

## When Prompt Debugging Becomes a Loop

If you find yourself cycling through the same problem — tweaking a prompt, re-running, still wrong, tweaking again — stop and write a test instead.

Prompt debugging loops usually mean the behavior is underspecified. A test forces you to specify exactly what the correct output is, which breaks the loop.

### Types of tests applicable to this codebase

**Unit tests** — test a single function in isolation with no external dependencies.

Best for:
- Pure utility functions (`weekKey`, `daysUntilExpiry`, category helpers in `src/utils/`)
- Zod schema validation (does this input pass or fail the schema?)
- Firestore data converters in `src/firebase/firestore.ts` (does `makeConverter` strip `id` on write and inject it on read?)

Example: test that `daysUntilExpiry` returns the correct number of days for an item expiring tomorrow, today, and in the past.

**Integration tests** — test a hook or service that coordinates multiple things, with real or fake dependencies injected.

Best for:
- Custom hooks (`useChores`, `useShoppingList`, etc.) — render the hook with a mocked Firestore client and assert it returns the right shape after a snapshot fires
- Auth flow — simulate `onAuthStateChanged` firing and assert the Zustand store is updated correctly
- `useAuthListener` — the most complex piece of state bootstrap in this app; integration tests here have the highest ROI

These tests catch the class of bug that has actually caused issues in this codebase: hook return shapes mismatched, `setIsLoading(false)` not called in the `finally` block, `houseStore` not populated after login.

**End-to-end (E2E) tests** — drive the app like a real user through a real or simulated environment.

Best for:
- Auth flows (sign up → join house → land on home tab)
- Critical paths (add a shopping item → see it appear in the list → check it off)

Not set up yet in this repo. When added, Detox (React Native) or Playwright (web) are the natural choices given the Expo + web setup.

**Snapshot / component tests** — render a component and assert the output matches a stored snapshot, or assert specific elements are present.

Best for:
- Design-system components where visual regressions matter (`Note`, `Magnet`, `ShoppingItemRow`)
- Confirming a component renders without crashing given a set of props

Low maintenance cost, but low signal — they tell you something changed, not whether the change was correct.

---

## Files to Know Before Contributing

| File | Why it matters |
|---|---|
| `CLAUDE.md` | Full architecture reference — read this first |
| `src/types/index.ts` | All Firestore document types |
| `src/firebase/firestore.ts` | Typed collection refs — always use these, never raw `collection()` |
| `src/hooks/useAuth.ts` | Auth bootstrap — the most state-sensitive file in the app |
| `app/_layout.tsx` | Root layout + `AuthGate` — routing logic lives here |
| `src/store/authStore.ts` | Zustand auth state |
| `src/store/houseStore.ts` | Zustand house + member state |

---

## Branch and PR Conventions

- Branch off `staging`, not `main`. `main` is behind.
- Branch names: `feature/<name>`, `fix/<short-description>`
- One feature or fix per PR. Do not bundle unrelated changes.
- Keep `staging` green. Do not merge a PR that breaks the dev server or leaves the app in a visibly broken state.
