# Level 9 — Expressions and Conditions

> **Previously Learned:** Workflow · Event · Job · Step · CI · env: · Contexts · `${{ }}`
>
> **This Level:** Control whether a step or job runs using `if:`. Use status functions, operators, and context comparisons to make workflows intelligent.

---

## What Are Conditions?

Every step in your workflow currently **always runs** (unless a prior step fails).

Real workflows need logic:

```text
"Deploy ONLY from main — never from feature branches"
"Notify Slack ONLY when tests fail"
"Upload logs regardless of pass or fail"
"Show PR info ONLY when triggered by a pull_request event"
```

`if:` is how you express this logic.

---

## The `if:` Keyword

```yaml
steps:
  - name: My Step
    if: <expression>
    run: echo "Only runs when expression is true"
```

| Expression result | Behaviour |
|---|---|
| `true` | Step runs ✅ |
| `false` | Step is **skipped** (not failed) — shown as grey in logs |

`if:` can be placed on:
- A **step** → controls that single step
- A **job** → controls the entire job

---

## Part 1 — Status Functions

These check the **current state** of the job at the moment the step runs.

| Function | Returns `true` when... |
|---|---|
| `success()` | All previous steps succeeded |
| `failure()` | At least one previous step failed |
| `always()` | Always — regardless of any result |
| `cancelled()` | Workflow was cancelled by a user |

### Default implicit behaviour

Every step, without any `if:`, behaves as if it has:

```yaml
if: success()
```

This means: if any step fails → all following steps are **automatically skipped**.

### `failure()` — run only when something went wrong

```yaml
- name: Run tests
  run: npm test          # suppose this fails

- name: Notify team
  if: failure()
  run: echo "Tests failed! Check the logs."
  # Without if: failure(), this step would be SKIPPED after npm test fails
  # With if: failure(), it RUNS specifically because a step failed
```

### `always()` — run no matter what

```yaml
- name: Run tests
  run: npm test

- name: Upload debug logs
  if: always()
  run: cat /tmp/debug.log
  # Runs whether tests passed OR failed
  # Essential for: cleanup, log uploads, notifications that must always fire
```

### `cancelled()` — run only when cancelled

```yaml
- name: Cleanup on cancel
  if: cancelled()
  run: ./cleanup.sh
```

---

## Part 2 — Context Comparisons

Combine status functions with context values using operators.

### Operators

| Operator | Meaning | Example |
|---|---|---|
| `==` | Equal | `github.ref == 'refs/heads/main'` |
| `!=` | Not equal | `github.event_name != 'pull_request'` |
| `&&` | AND (both must be true) | `github.ref == 'refs/heads/main' && success()` |
| `\|\|` | OR (either must be true) | `failure() \|\| cancelled()` |
| `!` | NOT | `!failure()` |

### Real examples

```yaml
# Only run on the main branch
if: github.ref == 'refs/heads/main'

# Only run on pull requests
if: github.event_name == 'pull_request'

# Only run on direct push (not PR)
if: github.event_name == 'push'

# Deploy only to main AND only if tests passed
if: github.ref == 'refs/heads/main' && success()

# Notify on failure OR cancellation
if: failure() || cancelled()

# Run on main, but not in PRs
if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
```

---

## Part 3 — Expression Functions

GitHub provides built-in string functions:

| Function | What it does | Returns true when... |
|---|---|---|
| `contains(a, b)` | Check if `a` contains substring `b` | `contains(github.ref, 'main')` → ref has "main" |
| `startsWith(a, b)` | Check if `a` starts with `b` | `startsWith(github.ref, 'refs/heads/feature')` |
| `endsWith(a, b)` | Check if `a` ends with `b` | `endsWith(github.actor, '28')` |

