# Level 4 — Build Real CI

> **Previously Learned:** Workflow · Event · Job · Step · Runner · `run:` · `uses:` · `actions/checkout@v4`
>
> **This Level:** Connect GitHub Actions to our actual Node.js project. Build a real CI pipeline that installs, tests, and validates code automatically on every push.

---

## What Is CI?

Before touching any YAML, understand the concept.

```text
CI = Continuous Integration

Every time a developer pushes code → GitHub automatically:
  1. Checks out the code
  2. Installs dependencies
  3. Runs tests
  4. Reports: PASS ✅ or FAIL ❌

If tests fail → developer is notified immediately
If tests pass → code is safe to review/merge
```

**Why does CI exist?**

Imagine a team of 5 developers pushing code all day.
Without CI:
- Developer A breaks a test at 10am
- Nobody notices until 5pm when the app crashes on someone's machine
- 7 hours of debugging who, what, when

With CI:
- Developer A pushes code at 10am
- GitHub Actions runs tests in 60 seconds
- Developer A gets a red ❌ immediately
- Bug fixed in 5 minutes before it touched anyone else

> **CI's job: catch problems as early as possible, automatically, without human effort.**

---

## The Pipeline We Are Building

```text
git push
    ↓
GitHub detects push event
    ↓
ci.yml workflow is triggered
    ↓
GitHub provisions a fresh Ubuntu VM (ubuntu-latest)
    ↓
Job: "test" starts
    ↓
Step 1 — Checkout repository
         (clone your code onto the runner)
    ↓
Step 2 — Setup Node.js
         (install the correct Node version on the runner)
    ↓
Step 3 — Install dependencies
         (npm ci → reads package-lock.json exactly)
    ↓
Step 4 — Run tests
         (npm test → Jest runs all tests)
    ↓
All tests pass → ✅ Green check on GitHub
Any test fails → ❌ Red X, job stops, you are notified
```

---

## File Created

```text
.github/workflows/ci.yml
```

---

## Complete Code

```yaml
name: CI Pipeline

# Trigger: run this workflow on every push (to any branch)
on:
  push:

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      # Step 1: Check out the repository code onto the runner
      # Without this step, the runner has NO access to your files
      - name: Checkout repository
        uses: actions/checkout@v4

      # Step 2: Install Node.js on the runner
      # The runner starts fresh — Node must be set up explicitly
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      # Step 3: Install project dependencies
      # npm ci reads package-lock.json exactly — fast, reproducible, clean
      - name: Install dependencies
        run: npm ci

      # Step 4: Run the test suite
      # If any test fails → step exits with code 1 → job fails
      - name: Run tests
        run: npm test
```

---

## Line-by-Line Explanation

| Code | Meaning |
|---|---|
| `name: CI Pipeline` | Display name shown on the GitHub Actions tab. You can name it anything. |
| `on:` | Defines what triggers this workflow. |
| `push:` | Trigger on every `git push` to any branch. |
| `jobs:` | Container block for all jobs in this workflow. |
| `test:` | The name of our single job. You pick the name — it can be anything. |
| `runs-on: ubuntu-latest` | Use a fresh Ubuntu Linux VM as the runner for this job. |
| `steps:` | An ordered list of tasks the job will execute, top to bottom. |
| `- name: Checkout repository` | Human-readable name for this step (shown in GitHub Actions logs). |
| `uses: actions/checkout@v4` | Run the official GitHub `checkout` Action — clones your repo onto the runner. |
| `- name: Setup Node.js` | Name of the second step. |
| `uses: actions/setup-node@v4` | Run the official `setup-node` Action — installs Node.js on the runner. |
| `with:` | Passes input parameters to the `uses:` Action. Like function arguments. |
| `node-version: 20` | The specific input for `setup-node` — install Node.js version 20. |
| `- name: Install dependencies` | Name of third step. |
| `run: npm ci` | Shell command — installs dependencies from `package-lock.json`. |
| `- name: Run tests` | Name of fourth step. |
| `run: npm test` | Shell command — runs Jest. If any test fails, step fails, job stops. |

---

## Key Concept 1 — `uses:` vs `run:` (Revisited with Depth)

You saw these in Level 3. Now let's understand them more deeply.

```text
┌─────────────────────────────────────────────────────────┐
│  run:                                                   │
│  ────                                                   │
│  You type raw shell commands                            │
│  Executes directly on the runner's OS                   │
│  Examples:                                              │
│    run: node --version                                  │
│    run: npm ci                                          │
│    run: echo "hello"                                    │
│                                                         │
│  uses:                                                  │
│  ────                                                   │
│  Runs a pre-built, packaged GitHub Action               │
│  Someone else wrote the logic — you just call it        │
│  Examples:                                              │
│    uses: actions/checkout@v4                            │
│    uses: actions/setup-node@v4                          │
└─────────────────────────────────────────────────────────┘
```

