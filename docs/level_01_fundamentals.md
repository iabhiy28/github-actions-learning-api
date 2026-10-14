# Level 01 — Fundamentals of GitHub Actions

> **Welcome to GitHub Actions Mastery!**
>
> **This Level:** Understand what CI/CD is, why GitHub Actions exists, and the 4 core pillars of the GitHub Actions mental model.

---

## 1. What is CI/CD?

- **CI (Continuous Integration):** The automated process of building, linting, and testing code whenever a developer pushes changes or opens a Pull Request. CI prevents broken code from ever reaching the team's shared repository.
- **CD (Continuous Delivery / Deployment):** The automated process of packaging and releasing tested code to staging or production environments (e.g. AWS, Vercel, Docker Hub, Kubernetes).

---

## 2. The 4 Core Pillars of GitHub Actions

```text
┌───────────────────────────────────────────────────────────────┐
│ 1. WORKFLOW (.github/workflows/*.yml)                         │
│    The automated process defined in YAML.                      │
│                                                               │
│    2. EVENT (on: push, pull_request)                          │
│       The trigger that wakes up the workflow.                 │
│                                                               │
│    3. JOBS (jobs: test, build)                                │
│       Units of work running on independent Runner VMs.        │
│                                                               │
│    4. STEPS (steps: - run: npm test)                          │
│       Individual tasks/commands executed inside a Job.        │
└───────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure

All GitHub Actions workflows must live in the exact directory:
```text
.github/
  └── workflows/
        └── my-workflow.yml
```
Files must have `.yml` or `.yaml` extensions.

---

## 4. Your First Workflow: Hello World

```yaml
name: Hello World Workflow

# Trigger: Runs whenever code is pushed to any branch
on: push

jobs:
  say-hello:
    runs-on: ubuntu-latest
    steps:
      - name: Print Greeting
        run: echo "Hello, GitHub Actions!"
```

---

## 5. Runners: What Executes Your Code?

GitHub Actions does **not** run your code locally on your laptop. It spins up an ephemeral, isolated virtual machine called a **Runner**:
- `ubuntu-latest` (Ubuntu Linux — standard & cheapest)
- `windows-latest` (Windows Server)
- `macos-latest` (macOS — primarily for iOS/macOS apps)

Every job starts on a **clean, freshly provisioned VM** and is completely destroyed once the job finishes.