```yaml
# Run only on feature branches
if: startsWith(github.ref, 'refs/heads/feature')

# Run only if actor's username contains 'bot'
if: contains(github.actor, 'bot')

# Skip for bots, run for humans
if: "!contains(github.actor, 'bot')"
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
  test:
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

      # ── LEVEL 9: CONDITIONS ─────────────────────────────────────────

      # Runs ONLY on pull_request events
      - name: Show PR info
        if: github.event_name == 'pull_request'
        run: |
          echo "This is a PR run"
          echo "Actor: ${{ github.actor }}"
          echo "SHA:   ${{ github.sha }}"

      # Runs ONLY on direct push to main
      - name: Show push info
        if: github.event_name == 'push'
        run: |
          echo "This is a direct push to main"
          echo "Commit: ${{ github.sha }}"

      # Always runs — success or failure
      - name: Print run context
        if: always()
        run: |
          echo "Workflow: ${{ github.workflow }}"
          echo "Run #:    ${{ github.run_number }}"
          echo "Branch:   ${{ github.ref_name }}"

      # Main test step
      - name: Run tests
        id: tests
        env:
          TEST_REPORTER: verbose
        run: npm test

      # Runs ONLY if tests passed
      - name: Tests passed — ready to merge
        if: success()
        run: echo "✅ All tests passed. Safe to merge!"

      # Runs ONLY if tests failed
      - name: Tests failed — notify
        if: failure()
        run: |
          echo "❌ Tests failed!"
          echo "Triggered by: ${{ github.actor }}"
          echo "Branch: ${{ github.ref_name }}"
```

---

## Line-by-Line Explanation

| Code | Meaning |
|---|---|
| `if: github.event_name == 'pull_request'` | Step runs only when triggered by a PR event |
| `if: github.event_name == 'push'` | Step runs only on a direct push (not PR) |
| `if: always()` | Step runs regardless of prior success/failure |
| `id: tests` | Give a step an ID so other steps can reference it |
| `if: success()` | Runs only if all previous steps succeeded |
| `if: failure()` | Runs only if any previous step failed |

---

## Execution Flow Visualised

### On a push to main (tests pass):

```text
Step: Checkout               → runs ✅
Step: Setup Node.js          → runs ✅
Step: Install dependencies   → runs ✅
Step: Show PR info           → SKIPPED ❌ (event is push, not pull_request)
Step: Show push info         → runs ✅   (event IS push)
Step: Print run context      → runs ✅   (always())
Step: Run tests              → runs ✅   (passes)
Step: Tests passed           → runs ✅   (success())
Step: Tests failed           → SKIPPED ❌ (not failure())
```

### On a push to main (tests fail):

```text
Step: Checkout               → runs ✅
Step: Setup Node.js          → runs ✅
Step: Install dependencies   → runs ✅
Step: Show PR info           → SKIPPED ❌
Step: Show push info         → runs ✅
Step: Print run context      → runs ✅   (always())
Step: Run tests              → runs, then FAILS ❌
Step: Tests passed           → SKIPPED ❌ (not success)
Step: Tests failed           → runs ✅   (failure()!)
```

### On a pull request (tests pass):

```text
Step: Checkout               → runs ✅
Step: Setup Node.js          → runs ✅
Step: Install dependencies   → runs ✅
Step: Show PR info           → runs ✅   (event IS pull_request)
Step: Show push info         → SKIPPED ❌ (event not push)
Step: Print run context      → runs ✅   (always())
Step: Run tests              → runs ✅
Step: Tests passed           → runs ✅
Step: Tests failed           → SKIPPED ❌
```

---

## `if:` on Jobs (Not Just Steps)

`if:` also works at the **job** level:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'   # entire job skipped on non-main
    steps:
      - run: echo "Deploying to production"
```

This is the standard pattern for CD pipelines — we'll use it in Level 17.

---

## `success()` and `failure()` — Important Nuance

```yaml
steps:
  - name: Step A
    run: exit 0         # succeeds

  - name: Step B
    run: exit 1         # fails

  - name: Step C
    if: success()       # checks: did ALL previous steps succeed?
    run: echo "hi"      # SKIPPED — Step B failed
