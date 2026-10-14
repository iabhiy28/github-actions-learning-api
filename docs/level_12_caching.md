# Level 12 — Dependency Caching

> **Previously Learned:** Workflow · Event · Job · Step · CI · env: · Contexts · `if:` · `needs:` · Matrix
>
> **This Level:** Speed up CI by caching `node_modules`. Understand cache hits, cache misses, cache keys, and `hashFiles()`.

---

## Why Caching Exists

Every job starts on a **fresh VM**. No files from the previous run survive.

```text
Every run without caching:

  npm ci → Download express     (~150ms)
         → Download jest        (~200ms)
         → Download supertest   (~180ms)
         → ... 200+ packages
         Total: ~30–60 seconds per job

  With matrix (3 Node versions):
    60s × 3 jobs = 180 seconds just installing deps

  With caching:
  Run #1 → cache MISS → installs normally → stores cache → 30s
  Run #2 → cache HIT  → restores instantly                → 3s ✅
```

On a busy repository with 20 pushes per day, caching saves enormous amounts of time and GitHub Actions minutes.

---

## How the Cache Works — Conceptually

```text
┌──────────────────────────────────────────────────────────────┐
│ CACHE MISS (first run, or package-lock.json changed)         │
│                                                              │
│  GitHub checks storage → nothing found for this key         │
│      ↓                                                       │
│  npm ci runs → downloads all packages (~30s)                 │
│      ↓                                                       │
│  GitHub stores ~/.npm in cache                               │
│  Key: "node-20-Linux-{hash of package-lock.json}"            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ CACHE HIT (same package-lock.json as before)                 │
│                                                              │
│  GitHub checks storage → found! Key matches                  │
│      ↓                                                       │
│  Restores ~/.npm from cache (~3s)                            │
│      ↓                                                       │
│  npm ci reads from local cache → no network download         │
│  npm ci still verifies integrity, just doesn't download      │
│  Total time: ~3s instead of ~30s ✅                          │
└──────────────────────────────────────────────────────────────┘
```

---

## The Cache Key

A **cache key** is the unique identifier for a specific cached snapshot.

```text
Key format used by setup-node:
  "node-Linux-20-{sha256 of package-lock.json}"

Why each component matters:
  node         → prefix, identifies this as a Node cache
  Linux        → OS matters (Windows/Linux binaries differ)
  20           → Node version matters (different ABIs)
  {sha256}     → package-lock.json hash — changes when deps change
```

```text
package-lock.json unchanged → same hash → same key → CACHE HIT  ✅
package-lock.json changed   → new hash  → new key  → CACHE MISS ❌ → fresh install
```

This guarantees: you never get stale dependencies.

---

## `hashFiles()` — The Key Function

```yaml
key: node-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
```

`hashFiles()` is a built-in GitHub Actions expression function:
- Takes a glob pattern
- Reads all matching files
- Returns a SHA-256 hash of their combined contents

```text
hashFiles('**/package-lock.json') → "abc123def456789..."

Unchanged package-lock → same hash → cache reused
Added `lodash` to package.json + ran npm install → package-lock updated → new hash → cache invalidated
```

---

## Two Ways to Cache

### ✅ Method 1 — Built into `actions/setup-node` (Recommended)

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'          # ← one line. Done.
```

`actions/setup-node` automatically:
1. Generates the cache key using `package-lock.json` hash + OS + Node version
2. Restores the cache before `npm ci` runs
3. Saves the cache after `npm ci` completes (only on a miss)

### Method 2 — `actions/cache` directly (Manual, more control)

```yaml
- name: Cache npm packages
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: node-${{ runner.os }}-${{ matrix.node-version }}-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      node-${{ runner.os }}-${{ matrix.node-version }}-
      node-${{ runner.os }}-
```

For our project, Method 1 is sufficient and much cleaner.

---

## `restore-keys:` — Fallback Keys

When the exact key doesn't match, GitHub tries the `restore-keys` prefixes in order:

```yaml
restore-keys: |
  node-Linux-20-        # try any cache for this OS+Node version
  node-Linux-           # try any cache for this OS
