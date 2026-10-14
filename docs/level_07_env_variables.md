# Level 7 — Environment Variables

> **Previously Learned:** Workflow · Event · Job · Step · CI · PR workflow · Branch filtering
>
> **This Level:** Define and use environment variables at three scopes — workflow, job, and step. Understand which value wins when the same name is defined at multiple levels.

---

## What Is an Environment Variable?

An environment variable is a **named key-value pair stored in the shell's environment** that any command, script, or program running in that shell can read.

```text
Name:  NODE_ENV
Value: test

In bash:        echo $NODE_ENV        → test
In Node.js:     process.env.NODE_ENV  → test
In Python:      os.environ["NODE_ENV"]  → test
```

You already use them daily:
- `PATH` — where the shell looks for programs
- `HOME` — your home directory
- `USER` — current user

GitHub Actions runs steps inside a shell — so standard environment variable rules apply.

---

## Why Use Them in Workflows?

```text
Without env vars:
  run: NODE_ENV=test npm test
  run: NODE_ENV=test node src/check.js
  run: NODE_ENV=test npm run lint
  → Same value repeated 3 times. Change once? Fix 3 places.

With env vars:
  env:
    NODE_ENV: test         ← defined once, at the top

  run: npm test            ← NODE_ENV automatically available
  run: node src/check.js   ← NODE_ENV automatically available
  run: npm run lint        ← NODE_ENV automatically available
```

Environment variables:
1. Eliminate hardcoded repetition
2. Separate configuration from logic
3. Make workflows easier to update and read

---

## The 3 Levels of `env:`

GitHub Actions has three scopes for defining environment variables:

```text
┌──────────────────────────────────────────────────────────┐
│  WORKFLOW LEVEL:  env:                                   │
│  Scope: ALL jobs + ALL steps in the entire workflow      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  JOB LEVEL:  env:                                  │  │
│  │  Scope: ALL steps inside this specific job         │  │
│  │                                                    │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  STEP LEVEL:  env:                           │  │  │
│  │  │  Scope: ONLY this single step                │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Priority — Which Value Wins?

When the same variable name is defined at multiple levels:

```text
Step level  ──overrides──>  Job level  ──overrides──>  Workflow level
(most specific)                                          (least specific)
     WINS                                                  (default)
```

**Example to understand this clearly:**

```yaml
# Workflow level (default)
env:
  COLOR: blue

jobs:
  demo:
    # Job level (overrides workflow level for this job)
    env:
      COLOR: green

    steps:
      - name: Step A
        run: echo $COLOR        # → green  (job level wins)

      - name: Step B
        env:
          COLOR: red            # Step level overrides job level
        run: echo $COLOR        # → red   (step level wins)

      - name: Step C
        run: echo $COLOR        # → green  (back to job level)
                                # Step B's override was ONLY for Step B
```

**Key insight:** A step-level `env:` override is **temporary** — it only affects that one step. The next step returns to the job-level value.

---

## Complete Code — `ci.yml`

```yaml
name: CI Pipeline

on:
  push:
    branches: [ "main" ]
    paths:
      - "src/**"
      - "tests/**"
      - "package.json"
      - "package-lock.json"
  pull_request:
    branches: [ "main" ]
    paths:
      - "src/**"
      - "tests/**"
      - "package.json"
      - "package-lock.json"

# ── WORKFLOW-LEVEL env ─────────────────────────────────────────────
# Available to ALL jobs and ALL steps in this workflow
env:
  NODE_ENV: test
  APP_NAME: github-actions-learning-api

jobs:
  test:
    runs-on: ubuntu-latest

    # ── JOB-LEVEL env ───────────────────────────────────────────────
    # Available to ALL steps in this job only
    env:
      LOG_LEVEL: debug
      WORKING_DIR: .

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Node version
        run: node --version

      - name: List files
        run: ls -a

      - name: Print environment info
        run: |
          echo "=== Workflow-level vars ==="
          echo "NODE_ENV:    $NODE_ENV"
          echo "APP_NAME:    $APP_NAME"
          echo ""
          echo "=== Job-level vars ==="
          echo "LOG_LEVEL:   $LOG_LEVEL"
          echo "WORKING_DIR: $WORKING_DIR"
          echo ""
          echo "=== Runner built-in vars ==="
          echo "CI:          $CI"
          echo "RUNNER_OS:   $RUNNER_OS"

      - name: Run tests
        # ── STEP-LEVEL env ────────────────────────────────────────────
        # Only visible inside THIS step — gone after this step ends
        env:
          TEST_REPORTER: verbose
        run: |
          echo "Reporter: $TEST_REPORTER"
          echo "NODE_ENV is still: $NODE_ENV"
          npm test
