# Level 6 — Branch Filtering

> **Previously Learned:** Workflow · Event · Job · Step · Runner · CI · PR workflow · `push` vs `pull_request` · `branches:`
>
> **This Level:** Control exactly when a workflow triggers using `branches`, `branches-ignore`, `paths`, and `paths-ignore`.

---

## Why Filtering Exists

Real repositories have many branches and many kinds of files. Without filters:

```text
Problem 1 — Too many triggers:
  50 developers push to 50 feature branches
  Every push triggers CI (burning runner minutes)
  You only care about main and PRs targeting main

Problem 2 — Irrelevant triggers:
  Developer updates README.md
  CI runs → installs Node → runs all tests → for a doc change
  Waste of time and money

Problem 3 — Wrong scope:
  A "deploy to production" workflow runs on dev branch too
  Should only run on main
```

Filters give you surgical control: **trigger only when it actually matters.**

---

## The 4 Filters

| Filter | Meaning |
|---|---|
| `branches:` | Run ONLY on these branches |
| `branches-ignore:` | Run on ALL branches EXCEPT these |
| `paths:` | Run ONLY when these file paths changed |
| `paths-ignore:` | Run UNLESS only these paths changed |

---

## Filter 1 — `branches:`

**Run only when the push or PR targets specific branches.**

```yaml
on:
  push:
    branches:
      - main
      - develop
```

```text
Push to main      → triggers ✅
Push to develop   → triggers ✅
Push to feature/x → skipped  ❌
```

### Glob Patterns

You can use wildcards:

```yaml
branches:
  - main            # exact match
  - "release/*"     # release/1.0, release/v2  (one level deep)
  - "feature/**"    # feature/login, feature/auth/oauth (any depth)
  - "v[0-9]+"       # v1, v2, v10 (character class)
```

| Pattern | Matches |
|---|---|
| `main` | exactly `main` |
| `release/*` | `release/1.0`, `release/v2` (one slash) |
| `feature/**` | `feature/login`, `feature/auth/login` (any depth) |
| `hotfix-*` | `hotfix-login`, `hotfix-crash` |
| `v[0-9]+` | `v1`, `v2`, `v10` |

---

## Filter 2 — `branches-ignore:`

**Run on ALL branches EXCEPT the ones listed.**

```yaml
on:
  push:
    branches-ignore:
      - "dependabot/**"   # skip Dependabot auto-update branches
      - "renovate/**"     # skip Renovate bot branches
      - "gh-pages"        # skip GitHub Pages branch
```

```text
Push to main             → triggers ✅
Push to feature/login    → triggers ✅
Push to dependabot/x     → skipped  ❌
Push to renovate/y       → skipped  ❌
```

> ⚠️ **Rule:** You CANNOT use `branches:` and `branches-ignore:` together on the same event. Pick one or the other.

---

## Filter 3 — `paths:`

**Run ONLY when specific files or directories changed in the push.**

```yaml
on:
  push:
    branches:
      - main
    paths:
      - "src/**"
      - "tests/**"
      - "package.json"
      - "package-lock.json"
```

```text
Push changes src/app.js            → CI runs ✅  (matches src/**)
Push changes tests/app.test.js     → CI runs ✅  (matches tests/**)
Push changes package.json          → CI runs ✅  (exact match)
Push changes README.md             → CI SKIPPED ❌ (not in paths)
Push changes .gitignore            → CI SKIPPED ❌ (not in paths)
Push changes docs/guide.md         → CI SKIPPED ❌ (not in paths)
```

**Why this matters:**
If only `README.md` changed, running tests is pointless and wasteful. `paths:` prevents that.

### Glob Patterns for Paths

```yaml
paths:
  - "src/**"           # anything inside src/ at any depth
  - "tests/**"         # anything inside tests/ at any depth
  - "**.js"            # any .js file anywhere in the repo
  - "**.ts"            # any .ts file anywhere in the repo
  - "package*.json"    # package.json and package-lock.json
  - "Dockerfile"       # exact file match
  - ".github/**"       # any workflow or action file
```

---

## Filter 4 — `paths-ignore:`

**Run UNLESS only these paths changed. Inverse of `paths:`.**

```yaml
on:
  push:
    paths-ignore:
      - "**.md"         # any markdown file anywhere
      - "docs/**"       # anything in docs/
      - ".gitignore"
      - "LICENSE"
```

```text
Push changes src/app.js            → CI runs ✅
Push changes README.md only        → CI SKIPPED ❌
Push changes docs/guide.md only    → CI SKIPPED ❌
Push changes src/app.js + README   → CI runs ✅ (src/ is not ignored!)
```

**Critical detail:** If a push contains even ONE file that is NOT in `paths-ignore`, the workflow runs. The ignore only applies when ALL changed files are in the ignore list.

> ⚠️ **Rule:** You CANNOT use `paths:` and `paths-ignore:` together on the same event. Pick one.

---

## Combining Filters — AND Logic

You CAN combine `branches:` with `paths:`. Both conditions must be true:

```yaml
on:
  push:
    branches:
      - main
    paths:
      - "src/**"
```

