# Level 15 — Permissions & Security Hardening

> **Previously Learned:** Workflow · Event · Job · Step · CI · env: · Contexts · `if:` · `needs:` · Matrix · Cache · Artifacts · Secrets
>
> **This Level:** Lock down `GITHUB_TOKEN` permissions. Understand the Principle of Least Privilege, permission scopes, workflow vs. job-level overrides, and supply chain security.

---

## The Hidden Vulnerability: The Automatic `GITHUB_TOKEN`

In Level 14, you learned about secrets. But there is one special secret GitHub provides automatically on every single run:

```text
secrets.GITHUB_TOKEN
```

Every job receives this token to communicate with the GitHub API (clone repos, post comments, create releases, read checks, etc.).

### The Problem

Historically, and in many GitHub organization default settings, `GITHUB_TOKEN` is granted **read and write access** to almost everything:
- Push commits to your repository (`contents: write`)
- Create and delete releases (`contents: write`)
- Comment on and close PRs (`pull-requests: write`)
- Comment on and close issues (`issues: write`)
- Publish packages (`packages: write`)

```text
Imagine your CI runs:
  npm test

What if one of your 500 npm dependencies was compromised with malicious code?
  → A malicious postinstall script runs inside your runner.
  → The script reads $GITHUB_TOKEN.
  → The token has write access!
  → The script pushes a backdoor directly to your main branch or publishes a rogue release!
```

This is not theoretical — it is one of the most common real-world **supply chain attack vectors**.

---

## Principle of Least Privilege (PoLP)

> **"A workflow or job should only have the minimum permissions necessary to perform its job, and nothing more."**

- A test or lint job only needs to **read** code: `contents: read`.
- It has **zero reason** to push commits, comment on PRs, or delete branches.

---

## The `permissions:` Key

You control what `GITHUB_TOKEN` is allowed to do using the top-level or job-level `permissions:` block.

### The Golden Rule of Permissions

> ⚠️ **Once you specify ANY permission scope, ALL OTHER unmentioned scopes automatically drop to `none`!**

```yaml
# Only grant read access to code.
# All other scopes (issues, pull-requests, packages, etc.) are set to NONE.
permissions:
  contents: read
```

If you do not specify `permissions:` at all, GitHub falls back to whatever the repo or organization default setting is (which might be overly permissive).

---

## All Common Permission Scopes

| Scope | Values | What It Controls | Common Use Case |
|---|---|---|---|
| `contents` | `read`, `write`, `none` | Git commits, branches, tags, releases | `read`: checkout code<br>`write`: git push, create release |
| `pull-requests` | `read`, `write`, `none` | PR comments, labels, reviewers | `write`: bots posting test coverage / bundle analysis comments |
| `issues` | `read`, `write`, `none` | Issue comments, labels, milestones | `write`: issue triage bots |
| `packages` | `read`, `write`, `none` | GitHub Packages (npm, Docker, etc.) | `write`: publishing container images |
| `id-token` | `write`, `none` | OpenID Connect (OIDC) JWT | `write`: passwordless auth to AWS, Azure, Google Cloud |
| `security-events`| `read`, `write`, `none` | CodeQL / SARIF security uploads | `write`: CodeQL scanning workflows |
| `actions` | `read`, `write`, `none` | GitHub Actions workflow runs | `write`: re-running or cancelling workflows |
| `statuses` | `read`, `write`, `none` | Commit status check checkmarks | `write`: external CI status reporting |

---

## Shorthand Syntaxes

```yaml
# 1. Strip ALL permissions completely (maximum security)
permissions: {}

# 2. Grant read to everything, write to nothing
permissions: read-all

# 3. Grant write to everything (❌ AVOID — dangerous)
permissions: write-all
```

---

## Workflow-Level vs Job-Level Scope

Permissions can be set at **two levels**:

```text
Workflow-Level (Top of file)
  └── Sets the secure baseline for ALL jobs
        │
        ├── Job 1 (Inherits workflow baseline)
        │
        └── Job 2 (Job-level permissions: overrides baseline for this job only)
```

### Example: Principle of Least Privilege in Action

```yaml
name: Deployment Pipeline

# Baseline: read-only access for all jobs
permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    # Inherits contents: read (safe for running tests & npm scripts)
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  release:
    runs-on: ubuntu-latest
    needs: test
    # Elevated ONLY for the release job that actually creates GitHub Releases
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - name: Create GitHub Release
        run: gh release create "v1.0.0" --notes "Production release"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Changes Made in This Level

### 1. Hardened [ci.yml](file:///c:/Users/Abhishek%20Yadav/Desktop/LearnGithubActions/.github/workflows/ci.yml)
Added workflow-level `permissions: contents: read`:

```yaml
# ── LEVEL 15: Least Privilege Permissions ─────────────────────────────────────
# By default, lock down GITHUB_TOKEN to read-only access for repository code.
# Unspecified scopes (issues, pull-requests, packages, etc.) automatically drop to 'none'.
permissions:
  contents: read
```

Now, even if a compromised npm dependency runs during `npm test` or `npm run lint`, its token is completely blocked from modifying repo contents or publishing packages.

### 2. Created [permissions-demo.yml](file:///c:/Users/Abhishek%20Yadav/Desktop/LearnGithubActions/.github/workflows/permissions-demo.yml)
Demonstrates:
- `read-only-job` inheriting `contents: read`
- `elevated-job` overriding permissions with `issues: write` and `pull-requests: write`

---

## Level 15 Practice Exercise

Look at the following scenario:

You have a workflow that:
1. Checks out the code.
2. Runs unit tests.
3. Automatically posts a comment on the Pull Request showing a test summary table.

**Questions:**
1. What permission scope and access level is required for step 1 (checking out code)?
2. What permission scope and access level is required for step 3 (posting a comment on a PR)?
3. If you write:
   ```yaml
   permissions:
     pull-requests: write
   ```
   What will happen when `actions/checkout@v4` tries to clone the private repository in step 1?
