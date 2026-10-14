# Level 13 — Artifacts

> **Previously Learned:** Workflow · Event · Job · Step · CI · env: · Contexts · `if:` · `needs:` · Matrix · Cache
>
> **This Level:** Upload files produced by a job with `actions/upload-artifact`. Download them in another job with `actions/download-artifact`. Pass files across job boundaries.

---

## The Problem Artifacts Solve

Jobs are completely isolated — each runs on its own fresh VM.

```text
build job → creates dist/app.js on VM #1
                                         VM #1 is DESTROYED
deploy job → tries to find dist/app.js on VM #2
             ❌ FILE DOESN'T EXIST — different machine!
```

Without artifacts, **files cannot cross job boundaries**.

```text
With artifacts:

build job → creates dist/ → UPLOADS to GitHub storage
                                  ↓
deploy job → DOWNLOADS from GitHub storage → uses the files ✅
```

---

## Two Actions

| Action | What it does |
|---|---|
| `actions/upload-artifact@v4` | Upload files from runner → GitHub storage |
| `actions/download-artifact@v4` | Download files from GitHub storage → runner |

---

## `actions/upload-artifact`

```yaml
- name: Upload build output
  uses: actions/upload-artifact@v4
  with:
    name: build-output       # identifier — used when downloading
    path: dist/              # what to upload (file, dir, or glob)
    retention-days: 7        # keep for 7 days (default: 90)
```

### Inputs

| Input | Required | Meaning |
|---|---|---|
| `name` | ✅ | Artifact name — used to download it |
| `path` | ✅ | File, directory, or glob to upload |
| `retention-days` | ❌ | 1–90 days (default: 90) |
| `if-no-files-found` | ❌ | `warn` (default), `error`, or `ignore` |

### Path patterns

```yaml
# Upload a single file
path: dist/app.js

# Upload an entire directory
path: dist/

# Upload multiple patterns
path: |
  dist/
  coverage/
  build-info.json

# Upload with glob
path: "**/*.json"
```

---

## `actions/download-artifact`

```yaml
- name: Download build output
  uses: actions/download-artifact@v4
  with:
    name: build-output       # MUST match the upload name exactly
    path: ./release/         # where to place the files on the runner
```

### Inputs

| Input | Required | Meaning |
|---|---|---|
| `name` | ✅ | Must match the artifact name from upload |
| `path` | ❌ | Where to extract (defaults to current directory) |

---

## Complete Code — Updated `ci.yml`

### New in this level:

**Build job** — creates real files, then uploads them:

```yaml
build:
  name: Build
  runs-on: ubuntu-latest
  needs: [test, lint]

  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'npm'
    - run: npm ci

    # Create real build output files
    - name: Build application
      run: |
        mkdir -p dist

        cat > dist/build-info.json << EOF
        {
          "name": "${{ env.APP_NAME }}",
          "version": "1.0.0",
          "commit": "${{ github.sha }}",
          "branch": "${{ github.ref_name }}",
          "actor": "${{ github.actor }}",
          "run_number": ${{ github.run_number }},
          "built_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        }
        EOF

        echo "✅ Build complete"
        ls -la dist/

    # LEVEL 13: Upload dist/ as an artifact
    - name: Upload build artifact
      uses: actions/upload-artifact@v4
      with:
        name: build-output
        path: dist/
        retention-days: 7
```

**Deploy-check job** — downloads and uses the artifact:

```yaml
deploy-check:
  name: Deploy Check (Artifact Demo)
  runs-on: ubuntu-latest
  needs: build            # must wait for build to finish uploading

  steps:
    # LEVEL 13: Download the artifact from the build job
    - name: Download build artifact
      uses: actions/download-artifact@v4
      with:
        name: build-output    # must match the upload name exactly
        path: ./release/

    # Verify it downloaded correctly
    - name: Verify artifact contents
      run: |
        echo "=== Downloaded files ==="
        ls -la ./release/
        echo ""
        echo "=== Build info ==="
        cat ./release/build-info.json

    # Simulate deployment using the artifact
    - name: Simulate deployment
      run: |
        echo "🚀 Deploying ${{ env.APP_NAME }}..."
        echo "Using artifact from run #${{ github.run_number }}"
        echo "✅ Deployment simulation complete"
```

---

## Line-by-Line Explanation

| Code | Meaning |
|---|---|
| `uses: actions/upload-artifact@v4` | Run the official upload Action |
| `name: build-output` | Artifact identifier — must use this exact string to download |
| `path: dist/` | Upload everything inside the `dist/` directory |
| `retention-days: 7` | GitHub stores this for 7 days, then auto-deletes |
| `uses: actions/download-artifact@v4` | Run the official download Action |
| `name: build-output` | Must exactly match the upload name |
| `path: ./release/` | Files are extracted here on the runner |
| `needs: build` | deploy-check must wait for build to upload first |

---

## Execution Flow

```text
git push to main
    ↓
test (Node 20, 22, 24) + lint run in parallel
    ↓ (all pass)
build job starts on VM #1:
  ├── checkout
  ├── npm ci
  ├── mkdir dist/ → write build-info.json
  └── actions/upload-artifact@v4
        → packages dist/ as a zip
        → uploads to GitHub artifact storage
        → VM #1 destroyed
    ↓
deploy-check job starts on VM #2 (brand new, empty):
  ├── actions/download-artifact@v4
  │     → downloads the zip from GitHub storage
  │     → extracts to ./release/
  ├── ls ./release/ → shows build-info.json ✅
  ├── cat ./release/build-info.json → shows the content ✅
  └── echo "Deploying..." ✅
    ↓
Workflow complete ✅
```

