# Level 8 — GitHub Contexts

> **Previously Learned:** Workflow · Event · Job · Step · CI · env: at 3 levels · override priority
>
> **This Level:** Access rich metadata about the current run using GitHub Contexts — structured objects available via the `${{ }}` expression syntax.

---

## What Is a Context?

In Level 7 you used shell variables: `$NODE_ENV`
That's a flat string stored in the shell.

A **context** is different — it's a **structured object** that GitHub Actions automatically provides, containing rich metadata about the current run.

```text
Shell variable:   $NODE_ENV           → "test"

Context:          ${{ github.actor }} → "iabhiy28"
                  ${{ github.sha }}   → "4ae93db7f3..."
                  ${{ github.ref }}   → "refs/heads/main"
```

The syntax `${{ }}` is the **GitHub Actions expression syntax**.
Everything inside `${{ }}` is evaluated by GitHub Actions — not by the shell.

---

## The Expression Syntax — `${{ }}`

```yaml
${{ <expression> }}
```

Inside the double curly braces you can write:
- **Context properties:** `github.actor`, `runner.os`
- **Environment variables:** `env.NODE_ENV`
- **Functions:** `contains()`, `startsWith()`, `toJSON()`
- **Operators:** `==`, `!=`, `&&`, `||`, `!`
- **Literals:** `'string'`, `42`, `true`

We'll use all of these in Levels 9 and beyond. For now, focus on contexts.

---

## The 5 Main Contexts

```text
┌──────────────────────────────────────────────────┐
│  github   → current run + event metadata         │
│  env      → your defined env vars                │
│  job      → current job status                   │
│  steps    → outputs from previous steps          │
│  runner   → the runner machine info              │
└──────────────────────────────────────────────────┘
```

---

## Context 1 — `github`

The most important and widely used context. Contains everything about the current workflow run.

| Property | Example Value | Meaning |
|---|---|---|
| `github.actor` | `iabhiy28` | Username that triggered the workflow |
| `github.repository` | `iabhiy28/github-actions-learning-api` | `owner/repo` |
| `github.ref` | `refs/heads/main` | Full git ref |
| `github.ref_name` | `main` | Short branch or tag name |
| `github.sha` | `4ae93db7...` | Full commit SHA |
| `github.event_name` | `push` | Which event triggered this run |
| `github.workflow` | `CI Pipeline` | Workflow display name |
| `github.run_id` | `12345678` | Unique ID for this run |
| `github.run_number` | `42` | How many times this workflow has run total |
| `github.job` | `test` | Current job name |
| `github.workspace` | `/home/runner/work/repo` | Path to the checked-out repo on runner |

**Real uses:**

```yaml
# Deploy only from main
if: github.ref == 'refs/heads/main'

# Show who triggered the run
run: echo "Triggered by ${{ github.actor }}"

# Tag a Docker image with the commit SHA
run: docker build -t myapp:${{ github.sha }} .

# Show run count
run: echo "This is run #${{ github.run_number }}"
```

---

## Context 2 — `runner`

Info about the machine running your job.

| Property | Example Value | Meaning |
|---|---|---|
| `runner.os` | `Linux` | Operating system |
| `runner.arch` | `X64` | CPU architecture |
| `runner.name` | `GitHub Actions 2` | Runner display name |
| `runner.temp` | `/home/runner/work/_temp` | Temporary directory |
| `runner.tool_cache` | `/opt/hostedtoolcache` | Where actions cache tools |

**Real use:**

```yaml
# Behave differently based on OS in a cross-platform job
if: runner.os == 'Linux'
  run: apt-get install something
```

---

## Context 3 — `env`

Access your `env:` defined variables using expression syntax.

```yaml
env:
  NODE_ENV: test
  APP_NAME: my-api

steps:
  - name: Use env context in YAML field
    run: echo "App is ${{ env.APP_NAME }}"

  - name: Use in if:
    if: env.NODE_ENV == 'test'
    run: echo "Running in test mode"
```

**Shell syntax vs. Expression syntax — when to use which:**

```text
$NODE_ENV              → shell syntax, only works inside run: blocks
${{ env.NODE_ENV }}    → expression syntax, works in any YAML field

Inside run: → both work equally
In if:, with:, name: → only ${{ }} works
```

---

## Context 4 — `job`

Available during and after a job runs. Most useful in cleanup or notification steps.

| Property | Example Value | Meaning |
|---|---|---|
| `job.status` | `success` / `failure` / `cancelled` | Current job result |

