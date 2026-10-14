# Level 20 — Dynamic Matrices & fromJSON()

> **Previously Learned:** Workflow · Event · Job · Step · CI · env: · Contexts · `if:` · `needs:` · Matrix · Cache · Artifacts · Secrets · Permissions · Environments · Reusable Workflows · Composite Actions · Concurrency
>
> **This Level:** Generate matrix configurations dynamically at runtime using job outputs and the built-in `fromJSON()` function.

---

## 1. Review: Solutions to Level 19 Exercises

1. **Two core fields in `concurrency:`**: `group` (the lock key) and `cancel-in-progress` (boolean).
2. **When `cancel-in-progress: false`**: The new run is placed in a **queue** and waits safely for the previous run to finish.
3. **Why `cancel-in-progress: true` is risky for deployments**: It can abort a deployment midway, leaving production infrastructure in a corrupted, half-deployed state, and risks deployment race conditions.

---

## 2. Why Dynamic Matrices?

In Level 11, our matrix was hardcoded in YAML:
```yaml
matrix:
  node-version: [20, 22, 24]
```

### The Problem
What if you work in a **monorepo** with 10 microservices, or you only want to test the modules that were modified in the latest commit?
- Hardcoding means running all 10 services on every commit (huge waste of time & money).
- You need a way to calculate the list of jobs **on the fly**.

---

## 3. The Pattern: Generator Job + Consumer Job

Dynamic matrices use a **two-job architecture**:

```text
┌───────────────────────────────────────┐
│ Job 1: generate-matrix                │
│                                       │
│  - Inspects git diff or inputs        │
│  - Builds a JSON array string         │
│  - Exports: matrix='["20", "22"]'     │
└───────────────────────────────────────┘
                   │
                   ▼ (needs: generate-matrix)
┌───────────────────────────────────────┐
│ Job 2: test (Matrix Consumer)         │
│                                       │
│  strategy:                            │
│    matrix:                            │
│      node: ${{ fromJSON(...) }}       │
│                                       │
│  ├── Subjob 1: Node 20                │
│  └── Subjob 2: Node 22                │
└───────────────────────────────────────┘
```

---

## 4. How It Works in YAML

### Generator Job:
```yaml
generate:
  runs-on: ubuntu-latest
  outputs:
    targets: ${{ steps.calc.outputs.targets }}
  steps:
    - id: calc
      run: |
        # Generate JSON string
        LIST='["services/auth", "services/billing"]'
        echo "targets=$LIST" >> "$GITHUB_OUTPUT"
```

### Consumer Job:
```yaml
test:
  needs: generate
  runs-on: ubuntu-latest
  strategy:
    matrix:
      service: ${{ fromJSON(needs.generate.outputs.targets) }}
  steps:
    - run: echo "Testing ${{ matrix.service }}"
```

---

## 5. What Was Created in This Level

- **[.github/workflows/dynamic-matrix-demo.yml](file:///c:/Users/Abhishek%20Yadav/Desktop/LearnGithubActions/.github/workflows/dynamic-matrix-demo.yml)**:
  Demonstrates selecting a `quick` vs `full` test scope via `workflow_dispatch`, dynamically emitting a JSON array, and parsing it with `fromJSON()`.

---

## 🎯 Level 20 Practice Exercise

1. What built-in GitHub Actions function converts a JSON string from a step output into an executable matrix list?
2. Why does the consumer job require the `needs:` keyword pointing to the generator job?
3. Can a dynamic matrix contain an array of objects (e.g. `[{"os": "ubuntu-latest", "node": "20"}, {"os": "windows-latest", "node": "22"}]`)?
