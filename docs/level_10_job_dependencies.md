# Level 10 — Job Dependencies

> **Previously Learned:** Workflow · Event · Job · Step · CI · env: · Contexts · `if:` · Status functions
>
> **This Level:** Create multiple jobs. Control execution order with `needs:`. Understand parallel vs sequential jobs and the DAG model.

---

## Why Multiple Jobs?

Everything so far lives inside one job. Real CI pipelines split work into separate jobs:

```text
Single job (bad):
  step: npm test    → 2 min
  step: npm lint    → 1 min
  step: npm build   → 1 min
  Total: 4 min (all sequential)

Multiple jobs (good):
  job: test   ─┐
               ├──► build  → 1 min
  job: lint   ─┘
  test: 2 min, lint: 1 min run in PARALLEL
  Total: 2 min + 1 min = 3 min ← faster!
```

Benefits:
1. **Speed** — parallel jobs reduce total wall-clock time
2. **Isolation** — each job gets a clean runner VM
3. **Clarity** — failures pinpoint exactly which concern broke
4. **Control** — deploy only after all quality gates pass

---

## Default Behaviour — Jobs Run in Parallel

Without any `needs:`, all jobs start simultaneously:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  lint:
    runs-on: ubuntu-latest
    steps:
      - run: echo "linting"
```

```text
Workflow starts
    ↓
┌── test job (fresh VM) ──────┐
│                              │   ← start at the same time
└── lint job (fresh VM) ───────┘
    ↓
Both finish independently
```

Each job = its own fresh Ubuntu VM. Completely isolated. No shared state.

---

## `needs:` — Sequential Dependencies

`needs:` says: *"don't start this job until these jobs have finished successfully."*

### Single dependency

```yaml
build:
  needs: test        # wait for test to pass
```

### Multiple dependencies

```yaml
build:
  needs: [test, lint]    # wait for BOTH to pass
```

### Chain dependency

```yaml
test:
  ...

build:
  needs: test      # waits for test

deploy:
  needs: build     # waits for build (which already waited for test)
```

```text
test → build → deploy   (fully sequential chain)
```

---

## The DAG Model

GitHub Actions models dependencies as a **DAG (Directed Acyclic Graph)**:

```text
Directed  = dependencies flow one way (no cycles)
Acyclic   = A can't depend on B if B depends on A
Graph     = jobs are nodes, needs: are edges
```

**Our pipeline DAG:**

```text
           ┌── test ──┐
push ─────►│          ├──► build
           └── lint ──┘
```

**A more complex real-world DAG:**

```text
           ┌── unit-tests ──┐
           │                │
push ─────►├── lint ─────────┼──► build ──► deploy-staging ──► deploy-prod
           │                │
           └── type-check ──┘
```

---

## Complete Code — `ci.yml`

```yaml
name: CI Pipeline

on:
  push:
    branches: [ "main" ]
    paths: [ "src/**", "tests/**", "package.json", "package-lock.json" ]
  pull_request:
    branches: [ "main" ]
    paths: [ "src/**", "tests/**", "package.json", "package-lock.json" ]

env:
  NODE_ENV: test
  APP_NAME: github-actions-learning-api

jobs:
  # ── Job 1: test ─────────────────────────────────────────────────────
  test:
    name: Run Tests
    runs-on: ubuntu-latest
    env:
      LOG_LEVEL: debug

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        id: tests
        run: npm test

      - name: Tests passed
        if: success()
        run: echo "✅ All tests passed!"

      - name: Tests failed
        if: failure()
        run: echo "❌ Tests failed! ${{ github.actor }} on ${{ github.ref_name }}"

  # ── Job 2: lint ─────────────────────────────────────────────────────
  # Runs IN PARALLEL with test (no needs: → starts immediately)
  lint:
    name: Lint Check
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run lint (simulated)
        run: |
          echo "Running lint checks..."
          echo "✅ No lint errors found"

  # ── Job 3: build ────────────────────────────────────────────────────
  # Starts ONLY after BOTH test and lint succeed
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [test, lint]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: |
          echo "Building ${{ env.APP_NAME }}..."
          echo "Triggered by: ${{ github.actor }}"
          echo "Commit: ${{ github.sha }}"
          echo "✅ Build complete"
