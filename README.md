# GitHub Actions Learning API 🚀

[![CI Pipeline](https://github.com/iabhiy28/github-actions-learning-api/actions/workflows/ci.yml/badge.svg)](https://github.com/iabhiy28/github-actions-learning-api/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A production-grade Express.js learning API demonstrating complete end-to-end **GitHub Actions CI/CD Mastery** from foundational concepts to enterprise architecture.

---

## 🏗️ Pipeline Architecture

```text
                               ┌── test (Node 20) ──┐
                               ├── test (Node 22) ──┤
push (main) / pr ─────────────►├── test (Node 24) ──┼──► build ──► deploy-staging ──► deploy-production
                               │                   │    (artifact) (env: staging)     (env: production)
                               └── lint ───────────┘
```

---

## 🎓 Complete 23-Level Curriculum Checklist

- [x] [Level 1: Core Fundamentals (Workflows, Events, Runners)](docs/level_01_fundamentals.md)
- [x] [Level 2: Triggers & Events (`push`, `pull_request`, `workflow_dispatch`)](docs/level_02_events_and_triggers.md)
- [x] [Level 3: Jobs & Steps Architecture](docs/level_03_jobs_and_steps.md)
- [x] [Level 4: Real-world CI Testing with Jest & Express](docs/level_04_real_ci.md)
- [x] [Level 5: Pull Request CI Verification](docs/level_05_pr_ci.md)
- [x] [Level 6: Branch & Path Filtering (`branches:`, `paths:`)](docs/level_06_branch_filtering.md)
- [x] [Level 7: Environment Variables (`env:`)](docs/level_07_env_variables.md)
- [x] [Level 8: GitHub Contexts (`${{ github.* }}`, `${{ runner.* }}`)](docs/level_08_contexts.md)
- [x] [Level 9: Conditional Execution (`if:`, `success()`, `failure()`, `always()`)](docs/level_09_conditions.md)
- [x] [Level 10: Directed Acyclic Graphs (DAG) with `needs:`](docs/level_10_job_dependencies.md)
- [x] [Level 11: Test Matrix Strategies (`strategy: matrix:`)](docs/level_11_matrix.md)
- [x] [Level 12: Dependency Caching (`actions/cache`, `hashFiles()`)](docs/level_12_caching.md)
- [x] [Level 13: Artifact Management (`upload-artifact`, `download-artifact`)](docs/level_13_artifacts.md)
- [x] [Level 14: Encrypted Secrets (`${{ secrets.* }}` & Masking)](docs/level_14_secrets.md)
- [x] [Level 15: Security Hardening & Permissions (`permissions:`, PoLP)](docs/level_15_permissions.md)
- [x] [Level 16: Environments & Protection Rules (`environment:`, approvals, URLs)](docs/level_16_environments.md)
- [x] [Level 17: Reusable Workflows (`workflow_call`, `secrets: inherit`)](docs/level_17_reusable_workflows.md)
- [x] [Level 18: Custom Composite Actions (`action.yml`, `using: "composite"`)](docs/level_18_composite_actions.md)
- [x] [Level 19: Concurrency Control & Cancelling Outdated Runs (`concurrency:`)](docs/level_19_concurrency.md)
- [x] [Level 20: Dynamic Matrices & Runtime Generation (`fromJSON()`)](docs/level_20_dynamic_matrix.md)
- [x] [Level 21: Scheduled & External Triggers (`schedule: cron`, `repository_dispatch`)](docs/level_21_triggers.md)
- [x] [Level 22: Advanced Cloud Security & Passwordless OIDC (`id-token: write`)](docs/level_22_oidc_security.md)
- [x] [Level 23: Production Pipeline Mastery, Status Badges & Job Summaries (`$GITHUB_STEP_SUMMARY`)](docs/level_23_production_mastery.md)

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run test suite
npm test

# Start API server locally
npm start
```
