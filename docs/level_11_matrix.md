# Level 11 — Matrix Strategy

> **Previously Learned:** Workflow · Event · Job · Step · CI · env: · Contexts · `if:` · `needs:` · DAG
>
> **This Level:** Run one job definition across multiple configurations simultaneously using `strategy: matrix:`. Test on Node 20, 22, and 24 in parallel.

---

## The Problem Matrix Solves

Your Node.js API should work on the Node version your users run.
Without matrix you'd need to duplicate the entire job 3 times:

```yaml
# BAD — duplicated YAML
test-node-20:
  steps:
    - uses: actions/setup-node@v4
      with: { node-version: 20 }
    - run: npm test

test-node-22:
  steps:
    - uses: actions/setup-node@v4
      with: { node-version: 22 }
    - run: npm test

test-node-24:
  steps:
    - uses: actions/setup-node@v4
      with: { node-version: 24 }
    - run: npm test
```

**With matrix — write it once:**

```yaml
# GOOD — defined once, runs 3 times
test:
  strategy:
    matrix:
      node-version: [20, 22, 24]
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
    - run: npm test
```

---

## How Matrix Works

```text
You define ONE job.
You declare a matrix variable with N values.
GitHub generates N independent jobs — one per value.

matrix:
  node-version: [20, 22, 24]

GitHub creates:
  test (Node 20)  ──┐
  test (Node 22)  ──┼──► all run in PARALLEL
  test (Node 24)  ──┘

Inside each job, ${{ matrix.node-version }} is the current value.
```

---

## Multi-Dimensional Matrix

Matrix can have multiple variables — every combination is created:

```yaml
strategy:
  matrix:
    node-version: [20, 22]
    os: [ubuntu-latest, windows-latest]
```

```text
Creates 4 jobs (2 × 2):
  node=20  os=ubuntu   ──┐
  node=20  os=windows  ──┤  all run in parallel
  node=22  os=ubuntu   ──┤
  node=22  os=windows  ──┘
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

# Pipeline DAG:
#
#                   ┌── test (Node 20) ──┐
#                   ├── test (Node 22) ──┤
# push ────────────►│                    ├──► build
#                   ├── test (Node 24) ──┤
#                   └── lint ────────────┘

jobs:

  # ── Job 1: test (matrix) ─────────────────────────────────────────────────
  test:
    name: "Test / Node ${{ matrix.node-version }}"
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        node-version: [20, 22, 24]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: "Setup Node.js ${{ matrix.node-version }}"
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm ci

      - name: Show Node version
        run: |
          echo "Testing on Node.js $(node --version)"
          echo "npm version: $(npm --version)"

      - name: Run tests
        id: tests
        run: npm test

      - name: Tests passed
        if: success()
        run: echo "✅ All tests passed on Node ${{ matrix.node-version }}!"

      - name: Tests failed
        if: failure()
        run: echo "❌ Tests failed on Node ${{ matrix.node-version }}!"

  # ── Job 2: lint ──────────────────────────────────────────────────────────
  lint:
    name: Lint Check
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: |
          echo "Running lint..."
          echo "✅ No lint errors found"

  # ── Job 3: build ─────────────────────────────────────────────────────────
  # needs: test → waits for ALL 3 matrix jobs to pass (not just one)
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [test, lint]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: |
          echo "Building ${{ env.APP_NAME }}..."
          echo "All Node versions passed! ✅"
```

---

## Line-by-Line Explanation

| Code | Meaning |
|---|---|
| `strategy:` | Container for matrix/parallel execution configuration |
| `fail-fast: false` | Let all matrix jobs finish even if one fails |
| `matrix:` | Define the variables and their values |
| `node-version: [20, 22, 24]` | Three values → three jobs created |
| `${{ matrix.node-version }}` | References the current job's value from the matrix |
| `name: "Test / Node ${{ matrix.node-version }}"` | Job display name includes the current matrix value |
| `node-version: ${{ matrix.node-version }}` | Passes the matrix value as input to setup-node |
| `needs: [test, lint]` | Waits for ALL matrix test jobs (not just one) + lint |

---

## `fail-fast` — See the Full Picture

```text
fail-fast: true  (default)
  Node 20 fails → GitHub immediately cancels Node 22 and Node 24 jobs
  You only see: "Node 20 failed"
  You don't know if 22 and 24 would have passed

fail-fast: false
  Node 20 fails → Node 22 and Node 24 continue running
  You see:
    Node 20 ❌
    Node 22 ✅
    Node 24 ✅
  Now you know: this is a Node 20 specific issue
```

For compatibility testing, `fail-fast: false` gives much more useful information.

---

## GitHub UI — What You See

With matrix on the `test` job, GitHub shows separate entries for each:

```text
CI Pipeline
  ├── Test / Node 20    ✅  (1m 23s)
  ├── Test / Node 22    ✅  (1m 18s)
  ├── Test / Node 24    ✅  (1m 31s)
  ├── Lint Check        ✅  (0m 45s)
  └── Build             ✅  (0m 52s)
```

Each matrix job has its own logs, its own pass/fail status.

---

## `needs:` + Matrix — Important Behaviour

```yaml
build:
  needs: [test, lint]
```

