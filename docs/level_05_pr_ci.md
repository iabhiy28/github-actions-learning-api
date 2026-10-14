# Level 5 — Pull Request CI

> **Previously Learned:** Workflow · Event · Job · Step · Runner · `run:` · `uses:` · CI · `npm ci`
>
> **This Level:** Run CI on Pull Requests. Understand `push` vs `pull_request`. See GitHub status checks. Learn branch protection concepts.

---

## Why Run CI on Pull Requests?

Right now CI runs on `push`. That catches issues after code lands on a branch.

But the real danger is code merging into `main`.

```text
Scenario without PR CI:

Developer creates: feature/new-endpoint
Pushes broken code
    ↓
CI on push → tests fail ❌
Developer ignores it
    ↓
Developer opens PR to merge into main
    ↓
Reviewer reads code visually → "looks fine"
    ↓
Clicks Merge ✅
    ↓
Broken code is now on main ❌
Production is affected
```

```text
Scenario with PR CI:

Developer opens PR to merge feature → main
    ↓
GitHub Actions runs CI on the PR automatically
    ↓
Tests fail ❌
    ↓
GitHub blocks the Merge button (branch protection)
    ↓
Developer must fix the code first
    ↓
Tests pass ✅
    ↓
Merge is allowed
    ↓
main stays clean ✅
```

> **The rule: No broken code should ever reach `main`. PR CI enforces this.**

---

## File Modified

`.github/workflows/ci.yml` — only the `on:` block changed

---

## Complete Code (Updated)

```yaml
name: CI Pipeline

# Trigger: run on every push AND on every pull request
on:
  push:
  pull_request:

jobs:
  test:
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

      - name: Node version
        run: node --version

      - name: List files
        run: ls -a

      - name: Run tests
        run: npm test
```

Only **2 lines changed** from Level 4 — but the behavior is now completely different.

---

## Line-by-Line Explanation

| Code | Meaning |
|---|---|
| `on:` | Defines what triggers this workflow |
| `push:` | Trigger on every `git push` to any branch |
| `pull_request:` | ALSO trigger on every Pull Request event |

That's it. Two events. The rest of the workflow stays identical.

---

## Key Concept 1 — `push` vs `pull_request`

```text
┌─────────────────────────────────────────────────────────┐
│  on: push:                                              │
│  ──────────                                             │
│  Fires when: git push runs                              │
│  Runs on: the branch that received the push             │
│  Tests: current state of the branch                     │
│  Question: "Did this push break the branch?"            │
│                                                         │
│  on: pull_request:                                      │
│  ──────────────────                                     │
│  Fires when: PR opened, updated, or synced              │
│  Runs on: a MERGE COMMIT (simulated future state)       │
│  Tests: what the code looks like AFTER merging          │
│  Question: "Will this PR break main if merged?"         │
└─────────────────────────────────────────────────────────┘
```

**The critical difference:**

`pull_request` does NOT run on your branch's current code.
It runs on a **temporary merge commit** that GitHub creates behind the scenes:

```text
main: A → B → C
                 \
feature:          D → E   ← your PR branch

GitHub creates a temporary commit:
merge commit = C + E combined

pull_request CI runs on this merge commit
So it tests: "If we merge E into C, do tests pass?"
```

This means CI can catch merge conflicts and integration bugs that don't exist on either branch alone.

---

## Key Concept 2 — `pull_request` Activity Types

By default, `pull_request:` fires on these activities:

| Activity | When it fires |
|---|---|
| `opened` | PR is first created |
| `synchronize` | New commits are pushed to the PR branch |
| `reopened` | A closed PR is reopened |

So every time you push new commits to a PR branch → CI runs again automatically.