**Why use Actions instead of writing commands yourself?**

For example, `actions/checkout@v4` does much more than a simple `git clone`:

```text
Without actions/checkout → you would have to manually:
  ├── Authenticate with GitHub
  ├── Clone the correct SHA
  ├── Handle submodules
  ├── Handle LFS files
  ├── Handle shallow vs deep clones
  └── Configure git credentials

With actions/checkout@v4 → all of the above in one line
```

**Rule of thumb:**
- Use `run:` for simple shell commands you already know
- Use `uses:` for complex tasks where a battle-tested Action already exists

---

## Key Concept 2 — `with:` Block

```yaml
uses: actions/setup-node@v4
with:
  node-version: 20
```

`with:` is how you pass **input parameters** to a `uses:` Action.

Think of it exactly like passing arguments to a function:

```text
# In code:
setupNode({ nodeVersion: 20 })

# In YAML:
uses: actions/setup-node@v4
with:
  node-version: 20
```

Every Action defines its own accepted inputs. You look them up on GitHub Marketplace or the Action's repository.

`actions/setup-node` accepts inputs like:
- `node-version` — which version to install
- `cache` — whether to cache npm packages (we'll learn this in Level 12)
- `registry-url` — for publishing packages

---

## Key Concept 3 — `npm ci` vs `npm install`

This is one of the most important CI-specific concepts. Beginners often use `npm install` in CI — this is a mistake.

| | `npm install` | `npm ci` |
|---|---|---|
| Reads from | `package.json` | `package-lock.json` (exact versions) |
| Updates lockfile? | Yes, can update it | Never — read-only |
| Deletes `node_modules`? | No — updates incrementally | Yes — always fresh install |
| Speed | Slower | Faster (skips resolution) |
| Reproducible? | Not guaranteed | Guaranteed identical |
| Best used for | Local development | CI environments ✅ |

**Why does this matter?**

```text
npm install could install version 4.2.1 today
                      and version 4.2.3 tomorrow (patch released)

npm ci always installs exactly what package-lock.json says
         → same result on every run, on every machine, forever
```

> **Rule: Always use `npm ci` in GitHub Actions.**

---

## Key Concept 4 — Why the Runner Needs Setup

This confuses many beginners. The question is: *"Node.js already exists everywhere, why set it up?"*

Here's the mental model:

```text
GitHub spins up a BRAND NEW Ubuntu VM for every single job.
It's like getting a fresh laptop out of the box.

ubuntu-latest comes pre-installed with:
  ✅ Git
  ✅ Node.js (a default version — might not be the one you need)
  ✅ Python
  ✅ Docker
  ✅ curl, wget, basic tools

But it does NOT have:
  ❌ Your code          → need: actions/checkout
  ❌ Your exact Node version → need: actions/setup-node
  ❌ Your npm packages  → need: npm ci
  ❌ Any of your config → need: you to set it up
```

That's why we explicitly run both `actions/checkout` AND `actions/setup-node`.

And after the job finishes, **the VM is destroyed**. Nothing carries over to the next run.

---

## Key Concept 5 — `actions/setup-node@v4`

**Concept:** `actions/setup-node`

**Used in:** `.github/workflows/ci.yml`

**Relevant code:**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
```

**What it means:**
Installs a specific version of Node.js on the runner VM.

**Why we use it:**
The runner's default Node version may not match your project's requirements. Pinning to a specific version ensures your CI uses exactly the same Node version as your production environment.

**What happens internally:**
1. Action downloads Node 20 binary from official distributions
2. Adds it to the runner's `PATH`
3. Now `node --version` returns `v20.x.x`
4. All subsequent `npm` commands use this version

**When you use it in a real project:**
Every Node.js project's CI pipeline will have this. You pin it to whatever version your app targets (e.g., same as your production server, or the LTS version).

---

## Execution Flow (Detailed)

```text
git push origin main
        ↓
GitHub receives the push
        ↓
GitHub reads .github/workflows/ci.yml
        ↓
on: push: matches → workflow triggered
        ↓
GitHub queues the "test" job
        ↓
GitHub provisions a fresh ubuntu-latest VM
        ↓
┌─── Job: test ────────────────────────────────────────┐
│                                                       │
│  Step 1: Checkout repository                         │
│  → actions/checkout@v4 clones the repo               │
│  → Files now exist at /home/runner/work/              │
│  → src/app.js ✅  tests/app.test.js ✅               │
│                                                       │
│  Step 2: Setup Node.js                               │
│  → actions/setup-node@v4 installs Node 20            │
│  → node --version → v20.x.x ✅                       │
│                                                       │
│  Step 3: Install dependencies                        │
│  → npm ci reads package-lock.json                    │
│  → Downloads: express, jest, supertest               │
│  → node_modules/ created ✅                          │
│                                                       │
│  Step 4: Run tests                                   │
│  → npm test runs Jest                                │
│  → Tests:                                            │
│     ✅ GET / → 200, welcome message                  │
│     ✅ GET /health → 200, healthy + uptime           │
│     ✅ GET /users → 200, array of 3 users            │
│  → All pass → exit code 0 → step SUCCESS             │
│                                                       │
└──────────────────────────────────────────────────────┘
        ↓
Job completes ✅
VM is destroyed (nothing persists to next run)
        ↓
GitHub shows green ✅ on the commit/PR
```

---

## What Happens When a Test Fails?

Understanding failure is just as important as understanding success.

```text
Step 4: Run tests
  → npm test runs Jest
  → One test returns unexpected value
  → Jest exits with code 1 (non-zero = failure)
        ↓
GitHub Actions sees exit code 1
        ↓
Step "Run tests" is marked ❌ FAILED
        ↓
Remaining steps are SKIPPED
        ↓
Job is marked ❌ FAILED
        ↓
Workflow is marked ❌ FAILED
        ↓
GitHub shows red ❌ on the commit
Developer receives notification
```

This is the entire point of CI — catch the failure here, not in production.

---

## What I Learned in Level 4

| Concept | What it is |
|---|---|
| **CI (Continuous Integration)** | Automatically test code on every push — catch bugs immediately |
| **`actions/setup-node@v4`** | Official Action that installs a specific Node.js version on the runner |
| **`with:`** | How you pass input parameters to a `uses:` Action |
| **`npm ci`** | CI-safe dependency install — reads `package-lock.json` exactly, always reproducible |
| **`npm test`** | Runs the test suite — failure here fails the job |
| **Runner lifecycle** | Fresh VM for each job, everything destroyed after |
| **Action vs command** | `uses:` for packaged Actions, `run:` for raw shell commands |

---

## 📊 Learning Map

| Concept | Learned | Used In |
|---|---|---|
| Workflow | ✅ | `hello.yml`, `ci.yml` |
| Event | ✅ | `on: push:` |
| Job | ✅ | `test:` in `ci.yml` |
| Step | ✅ | All 4 steps in `ci.yml` |
| Runner | ✅ | `runs-on: ubuntu-latest` |
| Action | ✅ | `checkout@v4`, `setup-node@v4` |
| `checkout` | ✅ | `ci.yml` Step 1 |
| `setup-node` | ✅ | `ci.yml` Step 2 |
| CI | ✅ | `ci.yml` — full pipeline |
| PR workflow | ⬜ | Level 5 |
| Branch filtering | ⬜ | Level 6 |
| Environment variables | ⬜ | Level 7 |
| Contexts | ⬜ | Level 8 |
| Expressions | ⬜ | Level 9 |
| Conditions | ⬜ | Level 9 |
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

## 🔧 GitHub Actions Syntax Reference (Updated)

| Keyword | Purpose | Example |
|---|---|---|
| `name:` | Display name of workflow/job/step | `name: CI Pipeline` |
| `on:` | What event triggers the workflow | `on: push:` |
| `jobs:` | Container for all jobs | `jobs:` |
| `runs-on:` | Which runner/OS to use | `runs-on: ubuntu-latest` |
| `steps:` | Ordered list of tasks in a job | `steps:` |
| `uses:` | Run a pre-built Action | `uses: actions/checkout@v4` |
| `run:` | Execute a shell command | `run: npm ci` |
| `with:` | Pass inputs to a `uses:` Action | `with: node-version: 20` |

---

## 📚 Official Documentation References

- [GitHub Actions — Quickstart](https://docs.github.com/en/actions/quickstart)
- [actions/checkout](https://github.com/actions/checkout)
- [actions/setup-node](https://github.com/actions/setup-node)
- [Workflow syntax: `jobs.<job_id>.steps`](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#jobsjob_idsteps)
- [npm ci documentation](https://docs.npmjs.com/cli/v10/commands/npm-ci)

---

## 🧪 Exercise — Your Turn

The current `ci.yml` runs 4 steps: checkout → setup Node → install → test.

**Your task:** Add **2 new steps** between "Install dependencies" and "Run tests":

1. A step that prints the **Node.js version** currently active on the runner
2. A step that prints the **list of files** in the project root to confirm checkout worked correctly

**Rules:**
- Both are simple `run:` steps — no `uses:` needed
- Think: what shell commands would do each thing?
- Write the YAML for these 2 steps

> ✋ **Try it yourself first. Paste your YAML here and I'll review it.**

---

```text
Progress:        4 / 23
Current Level:   Level 4 — Real CI Pipeline
Concepts Learned: Workflow, Event, Job, Step, Runner,
                  Action (checkout, setup-node), CI,
                  npm ci, with:, runner lifecycle
Files Created:   .github/workflows/ci.yml
Next Concept:    Level 5 — Pull Request CI
Exercise:        Add Node version check + file listing steps to ci.yml
```