```text
Push to main + src/app.js changed      → runs ✅  (branch ✅ AND path ✅)
Push to main + README.md changed       → skipped ❌ (branch ✅ BUT path ❌)
Push to feature + src/app.js changed   → skipped ❌ (branch ❌)
Push to feature + README.md changed    → skipped ❌ (both ❌)
```

---

## File Updated — `ci.yml`

```yaml
name: CI Pipeline

# Trigger: run on push/PR to main, but ONLY when source code changes
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

---

## Line-by-Line Explanation (New Parts)

| Code | Meaning |
|---|---|
| `paths:` | Only trigger if at least one changed file matches these patterns |
| `- "src/**"` | Any file inside `src/` at any depth |
| `- "tests/**"` | Any file inside `tests/` at any depth |
| `- "package.json"` | Exact file match — dependency definition changed |
| `- "package-lock.json"` | Exact file match — lockfile changed (could affect npm ci) |

---

## When to Use Each Filter — Cheat Sheet

| Situation | Use |
|---|---|
| CI only on `main` and `develop` | `branches: [main, develop]` |
| CI everywhere except bot branches | `branches-ignore: [dependabot/**, renovate/**]` |
| CI only when source files change | `paths: [src/**, tests/**]` |
| CI always EXCEPT for docs changes | `paths-ignore: [**.md, docs/**]` |
| CI only on `main` AND only when `src/` changes | `branches:` + `paths:` together |

---

## Execution Flow

```text
Developer pushes a change to main

GitHub checks the on: block of ci.yml
    ↓
Is the branch "main"?
    → YES → check paths
    → NO  → SKIP, workflow does not run
    ↓
Did any changed file match src/** or tests/** or package*.json?
    → YES → trigger workflow ✅
    → NO  → SKIP, workflow does not run
```

```text
Scenarios:

git push (changes src/app.js → main)
    branch: main ✅   path: src/** ✅   → CI RUNS

git push (changes README.md → main)
    branch: main ✅   path: no match ❌  → CI SKIPPED

git push (changes src/app.js → feature/x)
    branch: no match ❌                → CI SKIPPED
```

---

## What I Learned in Level 6

| Concept | What it is |
|---|---|
| `branches:` | Whitelist — trigger only on listed branches |
| `branches-ignore:` | Blacklist — trigger on all branches except listed |
| `paths:` | Trigger only when listed file patterns changed |
| `paths-ignore:` | Trigger unless ONLY listed paths changed |
| Glob patterns | `*` = one level, `**` = any depth, `[0-9]` = character class |
| AND logic | `branches:` + `paths:` both must match to trigger |

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
| Branch filtering | ✅ | `branches:`, `paths:` in `ci.yml` |
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
| `name:` | Workflow display name | `name: CI Pipeline` |
| `on:` | Trigger definition | `on:` |
| `push:` | Push event trigger | `push:` |
| `pull_request:` | PR event trigger | `pull_request:` |
| `branches:` | Branch whitelist filter | `branches: [main]` |
| `branches-ignore:` | Branch blacklist filter | `branches-ignore: [dependabot/**]` |
| `paths:` | File path whitelist filter | `paths: [src/**, tests/**]` |
| `paths-ignore:` | File path blacklist filter | `paths-ignore: [**.md]` |
| `jobs:` | Container for all jobs | `jobs:` |
| `runs-on:` | Runner OS | `runs-on: ubuntu-latest` |
| `steps:` | Ordered task list | `steps:` |
| `uses:` | Run a pre-built Action | `uses: actions/checkout@v4` |
| `run:` | Execute shell command | `run: npm ci` |
| `with:` | Inputs for a `uses:` Action | `with: node-version: 20` |

---

## 📚 Official Documentation References

- [Workflow syntax — `on.<event>.branches`](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#onpushbranchestagsbranches-ignore)
- [Workflow syntax — `on.<event>.paths`](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#onpushpull_requestpull_request_targetpathspaths-ignore)
- [Filter pattern cheat sheet](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#filter-pattern-cheat-sheet)

---

## 🧪 Exercise

You are working on a monorepo with this structure:

```text
monorepo/
├── backend/
│   ├── src/
│   └── package.json
├── frontend/
│   ├── src/
│   └── package.json
├── docs/
└── README.md
```

You need **two separate workflows**:

1. `backend-ci.yml` — runs ONLY when files inside `backend/` change, on pushes to `main`
2. `frontend-ci.yml` — runs ONLY when files inside `frontend/` change, on PRs targeting `main`

Write just the `on:` block for each workflow. Nothing else needed.

> ✋ **Write both `on:` blocks. Paste them here. I'll review.**

---

```text
Progress:        6 / 23
Current Level:   Level 6 — Branch Filtering
Concepts Learned: branches:, branches-ignore:, paths:, paths-ignore:,
                  glob patterns, AND filter logic
Files Modified:  .github/workflows/ci.yml (paths: filter added)
Next Concept:    Level 7 — Environment Variables
Exercise:        Write on: blocks for a backend and frontend workflow
```