```yaml
# Send notification based on job result
- name: Notify on failure
  if: job.status == 'failure'
  run: echo "Something went wrong!"
```

---

## Context 5 — `steps`

Access **outputs** from previous steps within the same job. (We'll use this more in Level 9+.)

```yaml
steps:
  - name: Get version
    id: version          # you must give the step an id
    run: echo "value=1.2.3" >> $GITHUB_OUTPUT

  - name: Use version
    run: echo "Version is ${{ steps.version.outputs.value }}"
```

`steps.<step-id>.outputs.<output-name>` — we'll cover this fully in Level 9.

---

## New Concept — `workflow_dispatch`

The new `contexts.yml` uses a trigger you haven't seen yet:

```yaml
on:
  workflow_dispatch:
```

This adds a **"Run workflow"** button in the GitHub Actions UI.
You can trigger the workflow manually — no push required.

```text
GitHub → Actions tab → "Explore Contexts" → Run workflow → Run workflow
```

This is extremely useful for:
- Testing workflows without pushing code
- Manual deployment triggers
- One-off tasks

---

## File Created — `contexts.yml`

```yaml
name: Explore Contexts

on:
  workflow_dispatch:
  push:
    branches: [ "main" ]

jobs:
  print-contexts:
    runs-on: ubuntu-latest

    steps:
      - name: Print github context
        run: |
          echo "=== github context ==="
          echo "actor:        ${{ github.actor }}"
          echo "repository:   ${{ github.repository }}"
          echo "ref:          ${{ github.ref }}"
          echo "ref_name:     ${{ github.ref_name }}"
          echo "sha:          ${{ github.sha }}"
          echo "event_name:   ${{ github.event_name }}"
          echo "workflow:     ${{ github.workflow }}"
          echo "run_id:       ${{ github.run_id }}"
          echo "run_number:   ${{ github.run_number }}"
          echo "job:          ${{ github.job }}"
          echo "workspace:    ${{ github.workspace }}"

      - name: Print runner context
        run: |
          echo "=== runner context ==="
          echo "os:           ${{ runner.os }}"
          echo "arch:         ${{ runner.arch }}"
          echo "name:         ${{ runner.name }}"
          echo "temp:         ${{ runner.temp }}"
          echo "tool_cache:   ${{ runner.tool_cache }}"

      - name: Print env context
        env:
          APP_NAME: github-actions-learning-api
          NODE_ENV: test
        run: |
          echo "=== env context ==="
          echo "APP_NAME:     ${{ env.APP_NAME }}"
          echo "NODE_ENV:     ${{ env.NODE_ENV }}"

      - name: "Running on branch: ${{ github.ref_name }}"
        run: echo "This step name used a context value!"

      - name: Show dynamic info
        run: |
          echo "Run #${{ github.run_number }} of '${{ github.workflow }}'"
          echo "Triggered by: ${{ github.actor }} via ${{ github.event_name }}"
          echo "Commit: ${{ github.sha }}"
```

---

## Line-by-Line Explanation

| Code | Meaning |
|---|---|
| `workflow_dispatch:` | Adds a manual "Run workflow" button in GitHub UI |
| `${{ github.actor }}` | Prints the username that triggered this run |
| `${{ github.ref }}` | Full ref: `refs/heads/main` |
| `${{ github.ref_name }}` | Short branch name: `main` |
| `${{ github.sha }}` | The commit SHA — unique per commit |
| `${{ github.event_name }}` | `push`, `pull_request`, `workflow_dispatch`, etc. |
| `${{ github.run_number }}` | Increments by 1 on every run |
| `${{ runner.os }}` | `Linux`, `Windows`, or `macOS` |
| `${{ env.APP_NAME }}` | Reads `APP_NAME` from the step's env: block |
| `name: "Running on: ${{ github.ref_name }}"` | Context used directly in the step name |

---

## Execution Flow

```text
git push to main
    ↓
contexts.yml triggers (on: push: main)
    ↓
Job: print-contexts starts on ubuntu-latest
    ↓
Step 1: Print github context
  → GitHub evaluates all ${{ github.* }} BEFORE the shell runs
  → Substituted values: actor=iabhiy28, ref=refs/heads/main, etc.
  → Shell prints the results
    ↓
Step 2: Print runner context
  → runner.os=Linux, runner.arch=X64, etc.
    ↓
Step 3: Print env context
  → env.APP_NAME=github-actions-learning-api
    ↓
Step 4: Step name itself contains ${{ github.ref_name }}
  → GitHub substitutes "main" into the step name
  → GitHub UI shows: "Running on branch: main"
    ↓
Step 5: Dynamic info
  → Shows run number, workflow name, actor, event, sha
```

**Important:** GitHub evaluates `${{ }}` expressions **before** passing the string to the shell. The shell never sees `${{ }}` — only the substituted value.

---

## `github.ref` vs `github.ref_name`

A common source of confusion:

```text
github.ref       → refs/heads/main      (full ref format)
github.ref_name  → main                 (short name, easier to use)

For pull requests:
github.ref       → refs/pull/5/merge
github.ref_name  → 5/merge

For tags:
github.ref       → refs/tags/v1.0.0
github.ref_name  → v1.0.0
```

**In conditions, use the full `github.ref`:**
```yaml
if: github.ref == 'refs/heads/main'    # ✅ correct
if: github.ref_name == 'main'          # ✅ also works for branches
```

---

## What I Learned in Level 8

| Concept | What it is |
|---|---|
| Context | Structured object of metadata available during a run |
| `${{ }}` | GitHub Actions expression syntax — evaluated before shell |
| `github` context | Everything about the current run and event |
| `runner` context | Info about the runner machine |
| `env` context | Access to defined env vars via expression syntax |
| `job` context | Current job's status |
| `steps` context | Outputs from previous steps |
| `workflow_dispatch` | Manual trigger button in GitHub UI |
| Evaluation order | `${{ }}` resolved first, then shell receives the result |

---

## 📊 Learning Map

| Concept | Learned | Used In |
|---|---|---|
| Workflow | ✅ | `hello.yml`, `ci.yml`, `contexts.yml` |
| Event | ✅ | `push`, `pull_request`, `workflow_dispatch` |
| Job | ✅ | `test:`, `print-contexts:` |
| Step | ✅ | All steps |
| Runner | ✅ | `ubuntu-latest` |
| Action | ✅ | `checkout@v4`, `setup-node@v4` |
| CI | ✅ | `ci.yml` |
| PR workflow | ✅ | `on: pull_request:` |
| Branch filtering | ✅ | `branches:`, `paths:` |
| Environment variables | ✅ | `env:` — all 3 levels |
| Contexts | ✅ | `github.*`, `runner.*`, `env.*` in `contexts.yml` |
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
| `${{ }}` | Expression syntax — evaluated before shell | `${{ github.actor }}` |
| `github.actor` | Username that triggered the run | `echo ${{ github.actor }}` |
| `github.ref` | Full git ref | `refs/heads/main` |
| `github.ref_name` | Short branch/tag name | `main` |
| `github.sha` | Commit SHA | `abc123...` |
| `github.event_name` | Event that triggered the workflow | `push` |
| `github.run_number` | Incrementing run counter | `42` |
| `runner.os` | Runner operating system | `Linux` |
| `env.VAR` | Access env var in YAML field | `${{ env.NODE_ENV }}` |
| `workflow_dispatch:` | Manual trigger from GitHub UI | `on: workflow_dispatch:` |

---

## 📚 Official Documentation References

- [Contexts](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs)
- [`github` context](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs#github-context)
- [`runner` context](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs#runner-context)
- [Expressions](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/evaluate-expressions-in-workflows-and-actions)
- [`workflow_dispatch` event](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_dispatch)

---

## 🧪 Exercise

Write a single step that prints the following using **only** context expressions:

```text
Workflow:   CI Pipeline
Triggered by: <your GitHub username>
Event:      push
Branch:     main
Commit:     <first 7 chars of SHA>
Run #:      <run number>
```

**Rules:**
- All values must come from `${{ github.* }}` — no hardcoding
- For the 7-char SHA, use the expression function: `${{ github.sha }}`  
  *(Tip: you can pipe the shell output — `echo ${{ github.sha }} | cut -c1-7`)*
- Write it as a valid YAML step

> ✋ **Write the step. Paste it here. I'll review.**

---

```text
Progress:        8 / 23
Current Level:   Level 8 — GitHub Contexts
Concepts Learned: ${{ }} syntax, github/runner/env/job/steps contexts,
                  workflow_dispatch, evaluation order
Files Created:   .github/workflows/contexts.yml
Next Concept:    Level 9 — Expressions and Conditions (if:)
Exercise:        Write a step using only context expressions
```