```

`success()` returns `true` only if **all** previous steps succeeded.
One failure anywhere → `success()` is `false` for all subsequent steps.

---

## Key Difference — Skipped vs Failed

This is subtle but important:

```text
FAILED  → step ran, but the command exited with non-zero code
          → job is marked failed
          → shown as ❌ red in GitHub UI

SKIPPED → step did not run because if: was false
          → job continues normally
          → shown as ⊘ grey in GitHub UI
```

A skipped step does **not** cause the job to fail. Only a failed step does.

---

## What I Learned in Level 9

| Concept | What it is |
|---|---|
| `if:` | Conditional on a step or job — controls whether it runs |
| `success()` | True when all prior steps succeeded |
| `failure()` | True when any prior step failed |
| `always()` | Always true — runs regardless of job state |
| `cancelled()` | True when the workflow was cancelled |
| `==`, `!=`, `&&`, `\|\|` | Comparison and logical operators in expressions |
| `contains()`, `startsWith()` | String functions in expressions |
| Skipped vs failed | Skipped = grey/harmless; Failed = red/breaks the job |

---

## 📊 Learning Map

| Concept | Learned | Used In |
|---|---|---|
| Workflow | ✅ | `hello.yml`, `ci.yml`, `contexts.yml` |
| Event | ✅ | `push`, `pull_request`, `workflow_dispatch` |
| Job | ✅ | All jobs |
| Step | ✅ | All steps |
| Runner | ✅ | `ubuntu-latest` |
| Action | ✅ | `checkout`, `setup-node` |
| CI | ✅ | `ci.yml` |
| PR workflow | ✅ | `on: pull_request:` |
| Branch filtering | ✅ | `branches:`, `paths:` |
| Environment variables | ✅ | `env:` — all 3 levels |
| Contexts | ✅ | `github.*`, `runner.*`, `env.*` |
| Expressions & Conditions | ✅ | `if:` in `ci.yml` — all status functions |
| `needs` | ⬜ | Level 10 |
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
| `if:` | Conditional execution | `if: github.ref == 'refs/heads/main'` |
| `success()` | All prior steps passed | `if: success()` |
| `failure()` | Any prior step failed | `if: failure()` |
| `always()` | Always run | `if: always()` |
| `cancelled()` | Workflow was cancelled | `if: cancelled()` |
| `&&` | AND | `if: x && y` |
| `\|\|` | OR | `if: x \|\| y` |
| `!` | NOT | `if: !failure()` |
| `contains()` | String contains check | `contains(github.ref, 'main')` |
| `startsWith()` | String prefix check | `startsWith(github.ref, 'refs/heads/feature')` |

---

## 📚 Official Documentation

- [Expressions](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/evaluate-expressions-in-workflows-and-actions)
- [Workflow syntax — `jobs.<job_id>.if`](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#jobsjob_idif)
- [Status check functions](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/evaluate-expressions-in-workflows-and-actions#status-check-functions)

---

## 🧪 Exercise

Look at this workflow and answer the 3 questions **without running it**:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Step 1
        run: echo "start"

      - name: Step 2
        run: exit 1

      - name: Step 3
        run: echo "after failure"

      - name: Step 4
        if: failure()
        run: echo "on failure"

      - name: Step 5
        if: always()
        run: echo "always"

      - name: Step 6
        if: success()
        run: echo "on success"
```

**Questions:**

1. Which steps **run** and which are **skipped**?
2. Is the job marked ✅ success or ❌ failure at the end?
3. If you remove Step 2's `exit 1` and it runs cleanly instead — what changes?

> ✋ **Write your answers. I'll review.**

---

```text
Progress:        9 / 23
Current Level:   Level 9 — Expressions and Conditions
Concepts Learned: if:, success(), failure(), always(), cancelled(),
                  ==, !=, &&, ||, !, contains(), startsWith(),
                  skipped vs failed
Files Modified:  .github/workflows/ci.yml
Next Concept:    Level 10 — Job Dependencies (needs:)
Exercise:        Predict step execution given an exit 1 failure
```