```

```text
Exact key:     "node-Linux-20-abc123" → MISS (package-lock changed)
Restore key 1: "node-Linux-20-*"      → HIT  (finds older cache)
               Uses partial match → then npm ci adds only the NEW packages
               Result saved as new exact cache entry
```

A partial cache hit is still faster than a complete cold install.

---

## Complete Code Changes — `ci.yml`

The only change in the file is adding `cache: 'npm'` to each `setup-node` step:

```yaml
# ── test job (matrix) ─────────────────────────────────────────────
- name: "Setup Node.js ${{ matrix.node-version }}"
  uses: actions/setup-node@v4
  with:
    node-version: ${{ matrix.node-version }}
    cache: 'npm'           # ← ADDED (Level 12)

# ── lint job ──────────────────────────────────────────────────────
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'           # ← ADDED (Level 12)

# ── build job ─────────────────────────────────────────────────────
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'           # ← ADDED (Level 12)
```

Three jobs, three `cache: 'npm'` additions. That's the entire change.

---

## Line-by-Line Explanation

| Code | Meaning |
|---|---|
| `cache: 'npm'` | Tells `setup-node` to activate npm caching |
| (implicit) cache key | `node-{os}-{node-version}-{hash(package-lock.json)}` |
| (implicit) cache path | `~/.npm` — npm's global package cache directory |
| (implicit) cache restore | Happens before `npm ci` runs |
| (implicit) cache save | Happens after the job completes (only on cache miss) |

---

## What You See in GitHub Actions Logs

### Cache MISS (first run):

```text
Setup Node.js 20
  ├── Attempting to restore cache...
  ├── Cache not found for: node-Linux-20-abc123
  └── Cache miss — will install from scratch

Install dependencies
  ├── npm ci
  ├── added 312 packages in 28s
  └── ✅ Done

Post Setup Node.js 20 (cleanup)
  └── Saved cache: node-Linux-20-abc123 → ~/.npm
```

### Cache HIT (subsequent runs):

```text
Setup Node.js 20
  ├── Attempting to restore cache...
  ├── Cache found: node-Linux-20-abc123
  └── ✅ Restored ~/.npm from cache (3.1s)

Install dependencies
  ├── npm ci
  ├── (reads from local cache, no downloads)
  └── ✅ Done (2.8s)
```

---

## Cache vs Artifact — The Difference

These two concepts are easy to confuse. Here's the clear distinction:

| | Cache | Artifact |
|---|---|---|
| **Purpose** | Speed up repeated operations | Pass files between jobs or store outputs |
| **Lifetime** | Persists across multiple workflow runs | Expires after 90 days (by default) |
| **Shared across** | Runs of the same workflow | Jobs within a run, or downloaded by users |
| **Example** | `node_modules`, pip packages, Maven jars | Test results, build output, Docker image tarballs |
| **Automatic eviction** | Yes — older caches are deleted automatically | No — expires after retention period |
| **If not found** | Job continues normally (just slower) | Job could fail if it depends on the artifact |
| **Action** | `actions/cache` or built-in | `actions/upload-artifact` / `download-artifact` |

```text
Cache:    "Save time on this run — same work I did last run"
Artifact: "Save output from this run — to use in another job or download later"
```

We will use Artifacts in Level 13.

---

## Cache Storage Limits

GitHub provides:
- **500 MB** per repository (Free plan)
- **10 GB** per repository (paid plans / GitHub Enterprise)
- Caches not accessed in 7 days are automatically deleted
- Oldest caches are evicted when the limit is reached

Your `node_modules` npm cache is typically 50–200 MB — well within limits.

---

## When Cache is NOT Shared

Important: **each cache key is scoped to:**
- The repository
- The branch
- The specific key string

```text
Branch: main     → cache key "node-20-abc123" → its own cache
Branch: feature  → cache key "node-20-abc123" → its own cache