```

---

## Line-by-Line Explanation

| Code | Meaning |
|---|---|
| `env:` (top level) | Workflow-level variables — all jobs and steps can read these |
| `NODE_ENV: test` | Key: `NODE_ENV`, Value: `test`. Sets Node.js environment to "test" |
| `APP_NAME: github-actions-learning-api` | Workflow-level config for the app name |
| `env:` (under `test:` job) | Job-level variables — all steps in this job can read these |
| `LOG_LEVEL: debug` | Tells the app to log verbosely inside this CI job |
| `env:` (under a step) | Step-level variable — ONLY this step can read it |
| `TEST_REPORTER: verbose` | Only visible inside the "Run tests" step |

---

## Key Concept — Built-in Runner Variables

GitHub Actions automatically injects many variables into every job. You do NOT define these — they just exist:

| Variable | Value | Meaning |
|---|---|---|
| `CI` | `true` | Always true in GitHub Actions — code can detect CI |
| `GITHUB_WORKFLOW` | `CI Pipeline` | Name of the running workflow |
| `GITHUB_RUN_ID` | `12345678` | Unique ID for this run |
| `GITHUB_SHA` | `abc123...` | The commit SHA that triggered the workflow |
| `GITHUB_REF` | `refs/heads/main` | The full git ref |
| `GITHUB_ACTOR` | `iabhiy28` | GitHub username that triggered the workflow |
| `GITHUB_REPOSITORY` | `iabhiy28/repo` | `owner/repo` format |
| `RUNNER_OS` | `Linux` | Operating system of the runner |
| `RUNNER_ARCH` | `X64` | CPU architecture of the runner |
| `HOME` | `/home/runner` | Runner home directory |

You can print all of them with `env` (no arguments) in a `run:` step.

---

## How to Reference Variables — Two Syntaxes

### 1. Shell syntax — inside `run:` steps

```yaml
run: echo $NODE_ENV
run: echo "$NODE_ENV"
run: echo "${NODE_ENV}"
```

All three are equivalent. Use double quotes when the value might contain spaces.

### 2. Expression syntax — in YAML fields (not `run:`)

```yaml
# Used in: if:, with:, name:, and other YAML keys
if: env.NODE_ENV == 'test'

with:
  some-input: ${{ env.APP_NAME }}
```

We will cover `${{ }}` expressions fully in Level 8.

**Rule of thumb:**
- Inside `run:` → use `$VAR_NAME`
- Everywhere else in YAML → use `${{ env.VAR_NAME }}`

---

## What NODE_ENV Actually Does

Setting `NODE_ENV=test` has a real effect on Node.js and Express:

```text
NODE_ENV=test
  → Jest runs in test mode
  → Express can disable certain features in test
  → Some libraries load test-specific configurations
  → process.env.NODE_ENV === 'test' evaluates to true in code
```

This is why it's set at the **workflow level** — every step that touches Node.js should know it's in a test environment.

---

## The 3-Level Hierarchy — Visual Summary

```text
Workflow env (NODE_ENV=test, APP_NAME=...)
    │
    ├── Job: test
    │     Job env (LOG_LEVEL=debug, WORKING_DIR=.)
    │         │
    │         ├── Step: Checkout        → sees NODE_ENV, APP_NAME, LOG_LEVEL
    │         ├── Step: Setup Node.js   → sees NODE_ENV, APP_NAME, LOG_LEVEL
    │         ├── Step: npm ci          → sees NODE_ENV, APP_NAME, LOG_LEVEL
    │         ├── Step: Print env       → sees NODE_ENV, APP_NAME, LOG_LEVEL
    │         └── Step: Run tests       → sees NODE_ENV, APP_NAME, LOG_LEVEL
    │               Step env (TEST_REPORTER=verbose)
    │               → also sees TEST_REPORTER (only here)
```

---

## Difference: `env:` vs Secrets vs GitHub Variables

You will learn Secrets (Level 14) and GitHub Variables later, but here is the concept early:

| | `env:` in YAML | GitHub Secrets | GitHub Variables |
|---|---|---|---|
| **Visible in YAML file** | ✅ Yes — anyone who reads the file | ❌ No — stored in GitHub UI | ❌ No — stored in GitHub UI |
| **Shown in logs** | ✅ Yes — printed as-is | ❌ No — masked with `***` | ✅ Yes — printed as-is |
| **Use for** | Non-sensitive config | Passwords, tokens, API keys | Non-sensitive config stored outside YAML |
| **Example** | `NODE_ENV: test` | `DATABASE_PASSWORD` | `API_URL` |

> **Rule:** If it's sensitive (password, token, API key) → use Secrets, never `env:`.

---

## Execution Flow

```text
Workflow starts
    ↓
GitHub reads workflow-level env:
  NODE_ENV=test
  APP_NAME=github-actions-learning-api
    ↓
Job "test" starts — merges with job-level env:
  NODE_ENV=test         (from workflow)
  APP_NAME=...          (from workflow)
  LOG_LEVEL=debug       (from job)
  WORKING_DIR=.         (from job)
    ↓
