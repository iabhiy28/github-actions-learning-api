# Level 21 — Scheduled & External Triggers (`schedule`, `workflow_dispatch`, `repository_dispatch`)

> **Previously Learned:** Workflow · Event · Job · Step · CI · env: · Contexts · `if:` · `needs:` · Matrix · Cache · Artifacts · Secrets · Permissions · Environments · Reusable Workflows · Composite Actions · Concurrency · Dynamic Matrix
>
> **This Level:** Trigger workflows beyond Git pushes and PRs: automate recurring tasks with `schedule: cron`, customize manual runs with `workflow_dispatch` inputs, and trigger CI via external webhooks using `repository_dispatch`.

---

## 1. Review: Solutions to Level 20 Exercises

1. **Function to parse dynamic JSON matrix string:** `fromJSON()`.
2. **Why `needs:` is strictly required on the consumer job:**  
   The consumer job needs the outputs produced by the generator job. Without `needs:`, both jobs would execute concurrently at startup, and `needs.generate-matrix.outputs.*` would be null.
3. **Can `fromJSON()` accept an array of objects?**  
   **Yes!** If you pass `[{"os": "ubuntu-latest", "version": "20"}]`, inside the matrix steps you access them via `${{ matrix.os }}` and `${{ matrix.version }}`.

---

## 2. Trigger Type 1: `schedule` (Cron Jobs)

Used for nightly builds, automated backups, weekly security audits, or cache warmups.

```yaml
on:
  schedule:
    # Runs at 02:00 UTC every day
    - cron: "0 2 * * *"
```

### 5-Field POSIX Cron Syntax:
```text
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23, in UTC!)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6, 0 = Sunday)
│ │ │ │ │
* * * * *
```

### Critical Rules for `schedule`:
- **All times are UTC**, not your local timezone!
- Scheduled workflows **only execute on the default branch** (usually `main`).
- High-traffic times (e.g. `0 0 * * *`) may experience delays on GitHub runners; pick off-peak minutes like `17 2 * * *`.

---

## 3. Trigger Type 2: `workflow_dispatch` with Typed Inputs

Allows developers to manually click "Run workflow" in GitHub and supply runtime arguments:

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: ["staging", "production"]
      deploy_all:
        type: boolean
        default: false
      custom_tag:
        type: string
        default: "v1.0.0"
```

Accessed inside steps via `${{ inputs.environment }}` or `${{ github.event.inputs.environment }}`.

---

## 4. Trigger Type 3: `repository_dispatch` (External Webhooks)

Allows external systems (e.g. your backend server, CMS publish hook, AWS Lambda) to trigger a workflow via an HTTP POST request to GitHub's REST API:

```yaml
on:
  repository_dispatch:
    types: [deploy-webhook, cms-publish]
```

### Calling the webhook via cURL:
```bash
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/iabhiy28/github-actions-learning-api/dispatches \
  -d '{"event_type": "deploy-webhook", "client_payload": {"version": "2.4.0"}}'
```

Read payload data in the workflow via `${{ github.event.client_payload.version }}`.

---

## 5. What Was Created in This Level

- **[.github/workflows/scheduled-nightly.yml](file:///c:/Users/Abhishek%20Yadav/Desktop/LearnGithubActions/.github/workflows/scheduled-nightly.yml)**:
  A dual-trigger workflow (nightly cron + manual dispatch with choice and boolean inputs).

---

## 🎯 Level 21 Practice Exercise

1. In GitHub Actions cron schedules, what timezone is used?
2. Write a cron expression for a workflow that runs every Monday at 09:00 UTC.
3. If a workflow only defines `on: schedule:`, on which git branch will it execute?
