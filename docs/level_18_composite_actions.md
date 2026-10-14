# Level 18 — Custom Composite Actions (`action.yml`)

> **Previously Learned:** Workflow · Event · Job · Step · CI · env: · Contexts · `if:` · `needs:` · Matrix · Cache · Artifacts · Secrets · Permissions · Environments · Reusable Workflows
>
> **This Level:** Bundle multi-step sequences into your own custom reusable action using `action.yml` and `using: "composite"`. Eliminate step boilerplate, handle inputs and outputs, and master the `shell:` requirement.

---

## 1. Review: Solutions to Level 17 Exercises

1. **Trigger event for reusable workflows:** `on: workflow_call`.
2. **Inheriting all secrets:** `secrets: inherit` under the caller job.
3. **Can a caller job that uses `uses:` also have `steps:`?**  
   **No!** In GitHub Actions, a job must be either an **action/steps job** (contains `steps:`) OR a **reusable workflow call** (contains `uses: .github/workflows/...`), but never both in the same job.

---

## 2. Why Custom Composite Actions?

In almost every project, you find yourself repeating the exact same sequence of steps in every job:

```yaml
# Job 1 (test):
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'
- run: npm ci

# Job 2 (lint):
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'
- run: npm ci

# Job 3 (build):
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'
- run: npm ci
```

Notice that 12–15 lines of boilerplate are copy-pasted across every job!

### The Solution: Composite Action

A **Composite Action** packages multiple steps into a single reusable unit:

```yaml
# In ANY job:
- uses: ./.github/actions/setup-node-app
  with:
    node-version: 20
```

One line replaces the entire boilerplate!

---

## 3. The Anatomy of an `action.yml`

A composite action lives in its own directory (e.g. `.github/actions/setup-node-app/action.yml`):

```yaml
name: "Setup Node Application"
description: "Checkout, install Node with cache, and run npm ci"

# 1. Inputs defined for the action
inputs:
  node-version:
    description: "Node.js version to install"
    required: false
    default: "20"

# 2. Outputs returned by the action
outputs:
  installed-node-version:
    description: "The actual node version installed"
    value: ${{ steps.get-version.outputs.version }}

# 3. The execution engine
runs:
  using: "composite"
  steps:
    - name: Checkout repository code
      uses: actions/checkout@v4

    - name: Setup Node.js runtime
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: "npm"

    - name: Install dependencies
      shell: bash                  # ⚠️ MANDATORY in composite actions!
      run: npm ci

    - name: Record version
      id: get-version
      shell: bash
      run: echo "version=$(node -v)" >> "$GITHUB_OUTPUT"
```

---

## 4. ⚠️ The Critical Gotcha: `shell:` is Mandatory

In standard workflows, GitHub provides default shells (e.g. `bash` on Linux/macOS, `pwsh` on Windows).

> **Crucial Rule:** In a composite action, GitHub Actions **does NOT infer a default shell**.  
> Every single `run:` step inside a composite action **MUST explicitly specify `shell:`** (e.g., `shell: bash`).  
> If you forget `shell: bash`, your workflow will fail to parse with: `Required property is missing: shell`.

---

## 5. Reusable Workflows vs. Composite Actions

This is one of the most common GitHub Actions DevOps interview questions:

| Aspect | Reusable Workflow (`workflow_call`) | Composite Action (`using: composite`) |
|---|---|---|
| **Defines** | Entire **Jobs** (with runner VMs, matrices, DAG) | A sequence of **Steps** |
| **Execution** | Spins up new runner VMs for its jobs | Runs directly on the caller job's existing VM |
| **File Location** | `.github/workflows/<name>.yml` | Any folder with an `action.yml` (e.g. `.github/actions/<name>/action.yml`) |
| **Secrets Access** | Must be passed explicitly or with `secrets: inherit` | Inherits runner environment variables & secrets automatically |
| **Use Case** | Complete standardized CI/CD pipelines across repos | Reusable setup scripts, test wrappers, multi-step tool installations |

---

## 6. What Was Created in This Level

1. **[.github/actions/setup-node-app/action.yml](file:///c:/Users/Abhishek%20Yadav/Desktop/LearnGithubActions/.github/actions/setup-node-app/action.yml)**:
   A composite action that checks out code, sets up Node.js with caching, installs dependencies with `npm ci`, and outputs the installed version.
2. **[.github/workflows/composite-demo.yml](file:///c:/Users/Abhishek%20Yadav/Desktop/LearnGithubActions/.github/workflows/composite-demo.yml)**:
   A demonstration workflow calling the local composite action with `uses: ./.github/actions/setup-node-app`.

---

## 🎯 Level 18 Practice Exercise

1. What file name must be used inside a composite action folder for GitHub Actions to recognize it?
2. Why does omitting `shell: bash` inside a composite action's `run:` step cause a syntax error, while regular workflow steps don't require it?
3. If you want to share a sequence of 4 steps across multiple jobs in the *same* runner without creating a separate job or spinning up a new VM, should you use a Reusable Workflow or a Composite Action?