Each step runs with the above vars available
    ↓
Step "Run tests" also adds step-level env:
  TEST_REPORTER=verbose (only for this step)
    ↓
Step completes → TEST_REPORTER disappears
    ↓
Next step has no TEST_REPORTER
```

---

## What I Learned in Level 7

| Concept | What it is |
|---|---|
| Environment variable | Named key-value pair in the shell environment |
| `env:` (workflow) | Available to all jobs and steps in the workflow |
| `env:` (job) | Available to all steps in that specific job |
| `env:` (step) | Available only to that single step |
| Override priority | Step > Job > Workflow — most specific wins |
| Shell syntax | `$VAR_NAME` or `${VAR_NAME}` inside `run:` |
| Expression syntax | `${{ env.VAR_NAME }}` in other YAML fields |
| Built-in vars | `CI`, `GITHUB_SHA`, `RUNNER_OS`, etc. — automatically injected |

---

## 📊 Learning Map

| Concept | Learned | Used In |
|---|---|---|
| Workflow | ✅ | `hello.yml`, `ci.yml` |
| Event | ✅ | `push`, `pull_request` |
| Job | ✅ | `test:` in `ci.yml` |
| Step | ✅ | All steps in `ci.yml` |
| Runner | ✅ | `runs-on: ubuntu-latest` |
| Action | ✅ | `checkout@v4`, `setup-node@v4` |
| `checkout` | ✅ | `ci.yml` |
| `setup-node` | ✅ | `ci.yml` |
| CI | ✅ | `ci.yml` |
| PR workflow | ✅ | `on: pull_request:` |
| Branch filtering | ✅ | `branches:`, `paths:` |
| Environment variables | ✅ | `env:` — all 3 levels in `ci.yml` |
| Contexts | ⬜ | Level 8 |
| Expressions & Conditions | ⬜ | Level 9 |
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
| `env:` (workflow) | Workflow-wide variables | `env: NODE_ENV: test` |
| `env:` (job) | Job-wide variables | `env: LOG_LEVEL: debug` |
| `env:` (step) | Step-only variables | `env: TOKEN: abc` |
| `$VAR` | Reference in `run:` | `echo $NODE_ENV` |
| `${{ env.VAR }}` | Reference in YAML fields | `if: env.X == 'y'` |
| `name:` | Display name | `name: CI Pipeline` |
| `on:` | Trigger block | `on:` |
| `push:` | Push trigger | `push:` |
| `pull_request:` | PR trigger | `pull_request:` |
| `branches:` | Branch whitelist | `branches: [main]` |
| `paths:` | Path whitelist | `paths: [src/**]` |
| `jobs:` | Jobs container | `jobs:` |
| `runs-on:` | Runner OS | `runs-on: ubuntu-latest` |
| `steps:` | Ordered task list | `steps:` |
| `uses:` | Run a pre-built Action | `uses: actions/checkout@v4` |
| `run:` | Shell command | `run: npm ci` |
| `with:` | Inputs for `uses:` | `with: node-version: 20` |

---

## 📚 Official Documentation References

- [Environment variables in GitHub Actions](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables)
- [Default environment variables](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#default-environment-variables)
- [Workflow syntax — `env:`](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#env)

---

## 🧪 Exercise

Look at this workflow snippet:

```yaml
env:
  DEPLOY_ENV: staging

jobs:
  deploy:
    env:
      DEPLOY_ENV: production
      LOG_LEVEL: info

    steps:
      - name: Step 1
        run: echo "Env is $DEPLOY_ENV, Log is $LOG_LEVEL"

      - name: Step 2
        env:
          DEPLOY_ENV: canary
          EXTRA: hello
        run: |
          echo "Env is $DEPLOY_ENV"
          echo "Log is $LOG_LEVEL"
          echo "Extra is $EXTRA"

      - name: Step 3
        run: |
          echo "Env is $DEPLOY_ENV"
          echo "Extra is $EXTRA"
```

**Answer these 4 questions without running it:**

1. What does Step 1 print for `DEPLOY_ENV`?
2. What does Step 2 print for `DEPLOY_ENV` and `LOG_LEVEL`?
3. What does Step 3 print for `DEPLOY_ENV`?
4. What does Step 3 print for `EXTRA`?

> ✋ **Write your answers. I'll explain each one.**

---

```text
Progress:        7 / 23
Current Level:   Level 7 — Environment Variables
Concepts Learned: env: at 3 levels, override priority (step > job > workflow),
                  shell syntax vs expression syntax, built-in runner variables
Files Modified:  .github/workflows/ci.yml
Next Concept:    Level 8 — GitHub Contexts (${{ github.ref }}, ${{ github.sha }}, etc.)
Exercise:        Predict output of a multi-level env: workflow
```
