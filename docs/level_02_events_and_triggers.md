# Level 02 — Events and Triggers (`on:`)

> **Previously Learned:** Core Pillars (Workflow, Event, Job, Step), Runner environments.
>
> **This Level:** Master the `on:` trigger key. Learn how to trigger workflows on single events, multiple events, activity types, and manual dispatch.

---

## 1. The `on:` Key

The `on:` key tells GitHub Actions **when** to run your workflow. Without an event trigger, a workflow cannot start.

---

## 2. Trigger Types

### 1. Single Event
```yaml
on: push
```

### 2. Multiple Events (Array syntax)
```yaml
on: [push, pull_request]
```

### 3. Detailed Event Configuration with Activity Types
Some events (like `pull_request` or `issues`) have sub-events called **activity types**:
```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
```
- `opened`: When a new PR is created.
- `synchronize`: When a developer pushes a new commit to an existing PR.
- `reopened`: When a closed PR is reopened.

### 4. Manual Trigger (`workflow_dispatch`)
Allows testing the workflow on-demand via the GitHub Web UI or API:
```yaml
on:
  workflow_dispatch:
```

---

## 3. Combining Triggers

In real-world setups, you often combine automatic triggers with manual overrides:

```yaml
name: Combined Triggers

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Triggered by: ${{ github.event_name }}"
```