You can be specific using `types:` (we won't need this yet, but good to know):

```yaml
on:
  pull_request:
    types: [opened, synchronize]
```

---

## Key Concept 3 — GitHub Status Checks

When a workflow runs on a PR, GitHub shows the result directly on the PR page:

```text
Pull Request: "feature/new-endpoint" → main

Checks:
  ✅  CI Pipeline / test    (GitHub Actions result)
  
  [ Merge pull request ] ← button is active
```

If tests fail:

```text
Pull Request: "feature/new-endpoint" → main

Checks:
  ❌  CI Pipeline / test    (tests failed)

  ⚠ Some checks were not successful
  [ Merge pull request ] ← button still visible, but...
```

With **Branch Protection Rules** (covered below), you can make that button completely disabled until CI passes.

---

## Key Concept 4 — Branch Protection (Concept)

Branch Protection is a **GitHub repository setting** (not a workflow setting). It lets you say:

```text
"No one can merge into main unless these conditions are met:"
  ✅ CI must pass
  ✅ At least 1 reviewer must approve
  ✅ Branch must be up to date with main
```

```text
How to enable (GitHub UI):
  Repository → Settings → Branches → Add rule
  Branch name pattern: main
  ✅ Require status checks to pass before merging
       → Select: CI Pipeline / test
  ✅ Require branches to be up to date before merging
```

You haven't enabled this yet, but now you understand what it does and why it exists.

> **Branch Protection + PR CI = the standard way to protect the main branch in any professional project.**

---

## The Full PR Workflow Execution Flow

```text
git checkout -b feature/test-change     ← create new branch
(make changes to the code)
git push origin feature/test-change     ← push the branch
    ↓
GitHub: "A new branch was pushed"
    ↓
on: push: fires → CI runs on feature branch
    ↓
Developer opens a Pull Request:
  feature/test-change → main
    ↓
on: pull_request: fires → CI runs on the MERGE COMMIT
    ↓
GitHub creates a temporary merge of:
  main's current state + feature branch changes
    ↓
Runner spins up (ubuntu-latest)
    ↓
Step 1: Checkout (the merge commit)
Step 2: Setup Node.js
Step 3: npm ci
Step 4: node --version
Step 5: ls -a
Step 6: npm test
    ↓
All tests pass → ✅ green check on the PR
    ↓
Reviewer approves → Merge button active
    ↓
Merge into main
    ↓
on: push: fires again on main → CI runs once more to confirm
```

---

## What the Two Events Cover Together

```text
push:          → Catches issues on any branch after a push
pull_request:  → Catches issues before code reaches main

Together they form a safety net:

  feature branch ──[push CI]──→ PR ──[PR CI]──→ main ──[push CI]──→
                    catches           catches        confirms
                    branch bugs       merge bugs     main is clean
```

---

## Practical Exercise — Create a Branch & Open a PR

Let's see this in action. Here are the steps to try:

**Step 1 — Create a branch:**
```bash
git checkout -b feature/test-change
```

**Step 2 — Make a small harmless change:**
```bash
# Open src/app.js and add a comment anywhere, e.g.:
# // test change for Level 5
```

**Step 3 — Commit and push the branch:**
```bash
git add .
git commit -m "level 5: test PR CI"
git push origin feature/test-change
```

**Step 4 — Open a Pull Request on GitHub:**
```text
GitHub → your repo → "Compare & pull request"
Base: main   ←   Compare: feature/test-change
Click "Create pull request"
```

**Step 5 — Watch GitHub Actions:**
```text
On the PR page, scroll to the bottom
You'll see: "CI Pipeline / test — In progress..."
Wait 60 seconds → ✅ or ❌
```

This is PR CI working in real time.

---

## What I Learned in Level 5

| Concept | What it is |
|---|---|
| `on: pull_request:` | Triggers workflow when a PR is opened/updated |
| `push` vs `pull_request` | push = after code lands; pull_request = before code merges |
| Merge commit | PR CI runs on a simulated merged state, not just your branch |
| Status checks | GitHub shows CI results directly on the PR |
| Branch protection | Repository setting that blocks merges until CI passes |
| PR workflow | The full flow: branch → push → PR → CI → review → merge |

---

## 📊 Learning Map

| Concept | Learned | Used In |
|---|---|---|
| Workflow | ✅ | `hello.yml`, `ci.yml` |
| Event | ✅ | `on: push:`, `on: pull_request:` |
| Job | ✅ | `test:` in `ci.yml` |
| Step | ✅ | All steps in `ci.yml` |
| Runner | ✅ | `runs-on: ubuntu-latest` |
| Action | ✅ | `checkout@v4`, `setup-node@v4` |
| `checkout` | ✅ | `ci.yml` Step 1 |
| `setup-node` | ✅ | `ci.yml` Step 2 |
| CI | ✅ | `ci.yml` — full pipeline |
| PR workflow | ✅ | `ci.yml` — `on: pull_request:` |
| Branch filtering | ⬜ | Level 6 |
| Environment variables | ⬜ | Level 7 |
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
| `name:` | Display name of workflow | `name: CI Pipeline` |
| `on:` | What triggers the workflow | `on:` |
| `push:` | Trigger on git push | `push:` |
| `pull_request:` | Trigger on PR events | `pull_request:` |
| `jobs:` | Container for all jobs | `jobs:` |
| `runs-on:` | Runner/OS to use | `runs-on: ubuntu-latest` |
| `steps:` | Ordered task list | `steps:` |
| `uses:` | Run a pre-built Action | `uses: actions/checkout@v4` |
| `run:` | Execute a shell command | `run: npm ci` |
| `with:` | Inputs for a `uses:` Action | `with: node-version: 20` |

---

## 📚 Official Documentation References

- [Events that trigger workflows](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows)
- [`pull_request` event](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#pull_request)
- [About branch protection rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [About status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)

---

## 🧪 Exercise

The current `ci.yml` triggers on every push to **every** branch and every PR to **every** target branch.

In a real project you often only want:
- CI to run on pushes to `main`
- PR CI to run only when the target branch is `main`

**Your task:** Modify the `on:` block in `ci.yml` so that:
1. `push` only triggers on the `main` branch
2. `pull_request` only triggers when merging **into** `main`

> ✋ **Write the YAML. Paste it here. I'll review it.**
>
> Hint: both events support a `branches:` filter underneath them.

---

```text
Progress:        5 / 23
Current Level:   Level 5 — Pull Request CI
Concepts Learned: pull_request event, push vs pull_request,
                  merge commit, status checks, branch protection
Files Modified:  .github/workflows/ci.yml (on: block)
Next Concept:    Level 6 — Branch Filtering (branches:, paths:, paths-ignore:)
Exercise:        Restrict push and pull_request to main branch only
```