They don't share! Each branch has its own cache.
(This prevents a feature branch's broken deps from affecting main's cache)
```

Actually: feature branches CAN read from the default branch's cache (as a fallback), but they write to their own. The default branch's cache is never overwritten by a feature branch.

---

## Execution Flow (With Cache)

```text
git push to main
    ↓
ci.yml triggered
    ↓
Test (Node 20) job starts:
  1. Checkout ✅
  2. Setup Node.js 20 + cache: npm
     → Check cache: "node-Linux-20-{hash}"
     → HIT ✅ → Restore ~/.npm (3s)
  3. npm ci → reads from restored cache (3s instead of 30s)
  4. Tests run ✅

Test (Node 22) job starts:
  → Check cache: "node-Linux-22-{hash}" → separate cache per version
  → ...

Test (Node 24) job starts:
  → Check cache: "node-Linux-24-{hash}" → separate cache per version
  → ...

Total time saved: ~80s on a 3-version matrix run
```

---

## What I Learned in Level 12

| Concept | What it is |
|---|---|
| Cache miss | No cache exists — npm ci downloads everything |
| Cache hit | Cache found — restored instantly |
| Cache key | Unique string identifying a cache snapshot |
| `hashFiles()` | Function that generates SHA-256 of file contents |
| `cache: 'npm'` | Built-in caching shortcut in `actions/setup-node` |
| `restore-keys:` | Fallback key prefixes for partial cache hits |
| Cache vs Artifact | Cache = speed; Artifact = pass files or store output |
| Cache scope | Branch-specific — feature branches don't overwrite main's cache |

---

## 📊 Learning Map

| Concept | Learned | Used In |
|---|---|---|
| Workflow | ✅ | `hello.yml`, `ci.yml`, `contexts.yml` |
| Event | ✅ | `push`, `pull_request`, `workflow_dispatch` |
| Job | ✅ | `test`, `lint`, `build` |
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
| Matrix | ✅ | `strategy.matrix` — Node 20/22/24 |
| Cache | ✅ | `cache: 'npm'` on all 3 jobs |
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
| `cache: 'npm'` | Enable npm caching in setup-node | `cache: 'npm'` |
| `hashFiles()` | Generate file content hash | `hashFiles('**/package-lock.json')` |
| `actions/cache@v4` | Manual cache control Action | `uses: actions/cache@v4` |
| `path:` | What to cache | `path: ~/.npm` |
| `key:` | Unique cache identifier | `key: node-${{ runner.os }}-${{ hashFiles(...) }}` |
| `restore-keys:` | Fallback key prefixes | `restore-keys: node-${{ runner.os }}-` |

---

## 📚 Official Documentation

- [Caching dependencies to speed up workflows](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/caching-dependencies-to-speed-up-workflows)
- [`actions/cache`](https://github.com/actions/cache)
- [`actions/setup-node` — caching](https://github.com/actions/setup-node#caching-global-packages-data)
- [Cache limits and eviction](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/caching-dependencies-to-speed-up-workflows#usage-limits-and-eviction-policy)

---

## 🧪 Exercise

Look at these two scenarios and answer:

**Scenario A:**
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'
```
A developer adds a new package `axios` and runs `npm install`.
On the next CI run — is the cache a **HIT** or **MISS**? Why?

**Scenario B:**
```yaml
key: node-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
restore-keys: |
  node-${{ runner.os }}-
```
`package-lock.json` changed. What happens in order:
1. GitHub checks the exact key → ?
2. GitHub checks the restore-key → ?
3. What does npm ci do with the partial cache?

> ✋ **Write your answers. I'll review.**

---

```text
Progress:        12 / 23
Current Level:   Level 12 — Dependency Caching
Concepts Learned: cache hit/miss, cache key, hashFiles(), cache: 'npm',
                  restore-keys, cache vs artifact, cache scope
Files Modified:  .github/workflows/ci.yml
Next Concept:    Level 13 — Artifacts
Exercise:        Predict cache hit/miss for two scenarios
```