```

---

## Line-by-Line Explanation

| Code | Meaning |
|---|---|
| `jobs:` | Container block for all jobs in this workflow |
| `test:` | Job ID — unique identifier for this job |
| `name: Run Tests` | Display name shown in GitHub UI (optional — defaults to job ID) |
| `lint:` | Second job — no `needs:` → starts in parallel with `test` |
| `build:` | Third job — has `needs:` → starts only after dependencies |
| `needs: [test, lint]` | Build waits for BOTH test AND lint to succeed |

---

## Job `name:` vs Job ID

```yaml
jobs:
  test:               # ← job ID: used in needs:, steps context, YAML structure
    name: Run Tests   # ← display name: shown in GitHub Actions UI
```

```text
GitHub UI shows: "Run Tests" (the name:)
YAML references use: test (the ID)

needs: [test, lint]   ← always use the job IDs, not the display names
```

---

## Failure Propagation

What happens when a dependency fails?

```text
Scenario: test fails, lint passes

test ❌ ──┐
          ├──► build  ⊘ SKIPPED  (never runs)
lint ✅ ──┘

The build job is skipped, not failed.
GitHub shows it as cancelled/skipped.
```

```text
Scenario: both fail

test ❌ ──┐
          ├──► build  ⊘ SKIPPED
lint ❌ ──┘

Same result — build is skipped if ANY dependency fails.
```

You can override this with `if: always()` on a job — but rarely needed.

---

## Job Isolation — Each Job Gets a Fresh VM

This is critical to understand:

```yaml
jobs:
  test:
    steps:
      - run: npm ci                  # installs node_modules
      - run: echo "hello" > file.txt # creates a file

  build:
    needs: test
    steps:
      - run: cat file.txt            # ❌ FAILS — different VM, file doesn't exist
      - run: npm test                # ❌ FAILS — node_modules not installed here either
```

```text
test job   → runs on VM #1 → VM destroyed after job ends
build job  → runs on VM #2 (brand new, empty) → must re-checkout, re-install
```

**Every job must:**
- Re-checkout the code (`actions/checkout`)
- Re-install dependencies (`npm ci`)
- Re-do any setup that the previous job did

That's why all three jobs in our `ci.yml` have their own checkout and setup steps.

> Later in Level 13 (Artifacts) we'll learn how to **pass files between jobs** when you need to share build output.

---

## `needs:` in Conditions — Checking Dependency Results

You can reference whether a dependency succeeded:

```yaml
deploy:
  needs: [test, build]
  if: needs.test.result == 'success' && needs.build.result == 'success'
```

```text
needs.<job-id>.result values:
  success    → job passed
  failure    → job failed
  cancelled  → job was cancelled
  skipped    → job was skipped
```

We won't use this much yet — the default behaviour (don't run if dependency failed) is usually what you want.

---

## Execution Flow (Full)

```text
git push to main
    ↓
ci.yml triggered
    ↓
GitHub reads the jobs: block
    ↓
Determines DAG:
  test → no needs → start immediately
  lint → no needs → start immediately
  build → needs [test, lint] → wait
    ↓
┌── VM #1 provisioned → test job starts ──────────────────┐
│   checkout → setup-node → npm ci → npm test → passes ✅ │
└──────────────────────────────────────────────────────────┘
┌── VM #2 provisioned → lint job starts ──────────────────┐
│   checkout → setup-node → npm ci → lint → passes ✅     │
└──────────────────────────────────────────────────────────┘
    ↓ (both complete)
┌── VM #3 provisioned → build job starts ─────────────────┐
│   checkout → setup-node → npm ci → build → passes ✅    │
└──────────────────────────────────────────────────────────┘
    ↓
