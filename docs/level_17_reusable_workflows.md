# Level 17 — Reusable Workflows (`workflow_call`)

> **Previously Learned:** Workflow · Event · Job · Step · CI · env: · Contexts · `if:` · `needs:` · Matrix · Cache · Artifacts · Secrets · Permissions · Environments
>
> **This Level:** Write modular, reusable CI/CD workflows using `workflow_call`. Pass typed `inputs:`, `secrets:`, and return `outputs:`. Learn how to call workflows locally and across repositories.

---

## 1. Review: Solutions to Previous Exercises

### Level 15 Exercise (Permissions)
1. **Scope for Step 1 (Checkout code):** `contents: read`.
2. **Scope for Step 3 (Comment on PR):** `pull-requests: write`.
3. **If you only wrote `permissions: { pull-requests: write }`:**
   Step 1 (`actions/checkout@v4`) will **fail** with a 403 Forbidden / authentication error! Because the moment you declare `permissions:`, all unlisted scopes (including `contents`) drop to `none`.

### Level 16 Exercise (Environments)
1. **Secret precedence:** If `DATABASE_URL` is defined at both repository level and inside the `production` environment, the job using `environment: production` will receive the **environment secret** (environment overrides repository).
2. **Unspecified environment:** `deploy-dev` (with no `environment:` specified) will receive the **repository secret**.
3. **Branch protection:** Under **Settings → Environments → production → Deployment branches**, choose **"Selected branches"** and add only `main` (or specific release branches).

---

## 2. Why Reusable Workflows?

In large teams or companies with 20+ repositories:
- Every microservice needs the exact same build, test, Docker publish, and deployment logic.
- Copy-pasting 200 lines of YAML into 20 repositories is a nightmare to maintain.
- If security needs to patch a vulnerability, you have to edit 20 separate repos.

**Reusable Workflows** solve this:
You define a workflow **once** as a callable template, and any other workflow (in the same repo or across the organization) can call it like a function!

```text
┌──────────────────────────────────────────────┐
│ Caller Workflow (e.g. caller-demo.yml)       │
│                                              │
│  jobs:                                       │
│    deploy-stage:                             │
│      uses: ./.github/workflows/reusable...   │
│      with:                                   │
│        environment-name: staging             │
└──────────────────────────────────────────────┘
                      │
                      ▼ invokes like a function
┌──────────────────────────────────────────────┐
│ Reusable Workflow (reusable-deploy.yml)      │
│                                              │
│  on:                                         │
│    workflow_call:                            │
│      inputs:                                 │
│        environment-name: { type: string }    │
│                                              │
│  jobs:                                       │
│    deploy:                                   │
│      environment: ${{ inputs.env-name }}     │
└──────────────────────────────────────────────┘
```

---

## 3. The Anatomy of a Reusable Workflow

A reusable workflow is triggered by the **`workflow_call`** event:

```yaml
name: Reusable Deploy Workflow

on:
  workflow_call:
    # 1. Inputs (arguments passed into the workflow)
    inputs:
      environment-name:
        description: "Target environment"
        required: true
        type: string         # string, boolean, or number
      target-url:
        required: true
        type: string

    # 2. Secrets (credentials needed by the workflow)
    secrets:
      DEPLOY_KEY:
        required: false

    # 3. Outputs (values returned to the caller)
    outputs:
      deployment-status:
        description: "Status code"
        value: ${{ jobs.deploy.outputs.status }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: ${{ inputs.environment-name }}
      url: ${{ inputs.target-url }}
    outputs:
      status: ${{ steps.step1.outputs.status }}
    steps:
      - id: step1
        run: echo "status=success" >> "$GITHUB_OUTPUT"
```

---

## 4. How the Caller Invokes It

Instead of `steps:`, the caller job uses **`uses:`** pointing to the reusable workflow file:

```yaml
jobs:
  call-deploy:
    name: Call Reusable Deploy
    # Local workflow path:
    uses: ./.github/workflows/reusable-deploy.yml
    # Or cross-repository:
    # uses: my-org/shared-workflows/.github/workflows/deploy.yml@v1.0.0
    with:
      environment-name: "staging"
      target-url: "https://staging.example.com"
    # Pass secrets:
    secrets: inherit
```

### Passing Secrets
You have two options:
1. **`secrets: inherit`**: Passes all caller repository/environment secrets directly to the reusable workflow (recommended and cleanest).
2. **Explicit mapping**:
   ```yaml
   secrets:
     DEPLOY_KEY: ${{ secrets.MY_SPECIAL_KEY }}
   ```

---

## 5. Reusable Workflows vs. Composite Actions

A frequent source of confusion:

| Feature | Reusable Workflow (`workflow_call`) | Composite Action (`action.yml`) |
|---|---|---|
| **What it contains** | One or more entire **Jobs** | A sequence of **Steps** |
| **Runner control** | Can define `runs-on:`, `matrix:`, `environment:` | Runs inside caller's existing runner |
| **File location** | `.github/workflows/*.yml` | Any folder with an `action.yml` |
| **Best used for** | Standardizing whole pipelines (e.g., standard build+deploy pipeline) | Packaging helper tool setup, custom scripts, or multi-step utilities |

---

## 6. What Was Created in This Level

1. **[reusable-deploy.yml](file:///c:/Users/Abhishek%20Yadav/Desktop/LearnGithubActions/.github/workflows/reusable-deploy.yml)**:
   A fully parameterized deployment workflow supporting `inputs:`, `secrets:`, and returning `outputs:`.
2. **[caller-demo.yml](file:///c:/Users/Abhishek%20Yadav/Desktop/LearnGithubActions/.github/workflows/caller-demo.yml)**:
   A manual dispatch workflow that calls the reusable workflow and logs the resulting output.

---

## 🎯 Level 17 Practice Exercise

1. What event keyword makes a workflow reusable by other workflows?
2. If you have 10 secrets in your repository and you want the reusable workflow to access them without listing each one individually, what line of code do you add under the caller job?
3. Can a job that uses a reusable workflow (`uses: ...`) also define its own `steps:` list? Why or why not?