---

## What You See in GitHub UI

After the workflow runs, go to:

```text
GitHub → your repo → Actions → [click on a run]
→ Scroll to the bottom of the run summary
→ You'll see:

  Artifacts
  ┌─────────────────────────────────┐
  │  📦 build-output   (download)  │
  │     Expires in 7 days           │
  └─────────────────────────────────┘
```

You can click it to download the ZIP file to your computer.

---

## Artifacts vs Cache — Full Comparison

| | Artifact | Cache |
|---|---|---|
| **Purpose** | Pass files between jobs / store outputs | Speed up repeated work |
| **Created by** | `upload-artifact` | `actions/cache` or `cache: 'npm'` |
| **Accessed by** | `download-artifact` / GitHub UI download | Automatically restored |
| **Lifetime** | 1–90 days (retention-days) | 7 days if unused; evicted by size limit |
| **Shared across** | Jobs in same run, or downloaded manually | Multiple runs of same workflow |
| **If missing** | Job that needs it could fail | Job just runs slower |
| **Visible in UI** | ✅ Yes — downloadable from run summary | ❌ No |
| **Example** | `dist/`, test-results.xml, coverage report | `node_modules`, pip packages |

```text
Key mental model:
  Cache    = "save time on work I repeat across runs"
  Artifact = "save output from this run to use right now or inspect later"
```

---

## Multiple Artifacts — Upload from Matrix Jobs

```yaml
test:
  strategy:
    matrix:
      node-version: [20, 22, 24]
  steps:
    - run: npm test -- --coverage

    - uses: actions/upload-artifact@v4
      with:
        name: coverage-node-${{ matrix.node-version }}  # unique name per matrix job!
        path: coverage/
```

Each matrix job needs a **unique artifact name** — otherwise they overwrite each other.

---

## What I Learned in Level 13

| Concept | What it is |
|---|---|
| Artifact | A file/directory produced by a job, stored by GitHub |
| `upload-artifact` | Upload files from runner to GitHub storage |
| `download-artifact` | Download files from GitHub storage to runner |
| `name:` | Identifier linking upload to download |
| `path:` (upload) | What files to include |
| `path:` (download) | Where to extract on the runner |
| `retention-days` | How long GitHub keeps the artifact |
| Artifact in UI | Visible and downloadable from the run summary |
| Artifact vs Cache | Artifact = output/pass files; Cache = save time |

---

## 📊 Learning Map

| Concept | Learned | Used In |
|---|---|---|
| Workflow | ✅ | `hello.yml`, `ci.yml`, `contexts.yml` |
| Event | ✅ | `push`, `pull_request`, `workflow_dispatch` |
| Job | ✅ | `test`, `lint`, `build`, `deploy-check` |
| Step | ✅ | All steps |
| Runner | ✅ | `ubuntu-latest` |
| Action | ✅ | `checkout`, `setup-node`, `upload-artifact`, `download-artifact` |
| CI | ✅ | `ci.yml` |
| PR workflow | ✅ | `on: pull_request:` |
| Branch filtering | ✅ | `branches:`, `paths:` |
| Environment variables | ✅ | `env:` — all 3 levels |
| Contexts | ✅ | `github.*`, `runner.*`, `env.*` |
| Expressions & Conditions | ✅ | `if:` + status functions |
| `needs` | ✅ | `build needs: [test, lint]`, `deploy-check needs: build` |
| Matrix | ✅ | `strategy.matrix` — Node 20/22/24 |
| Cache | ✅ | `cache: 'npm'` on all jobs |
| Artifacts | ✅ | `upload-artifact` in `build`, `download-artifact` in `deploy-check` |
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
| `actions/upload-artifact@v4` | Upload files to GitHub storage | `uses: actions/upload-artifact@v4` |
| `name:` (artifact) | Artifact identifier for upload/download | `name: build-output` |
| `path:` (upload) | Files to include | `path: dist/` |
| `retention-days:` | Storage duration | `retention-days: 7` |
| `actions/download-artifact@v4` | Download artifact to runner | `uses: actions/download-artifact@v4` |
| `path:` (download) | Where to extract | `path: ./release/` |

---

## 📚 Official Documentation

- [Storing workflow data as artifacts](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/storing-workflow-data-as-artifacts)
- [`actions/upload-artifact`](https://github.com/actions/upload-artifact)
- [`actions/download-artifact`](https://github.com/actions/download-artifact)
- [Artifact retention](https://docs.github.com/en/actions/administering-github-actions/usage-limits-billing-and-administration#artifact-and-log-retention-policy)

---

## 🧪 Exercise

You have a matrix test job running on Node 20, 22, and 24. Each run generates a coverage report in `coverage/lcov.info`.

**Your task:** Write the `upload-artifact` step for the test job so that:
1. Each matrix job uploads its own coverage report
2. The artifact names don't conflict with each other (each must be unique)
3. Reports are kept for 3 days

Then write a **separate job** (`report`) that:
1. Depends on the `test` job
2. Downloads all 3 coverage reports
3. Prints a message for each one

> ✋ **Write the YAML. Paste it here. I'll review.**  
> Hint: you need 3 separate `download-artifact` steps OR loop through names.

---

```text
Progress:        13 / 23
Current Level:   Level 13 — Artifacts
Concepts Learned: upload-artifact, download-artifact, artifact name/path,
                  retention-days, artifacts vs cache, unique names in matrix
Files Modified:  .github/workflows/ci.yml
Next Concept:    Level 14 — Secrets
Exercise:        Write upload/download for matrix coverage reports
```