Workflow complete ✅
GitHub shows: Run Tests ✅  Lint Check ✅  Build ✅
```

---

## What I Learned in Level 10

| Concept | What it is |
|---|---|
| Parallel jobs | Multiple jobs start simultaneously by default |
| Sequential jobs | Use `needs:` to make a job wait for another |
| `needs:` | Declare job dependencies — single or list |
| DAG | The dependency graph GitHub uses to order jobs |
| Job isolation | Each job = fresh VM — no shared filesystem between jobs |
| Failure propagation | If a dependency fails, dependents are skipped |
| Job `name:` | Optional display name in GitHub UI (different from job ID) |
| `needs.<job>.result` | Access the result of a dependency in a condition |

---

## 📊 Learning Map

| Concept | Learned | Used In |
|---|---|---|
| Workflow | ✅ | `hello.yml`, `ci.yml`, `contexts.yml` |
| Event | ✅ | `push`, `pull_request`, `workflow_dispatch` |
| Job | ✅ | `test`, `lint`, `build` in `ci.yml` |
| Step | ✅ | All steps |
| Runner | ✅ | `ubuntu-latest` |
| Action | ✅ | `checkout`, `setup-node` |
| CI | ✅ | `ci.yml` |
| PR workflow | ✅ | `on: pull_request:` |
| Branch filtering | ✅ | `branches:`, `paths:` |
| Environment variables | ✅ | `env:` — all 3 levels |
| Contexts | ✅ | `github.*`, `runner.*`, `env.*` |
| Expressions & Conditions | ✅ | `if:` + status functions |
| `needs` | ✅ | `ci.yml` — build needs [test, lint] |
| Matrix | ⬜ | Level 11 |
| Cache | ⬜ | Level 12 |
| Artifacts | ⬜ | Level 13 |
| Secrets | ⬜ | Level 14 |
| Permissions | ⬜ | Level 15 |
| Environments | ⬜ | Level 16 |
| CD | ⬜ | Level 17 |
| Docker | ⬜ | Level 18 |
| Reusable workflow | ⬜ | Level 19 |
| Composite action | ⬜ | Level 20 |
| Debugging | ⬜ | Level 21 |
| Security | ⬜ | Level 22 |

---

## 🔧 Syntax Reference (Updated)

| Keyword | Purpose | Example |
|---|---|---|
| `needs:` | Wait for another job to finish | `needs: [test, lint]` |
| `name:` (job) | Display name in GitHub UI | `name: Run Tests` |
| `needs.<id>.result` | Get dependency job result in `if:` | `needs.test.result == 'success'` |
| `if:` | Condition on step or job | `if: failure()` |
| `success()` | All prior steps/jobs passed | `if: success()` |
| `failure()` | Any prior step/job failed | `if: failure()` |
| `always()` | Always run | `if: always()` |
| `${{ github.actor }}` | Who triggered the run | in `run:` or `name:` |

---

## 📚 Official Documentation

- [Workflow syntax — `needs`](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#jobsjob_idneeds)
- [Using jobs in a workflow](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/using-jobs-in-a-workflow)
- [Job dependencies](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/using-jobs-in-a-workflow#defining-prerequisite-jobs)

---

## 🧪 Exercise

Design the `needs:` relationships for this pipeline:

```text
Requirements:
  - "unit-test" and "integration-test" run in parallel
  - "lint" runs in parallel with both tests
  - "build" runs only after unit-test AND integration-test pass
  - "security-scan" runs only after lint passes
  - "deploy" runs only after build AND security-scan both pass
```

Write just the `jobs:` structure with correct `needs:` values.  
You don't need to write the steps — just job IDs and `needs:`.

**Expected DAG:**

```text
                    ┌── unit-test ──────┐
                    │                   ├──► build ──────┐
push ──────────────►├── integration-test┘                ├──► deploy
                    │                                    │
                    └── lint ──► security-scan ──────────┘
```

> ✋ **Write the YAML structure. Paste it here. I'll review.**

---

```text
Progress:        10 / 23
Current Level:   Level 10 — Job Dependencies
Concepts Learned: parallel jobs, needs:, DAG, job isolation,
                  failure propagation, needs.<job>.result
Files Modified:  .github/workflows/ci.yml
Next Concept:    Level 11 — Matrix Strategy
Exercise:        Design needs: relationships for a 5-job pipeline
```
