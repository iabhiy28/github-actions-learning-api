# Level 22 — Advanced Security & OpenID Connect (OIDC)

> **Previously Learned:** Workflow · Event · Job · Step · CI · env: · Contexts · `if:` · `needs:` · Matrix · Cache · Artifacts · Secrets · Permissions · Environments · Reusable Workflows · Composite Actions · Concurrency · Dynamic Matrix · Scheduled Triggers
>
> **This Level:** Eliminate long-lived cloud credentials using **OpenID Connect (OIDC)**. Authenticate securely and passwordless with AWS, Google Cloud, or Azure using `permissions: id-token: write`.

---

## 1. Review: Solutions to Level 21 Exercises

1. **Timezone used by GitHub Actions cron schedules:**  
   **UTC** (Coordinated Universal Time).
2. **Cron expression for every Monday at 09:00 UTC:**  
   `0 9 * * 1` (or `0 9 * * MON`).
3. **Branch where scheduled workflows run:**  
   Only the repository's **default branch** (`main`).

---

## 2. The Flaw with Long-Lived Cloud Secrets

In Level 14, we learned how to store credentials in GitHub Secrets:
```text
AWS_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### The Problem:
- These are **long-lived credentials** that never expire unless manually rotated.
- If a rogue dependency or leaked log exposes the key, attackers gain permanent cloud access.
- Enterprise compliance standards (SOC 2, ISO 27001) penalize long-lived static API keys.

---

## 3. The Modern Solution: OpenID Connect (OIDC)

**OIDC allows GitHub Actions to deploy to AWS, GCP, or Azure with ZERO static credentials stored in GitHub Secrets!**

### How OIDC Works:

```text
┌─────────────────────────┐              1. Request JWT
│ GitHub Runner           │ ──────────────────────────────────────────► ┌─────────────────────────┐
│ (with id-token: write)  │ ◄────────────────────────────────────────── │ GitHub OIDC Provider    │
└─────────────────────────┘      2. Signed JWT Token with claims        └─────────────────────────┘
             │                      (repo, ref, actor, sha)
             │
             │ 3. Exchange JWT for short-lived credentials (assume IAM Role)
             ▼
┌─────────────────────────┐
│ Cloud Provider          │
│ (AWS STS / Google IAM)  │ ────► Verifies GitHub's signature & checks Trust Policy
└─────────────────────────┘
             │
             │ 4. Issues temporary credentials (valid for 1 hour only!)
             ▼
┌─────────────────────────┐
│ Deployment proceeds     │
└─────────────────────────┘
```

---

## 4. Key Requirements for OIDC

### 1. The Mandatory Permission:
To allow the runner to request the JWT token from GitHub, you **must** configure:

```yaml
permissions:
  id-token: write    # ⚠️ REQUIRED for OIDC
  contents: read
```

### 2. AWS IAM Trust Policy Example:
In AWS, you create an IAM Role that trusts only your specific GitHub repository and branch:

```json
{
  "Effect": "Allow",
  "Principal": {
    "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
  },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
    },
    "StringLike": {
      "token.actions.githubusercontent.com:sub": "repo:iabhiy28/github-actions-learning-api:ref:refs/heads/main"
    }
  }
}
```

Even if someone else tries to use this IAM role from another GitHub repository, AWS rejects the request because the `sub` claim doesn't match!

---

## 5. Workflow Example with AWS

```yaml
name: Deploy to AWS via OIDC

permissions:
  id-token: write   # Required to fetch OIDC token
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials using OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/DeployRole
          aws-region: us-east-1

      - name: Deploy to S3
        run: aws s3 sync ./dist s3://my-prod-bucket
```

Notice: **No `AWS_SECRET_ACCESS_KEY` anywhere in secrets!**

---

## 6. What Was Created in This Level

- **[.github/workflows/oidc-demo.yml](file:///c:/Users/Abhishek%20Yadav/Desktop/LearnGithubActions/.github/workflows/oidc-demo.yml)**:
  Demonstrates the OIDC permission requirement (`id-token: write`) and inspects the internal runtime token environment variables.

---

## 🎯 Level 22 Practice Exercise

1. What specific permission scope and level is required to enable OIDC in a GitHub Actions workflow?
2. Why is OIDC significantly more secure than storing static cloud access keys in GitHub Secrets?
3. In an AWS IAM Trust Policy for OIDC, what claim in the JWT token ensures that only *your* repository can assume the role?