When `test` is a matrix job with 3 values, `needs: test` means:

```text
build waits for ALL 3 matrix jobs:
  Test / Node 20 ✅
  Test / Node 22 ✅
  Test / Node 24 ✅
  Lint Check     ✅
  → THEN build starts

If ANY matrix job fails → build is skipped
```

You don't need to list each matrix job individually in `needs:` — just the job ID.

---

## `include:` — Add Extra Variables to Specific Combinations

```yaml
strategy:
  matrix:
    node-version: [20, 22, 24]
    include:
      - node-version: 20
        is-lts: true
      - node-version: 22
        is-lts: true
      # node 24 gets no is-lts property

steps:
  - name: LTS label
    if: matrix.is-lts == true
    run: echo "Node ${{ matrix.node-version }} is an LTS release"
```

---

## `exclude:` — Remove Specific Combinations

```yaml
strategy:
  matrix:
    node-version: [20, 22, 24]
    os: [ubuntu-latest, windows-latest]
    exclude:
      - node-version: 24
        os: windows-latest     # don't test Node 24 on Windows
```

```text
Creates 5 jobs instead of 6:
  node=20  ubuntu ✅
  node=20  windows ✅
  node=22  ubuntu ✅
  node=22  windows ✅
  node=24  ubuntu ✅
  node=24  windows ❌ excluded
```

---

## Execution Flow

```text
git push to main
    ↓
ci.yml triggered
    ↓
GitHub reads matrix: node-version: [20, 22, 24]
    ↓
Spawns:
  VM#1 → test (Node 20): checkout → setup-node@20 → npm ci → npm test ✅
  VM#2 → test (Node 22): checkout → setup-node@22 → npm ci → npm test ✅
  VM#3 → test (Node 24): checkout → setup-node@24 → npm ci → npm test ✅
  VM#4 → lint: checkout → npm ci → lint ✅
    ↓ (all 4 pass)
  VM#5 → build: checkout → npm ci → build ✅
    ↓
GitHub shows 5 completed jobs, all green ✅
```

---

## Real-World Usage

In production, matrix is used for:

```text
Node version compatibility  → node-version: [18, 20, 22]
OS compatibility            → os: [ubuntu, windows, macos]
Python version testing      → python-version: [3.10, 3.11, 3.12]
Browser testing             → browser: [chrome, firefox, safari]
Database version testing    → db-version: [postgres-14, postgres-15]
```

---

## What I Learned in Level 11

| Concept | What it is |
|---|---|
| `strategy:` | Container for matrix/parallelism configuration |
| `matrix:` | Define variables → GitHub creates one job per value/combination |
| `${{ matrix.<var> }}` | Reference the current job's matrix value |
| `fail-fast:` | Whether to cancel remaining jobs if one fails |
| `max-parallel:` | Limit concurrent matrix jobs |
| `include:` | Add extra values or variables to specific combinations |
| `exclude:` | Remove specific combinations from the matrix |
| Matrix + `needs:` | `needs:` waits for ALL matrix jobs to complete |

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
| `needs` | ✅ | `build needs: [test, lint]` |
| Matrix | ✅ | `strategy.matrix` on `test` job |
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
| `strategy:` | Matrix/parallelism config | `strategy:` |
| `matrix:` | Variable definitions | `matrix: node-version: [20,22,24]` |
| `${{ matrix.X }}` | Current matrix variable value | `${{ matrix.node-version }}` |
| `fail-fast:` | Cancel remaining on first failure | `fail-fast: false` |
| `max-parallel:` | Limit concurrent jobs | `max-parallel: 2` |
| `include:` | Add combinations/variables | `include: [{node-version: 20, lts: true}]` |
| `exclude:` | Remove combinations | `exclude: [{node: 24, os: windows}]` |
| `needs:` | Job dependency | `needs: [test, lint]` |

---

## 📚 Official Documentation

- [Using a matrix strategy](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/running-variations-of-jobs-in-a-workflow)
- [Workflow syntax — `strategy`](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#jobsjob_idstrategy)
- [Using `include` to expand configurations](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/running-variations-of-jobs-in-a-workflow#expanding-or-adding-matrix-configurations)

---

## 🧪 Exercise

You have this matrix definition:

```yaml
strategy:
  fail-fast: true
  matrix:
    node-version: [18, 20, 22]
    os: [ubuntu-latest, windows-latest]
    exclude:
      - node-version: 18
        os: windows-latest
```

**Answer these without running it:**

1. How many jobs does this matrix create?
2. If Node 18 on Ubuntu fails, what happens to the remaining jobs (fail-fast is `true`)?
3. Which specific combination is excluded?
4. Rewrite the `strategy:` so that even if one fails, all others still run to completion.

> ✋ **Write your answers. I'll review.**

---

```text
Progress:        11 / 23
Current Level:   Level 11 — Matrix Strategy
Concepts Learned: strategy.matrix, ${{ matrix.* }}, fail-fast,
                  max-parallel, include, exclude, matrix + needs
Files Modified:  .github/workflows/ci.yml
Next Concept:    Level 12 — Dependency Caching
Exercise:        Predict matrix job count + failure behaviour
```
