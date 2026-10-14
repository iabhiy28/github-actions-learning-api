# Level 03 — Jobs and Steps Architecture

> **Previously Learned:** Workflows, Events, Triggers (`on:`).
>
> **This Level:** Understand how Jobs execute on independent runners, how Steps run sequentially, how shell commands execute, and how exit codes dictate pass/fail states.

---

## 1. Jobs vs. Steps: The Core Hierarchy

- **Jobs (`jobs:`)**:
  - By default, multiple jobs run in **parallel** on completely separate runner VMs.
  - Job 1 cannot access files created on Job 2's runner unless transferred via artifacts or cache.
- **Steps (`steps:`)**:
  - Steps inside a job always run **sequentially** (one after another) on the **same** runner VM.
  - If Step 1 creates a file, Step 2 can read it.
  - If any step fails (exits with non-zero exit code), subsequent steps are skipped by default.

```text
Workflow
  ├── Job 1 (Runs on VM A)
  │     ├── Step 1 (Checkout)
  │     ├── Step 2 (Install)
  │     └── Step 3 (Test)
  │
  └── Job 2 (Runs in parallel on VM B)
        ├── Step 1 (Lint)
        └── Step 2 (Audit)
```

---

## 2. Types of Steps

A step can either be:
1. **A shell command (`run:`)**:
   ```yaml
   - name: Print Date
     run: date
   ```
2. **An Action (`uses:`)**:
   ```yaml
   - name: Checkout Code
     uses: actions/checkout@v4
   ```

---

## 3. Shell Execution & Multiline Commands

### Single-line command
```yaml
- name: Single Command
  run: npm test
```

### Multi-line commands using `|` (literal block)
Each line executes sequentially in the shell:
```yaml
- name: System Audit
  run: |
    echo "Hostname: $(hostname)"
    echo "OS: $(uname -s)"
    node --version
```

---

## 4. Exit Codes & CI Pass/Fail State

Every shell command returns an integer **Exit Code**:
- `0`: Success (the step passes, CI continues)
- Non-zero (`1`, `2`, `127`, etc.): Failure (the step fails, the job immediately halts and marks as failed ❌)

```bash
# This step passes:
run: echo "All good" # exit 0

# This step fails:
run: exit 1 # exit 1 -> Job fails
```
This fundamental Unix mechanism is how test frameworks (like Jest, Mocha, Pytest) signal failures to CI runners.
