# Level 16 — Environments & Deployments

> **Previously Learned:** Workflow · Event · Job · Step · CI · env: · Contexts · `if:` · `needs:` · Matrix · Cache · Artifacts · Secrets · Permissions
>
> **This Level:** Manage deployment targets with `environment:`. Understand **Environment Protection Rules** (manual approvals, wait timers, branch restrictions), **Environment-scoped Secrets**, and deployment URL tracking.

---

## 1. What is an Environment?

In GitHub Actions, an **Environment** is a first-class entity representing where your application actually runs (e.g. `staging`, `production`, `qa`, `canary`).

So far, all your jobs ran arbitrary commands on a runner VM. But deployments are special:
- Deploying to production has real consequences.
- You don't want every test run or pull request to touch production.
- Production requires different database URLs and API keys than staging.
- Production often requires a human tech lead or QA manager to click **"Approve"** before deployment proceeds.

GitHub Environments solve all of this.

```text
               ┌────────────────────────────────────────────────────────┐
               │                  GitHub Environment                    │
               ├──────────────────────────┬─────────────────────────────┤
               │   Protection Rules       │   Environment Secrets       │
               │   • Required Reviewers   │   • DATABASE_URL (prod db)  │
               │   • Wait Timer (10 min)  │   • STRIPE_KEY (live key)   │
               │   • Branch Restrictions  │   • API_URL                 │
               └──────────────────────────┴─────────────────────────────┘
                                          ▲
                                          │
                  job: deploy-production  │
                  environment: production ┘
```

---

## 2. The 3 Superpowers of Environments

### Superpower #1: Environment Protection Rules

Configured in your repository:
**Settings → Environments → [Choose Environment] → Environment protection rules**

| Protection Rule | How It Works | Real-World Use Case |
|---|---|---|
| **Required Reviewers** | Pauses the workflow run and notifies designated people/teams. The job will **not execute** until a reviewer clicks **"Approve and deploy"**. | Production safety gate: Lead engineer must approve production release. |
| **Wait Timer** | Delays the job by a specified number of minutes after triggering before it starts. | Canary or soak period: Wait 15 minutes to verify staging stability before touching prod. |
| **Deployment Branches** | Restricts which branches or tags are allowed to deploy to this environment. | Prevent developers from deploying experimental feature branches to production. Only `main` allowed. |

### Superpower #2: Environment-Scoped Secrets & Variables

In Level 14, you learned about repository secrets (`secrets.API_KEY`).

With environments, you can define **Environment Secrets**:
- A secret named `DATABASE_URL` under `staging` points to the staging Postgres instance.
- A secret named `DATABASE_URL` under `production` points to the production RDS cluster.

In your workflow, the code is identical:
```yaml
run: ./migrate-db.sh
env:
  DB_URL: ${{ secrets.DATABASE_URL }}
```
GitHub automatically injects the **correct secret** based on the job's `environment:` declaration!

### Superpower #3: Deployment Tracking & URLs

When a job specifies:
```yaml
environment:
  name: production
  url: https://api.example.com
```

GitHub creates a deployment event and renders:
1. A **Deployments tab** in your repository.
2. An active deployment badge with the latest commit SHA.
3. A clickable **"View deployment"** link directly on the workflow run page!

---

## 3. Syntax: How to Declare an Environment

### Shorthand (String)
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
```

### Full Object (With URL)
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.example.com
```

### Dynamic URL (From step outputs)
If your deployment script outputs a dynamically generated preview URL (e.g. AWS Amplify, Vercel, PR previews):
```yaml
jobs:
  preview:
    runs-on: ubuntu-latest
    environment:
      name: pr-${{ github.event.pull_request.number }}
      url: ${{ steps.deploy_step.outputs.preview_url }}
    steps:
      - id: deploy_step
        run: echo "preview_url=https://preview-123.dev" >> "$GITHUB_OUTPUT"
```

---

## 4. Real-World CI/CD Pipeline Flow

Here is how our complete pipeline now looks in [ci.yml](file:///c:/Users/Abhishek%20Yadav/Desktop/LearnGithubActions/.github/workflows/ci.yml):

```text
                    ┌── test (Node 20) ──┐
                    ├── test (Node 22) ──┤
push/pr ───────────►├── test (Node 24) ──┼──► build ──► deploy-staging ──► deploy-production
                    │                   │    (uploads   (env: staging)     (env: production)
                    └── lint ───────────┘    artifact)
```

1. **Pull Request**: Runs `test` (3 Node versions in parallel) and `lint`. If both pass, `build` runs and packages the app. Deploy jobs **do not run** (`if: github.event_name == 'push'`).
2. **Merge / Push to `main`**: Runs tests, lint, build, then automatically deploys to **staging**.
3. **Deploy to production**: Runs only after staging succeeds (`needs: deploy-staging`). If a protection rule is configured on `production`, it waits for manual approval!

---

## 5. What Was Updated in `ci.yml`

In [ci.yml](file:///c:/Users/Abhishek%20Yadav/Desktop/LearnGithubActions/.github/workflows/ci.yml):

```yaml
  # ── Job 4: deploy-staging ───────────────────────────────────────────────────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    environment:
      name: staging
      url: https://staging.learning-api.example.com

    steps:
      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: build-output
          path: ./release/

      - name: Deploy to staging server
        run: |
          echo "🚀 Deploying ${{ env.APP_NAME }} to STAGING..."
          ls -la ./release/
          echo "✅ Staging deployment successful!"

  # ── Job 5: deploy-production ────────────────────────────────────────────────
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging

    environment:
      name: production
      url: https://api.example.com

    steps:
      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: build-output
          path: ./release/

      - name: Deploy to production server
        run: |
          echo "🌟 Deploying ${{ env.APP_NAME }} to PRODUCTION..."
          echo "✅ Production deployment successful!"
```

---

## 🎯 Level 16 Practice Exercise

Consider the following scenario:

1. You have a repository secret `DATABASE_URL` with value `postgres://root:password@main-db:5432/db`.
2. You also have an environment named `production` with an environment secret `DATABASE_URL` with value `postgres://prod_admin:secure_pwd@aws-rds:5432/live`.
3. In your workflow, job `deploy-production` declares:
   ```yaml
   environment: production
   ```
   and references `${{ secrets.DATABASE_URL }}`.

**Answer these 3 questions:**
1. Which secret value will `deploy-production` receive? (The repository secret or the environment secret?)
2. If another job `deploy-dev` has **no** `environment:` specified and references `${{ secrets.DATABASE_URL }}`, which value does it receive?
3. How can you ensure that developers cannot deploy experimental branches directly to the `production` environment?
