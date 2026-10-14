# Level 19 — Concurrency Control & Cancelling Outdated Runs (`concurrency:`)

> **Previously Learned:** Workflow · Event · Job · Step · CI · env: · Contexts · `if:` · `needs:` · Matrix · Cache · Artifacts · Secrets · Permissions · Environments · Reusable Workflows · Composite Actions
>
> **This Level:** Control parallel workflow executions using `concurrency:`. Prevent race conditions, cancel outdated pull request runs automatically, save CI minutes, and serialize production deployments safely.

---

## 1. Review: Solutions to Level 18 Exercises

1. **Required file name for actions:** `action.yml` (or `action.yaml`).
2. **Why `shell:` is required on every run step in composite actions:**  
   Unlike regular workflows which assign a default shell based on the runner OS (e.g. bash on Linux, pwsh on Windows), composite actions are cross-platform components where GitHub **does not assume any default shell**. Every `run:` step must explicitly declare which shell to invoke.
3. **Packaging 3 steps to run within the same runner without a new VM:**  
   Use a **Composite Action** (`using: "composite"`). A reusable workflow always provisions separate jobs with new runner VMs.

---

## 2. The Problems: Wasted CI Minutes & Deployment Race Conditions

### Problem 1: Outdated PR Runs Wasting Minutes
Imagine you open a PR. You push commit 1.
- Workflow starts running (takes 6 minutes).
- 30 seconds later, you spot a typo and push commit 2.
- A **second** workflow run starts for commit 2.
- 1 minute later, you push commit 3.
- Now **3 workflow runs** are executing concurrently for the same PR!

```text
Commit 1 ──► [ Running CI #1 (6 min) ] ──► (Wasted compute minutes!)
Commit 2 ──► [ Running CI #2 (6 min) ] ──► (Wasted compute minutes!)
Commit 3 ──► [ Running CI #3 (6 min) ] ──► Only this one actually matters!
```

You are paying for and waiting on CI runs for code that is already obsolete.

### Problem 2: Deployment Race Conditions
Now imagine this happens on your production branch:
- Commit 1 triggers deployment to production (takes 5 mins).
- Commit 2 triggers deployment to production immediately after.
- Due to network jitter or VM provisioning speed, **Commit 2 finishes in 3 minutes**, but **Commit 1 finishes in 5 minutes**.
- **Disaster:** Commit 1 overwrites the newer Commit 2 on your live server!

---

## 3. The Solution: `concurrency:`

The `concurrency` block creates an exclusive lock for any workflows or jobs that share the same **group name**.

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### Key Properties:
1. **`group`**: A string identifier. Any run with the same group name belongs to the same queue.
2. **`cancel-in-progress`**:
   - `true`: When a new run arrives, **cancel any currently active run** in this group.
   - `false` (default): Do **not** cancel; let the active run finish, and **queue** the new run to execute next (serialization).

---

## 4. The Golden Production Pattern

You want **different behavior** for PR branches vs. the `main` production branch:
- **On feature branches / PRs**: Cancel immediately (`cancel-in-progress: true`) to save minutes.
- **On `main`**: Never cancel midway (`cancel-in-progress: false`); queue deployments sequentially.

You achieve this using dynamic expressions:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}
```

```text
Push to feature branch 'feat-login':
  → github.ref != 'refs/heads/main' is TRUE
  → cancel-in-progress: true  (Cancels older commit runs!)

Push to 'main':
  → github.ref != 'refs/heads/main' is FALSE
  → cancel-in-progress: false (Waits in queue safely!)
```

---

## 5. Workflow-Level vs Job-Level Concurrency

### Workflow-Level (Top of file)
Locks the whole workflow run:
```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

### Job-Level
Only serializes a specific critical job, while letting other jobs (like testing) run concurrently:
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    # Multiple tests can run in parallel without restrictions
    steps:
      - run: npm test

  deploy:
    runs-on: ubuntu-latest
    needs: test
    # Only ONE deployment job can ever touch production at a time!
    concurrency:
      group: production-deploy
      cancel-in-progress: false
    steps:
      - run: ./deploy.sh
```

---

## 6. What Was Updated & Created

1. **Updated [ci.yml](file:///c:/Users/Abhishek%20Yadav/Desktop/LearnGithubActions/.github/workflows/ci.yml)**:
   Added smart concurrency control right below `permissions:`:
   ```yaml
   concurrency:
     group: ${{ github.workflow }}-${{ github.ref }}
     cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}
   ```
2. **Created [concurrency-demo.yml](file:///c:/Users/Abhishek%20Yadav/Desktop/LearnGithubActions/.github/workflows/concurrency-demo.yml)**:
   A manual workflow that simulates a 30-second task with `cancel-in-progress: true`. If triggered twice within 30 seconds, GitHub Actions automatically cancels the earlier run!

---

## 🎯 Level 19 Practice Exercise

1. What are the two primary fields inside a `concurrency:` block?
2. If `cancel-in-progress` is set to `false` and a second run starts in the same concurrency group, what happens to the second run? (Does it fail, get cancelled, or wait in a queue?)
3. Why is setting `cancel-in-progress: true` on production deployment jobs dangerous?
