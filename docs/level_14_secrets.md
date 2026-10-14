# Level 14 — Secrets

> **Previously Learned:** Workflow · Event · Job · Step · CI · env: · Contexts · `if:` · `needs:` · Matrix · Cache · Artifacts
>
> **This Level:** Store sensitive values securely. Access them with `${{ secrets.* }}`. Understand masking, `GITHUB_TOKEN`, and the difference between secrets, variables, and env vars.

---

## Why Secrets Exist

Everything you've put in YAML so far is visible in your repository:

```yaml
env:
  NODE_ENV: test         # ✅ safe — not sensitive
  APP_NAME: my-api       # ✅ safe — not sensitive
```

But what about real credentials?

```yaml
env:
  DATABASE_PASSWORD: mypassword123    # ❌ NEVER DO THIS
  AWS_ACCESS_KEY: AKIAIOSFODNN7...   # ❌ NEVER DO THIS
  DEPLOY_TOKEN: ghp_xxxxxxxxxxxxx    # ❌ NEVER DO THIS
```

**If you commit secrets to YAML:**
- Anyone with repo access reads them
- Git history keeps them forever (even if you delete the line)
- Public repos expose them to the entire internet
- Attacker gets access to your database, cloud, or deploy system

**GitHub Secrets** solve this:
- Stored **encrypted** on GitHub's servers
- **Never visible** after creation — even repo admins cannot read the value back
- **Automatically masked** in all log output (`***`)
- Injected into workflows **only at runtime**

---

## How to Add a Secret — GitHub UI

```text
1. github.com/iabhiy28/github-actions-learning-api
2. Settings (top navigation)
3. Secrets and variables → Actions (left sidebar)
4. New repository secret
5. Name:  DUMMY_API_KEY
   Value: learning-secret-abc123
6. Add secret ✅
```

After saving:
- The value is encrypted and stored
- You can **update or delete** the secret
- You **cannot read** the value back (not even you)

---

## How to Use a Secret in a Workflow

```yaml
steps:
  - name: Deploy
    env:
      API_KEY: ${{ secrets.DUMMY_API_KEY }}   # ← inject as env var
    run: |
      echo "Key is available: ${#API_KEY} chars"
      ./deploy.sh    # deploy.sh reads $API_KEY from environment
```

**The correct pattern:**
1. Reference with `${{ secrets.SECRET_NAME }}`
2. Assign to an `env:` variable at the step level
3. Shell commands use `$API_KEY` — never `${{ secrets.DUMMY_API_KEY }}` directly in `run:`

---

## Why NOT Use Secrets Directly in `run:`?

```yaml
# ❌ BAD — secret appears in the YAML expression context
- run: curl -H "Authorization: ${{ secrets.API_KEY }}" https://api.example.com

# ✅ GOOD — secret injected as env var, shell handles it
- env:
    API_KEY: ${{ secrets.API_KEY }}
  run: curl -H "Authorization: $API_KEY" https://api.example.com
```

The first pattern exposes the secret to potential script injection (Level 22 — Security). Always use the env var pattern.

---

## Secret Masking

Even if you accidentally print a secret, GitHub **automatically replaces it** in logs:

```yaml
- env:
    API_KEY: ${{ secrets.DUMMY_API_KEY }}
  run: echo "$API_KEY"    # accidentally prints it
```

```text
Log output:
  ***      ← value replaced, not "learning-secret-abc123"
```

GitHub scans every character of log output and replaces matching secret values with `***`.

> ⚠️ **Don't rely on masking as your security.** It can be bypassed:
> ```bash
> echo $API_KEY | base64     # outputs base64 — not masked!
> echo $API_KEY | rev        # outputs reversed — not masked!
> ```
> Best practice: **never print secrets in any form.**

---

## Check if a Secret is Set (Safely)

```yaml
- name: Verify secret exists
  env:
    API_KEY: ${{ secrets.DUMMY_API_KEY }}
  run: |
    if [ -z "$API_KEY" ]; then
      echo "❌ Secret not set — go to Settings → Secrets → Actions"
      exit 1
    else
      echo "✅ Secret is set (${#API_KEY} characters)"
    fi
```

`${#API_KEY}` returns the **length** of the string — safe to print, doesn't reveal the value.

---

## GITHUB_TOKEN — The Built-in Secret

Every workflow automatically gets a `GITHUB_TOKEN` — **you don't need to create it**.

```yaml
- name: Use GITHUB_TOKEN
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    gh release create v1.0.0        # GitHub CLI uses GH_TOKEN automatically
    gh issue comment 5 --body "CI passed!"
```

| Property | Value |
|---|---|
| **Created** | Automatically for every workflow run |
| **Scope** | Only the current repository |
| **Expires** | When the workflow run ends |
| **Permissions** | Controlled by `permissions:` (Level 15) |
| **Use case** | Push code, create releases, comment on PRs, call GitHub API |

```text
GITHUB_TOKEN is different from your personal access token:
  GITHUB_TOKEN → temporary, scoped to this repo, this run only
  Personal token → permanent (until revoked), your full account access
```

---

## File Created — `secrets-demo.yml`

```yaml
name: Secrets Demo

on:
  workflow_dispatch:

jobs:
  secrets-demo:
    runs-on: ubuntu-latest

    steps:
      # ── Safe usage ───────────────────────────────────────────────────
      - name: Use secret safely
        env:
          API_KEY: ${{ secrets.DUMMY_API_KEY }}
        run: |
          echo "Secret is set: ${{ secrets.DUMMY_API_KEY != '' }}"
          echo "Key length: ${#API_KEY} characters"
          echo "Deploying with API key (masked in logs)..."

      # ── Masking demo ─────────────────────────────────────────────────
      - name: Accidental print (GitHub masks it)
        env:
          API_KEY: ${{ secrets.DUMMY_API_KEY }}
        run: |
          echo "If you print it: $API_KEY"
          echo "It shows as: ***  in the logs ✅"

      # ── Check existence ──────────────────────────────────────────────
      - name: Check if secret is set
        env:
          API_KEY: ${{ secrets.DUMMY_API_KEY }}
        run: |
          if [ -z "$API_KEY" ]; then
            echo "❌ DUMMY_API_KEY is NOT set"
          else
            echo "✅ DUMMY_API_KEY is set and available"
          fi

      # ── GITHUB_TOKEN ─────────────────────────────────────────────────
      - name: Use built-in GITHUB_TOKEN
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          echo "GITHUB_TOKEN is available in every workflow automatically"
          echo "Use it to interact with the GitHub API"
```

---

## Line-by-Line Explanation

| Code | Meaning |
|---|---|
| `${{ secrets.DUMMY_API_KEY }}` | Injects the secret value at runtime |
| `env: API_KEY: ${{ secrets.DUMMY_API_KEY }}` | Assigns secret to an env var for the step |
| `${#API_KEY}` | Shell: length of string — safe to print |
| `${{ secrets.DUMMY_API_KEY != '' }}` | Expression: true/false whether secret is set |
| `${{ secrets.GITHUB_TOKEN }}` | The automatic built-in secret |

---

## Secrets vs Variables vs `env:` — Full Comparison

| | `env:` in YAML | GitHub Secrets | GitHub Variables |
|---|---|---|---|
| **Where stored** | In your YAML file | GitHub encrypted storage | GitHub UI (non-encrypted) |
| **Visible in YAML** | ✅ Yes | ❌ No — only `${{ secrets.* }}` | ❌ No — only `${{ vars.* }}` |
| **Shown in logs** | ✅ Yes — as plain text | ❌ No — masked as `***` | ✅ Yes — as plain text |
| **Can read back** | ✅ Yes — it's in the file | ❌ No — not even you | ✅ Yes — visible in Settings |
| **Use for** | Non-sensitive config | Passwords, tokens, API keys | Reusable non-sensitive config |
| **Example** | `NODE_ENV: test` | `DATABASE_PASSWORD` | `API_BASE_URL` |
| **Syntax** | `$NODE_ENV` or `${{ env.X }}` | `${{ secrets.X }}` | `${{ vars.X }}` |

---

## Secret Scopes — Where Secrets Live

```text
Repository secrets:
  Settings → Secrets and variables → Actions
  Available to: all workflows in this repo

Environment secrets:
  Settings → Environments → [environment name] → Secrets
  Available to: only jobs that target that environment
  (Level 16 — Environments)

Organization secrets:
  Organization Settings → Secrets
  Available to: selected repos in the org
```

For now we're using **repository secrets** — the simplest scope.

---

## NEVER DO These Things

```yaml
# ❌ 1. Hardcode secrets in YAML
env:
  TOKEN: ghp_actualTokenValue

# ❌ 2. Print secrets
run: echo "${{ secrets.MY_SECRET }}"

# ❌ 3. Pass secrets to untrusted Actions
- uses: some-random-action@v1
  with:
    token: ${{ secrets.MY_SECRET }}   # untrusted action could steal it

# ❌ 4. Store secrets in artifact
- run: echo $API_KEY > output.txt
- uses: actions/upload-artifact@v4
  with:
    path: output.txt    # artifact is downloadable — anyone can see it!
```

---

## Execution Flow

```text
Developer adds secret "DUMMY_API_KEY" to GitHub UI
    ↓
GitHub encrypts and stores it

Workflow triggers
    ↓
GitHub evaluates ${{ secrets.DUMMY_API_KEY }}
    → Decrypts the value at runtime
    → Injects into the runner's environment
    ↓
Shell runs: echo "${#API_KEY}"
    → prints: 23  (character count — not the value)
    ↓
Shell runs: echo "$API_KEY"
    → GitHub intercepts log output
    → replaces "learning-secret-abc123" with "***"
    → you see *** in the logs
    ↓
Workflow ends
    → Secret value is cleared from runner environment
```

---

## What I Learned in Level 14

| Concept | What it is |
|---|---|
| GitHub Secrets | Encrypted key-value pairs stored securely on GitHub |
| `${{ secrets.NAME }}` | Expression to inject a secret |
| Step-level `env:` | Correct way to pass secret to shell commands |
| Masking | GitHub auto-replaces secret values with `***` in logs |
| `GITHUB_TOKEN` | Auto-created temporary secret for every run |
| Secret scope | Repository, Environment, Organization |
| What NOT to do | Hardcode, print, pass to untrusted actions, store in artifacts |

---

## 📊 Learning Map

| Concept | Learned | Used In |
|---|---|---|
| Workflow | ✅ | `hello.yml`, `ci.yml`, `contexts.yml`, `secrets-demo.yml` |
| Event | ✅ | `push`, `pull_request`, `workflow_dispatch` |
| Job | ✅ | `test`, `lint`, `build`, `deploy-check`, `secrets-demo` |
| Runner | ✅ | `ubuntu-latest` |
| Action | ✅ | `checkout`, `setup-node`, `upload-artifact`, `download-artifact` |
| CI | ✅ | `ci.yml` |
| PR workflow | ✅ | `on: pull_request:` |
| Branch filtering | ✅ | `branches:`, `paths:` |
| Environment variables | ✅ | `env:` — all 3 levels |
| Contexts | ✅ | `github.*`, `runner.*`, `env.*` |
| Expressions & Conditions | ✅ | `if:` + status functions |
| `needs` | ✅ | All jobs chained correctly |
| Matrix | ✅ | Node 20/22/24 |
| Cache | ✅ | `cache: 'npm'` |
| Artifacts | ✅ | `upload` + `download` |
| Secrets | ✅ | `secrets-demo.yml` — DUMMY_API_KEY + GITHUB_TOKEN |
| Permissions | ⬜ | Level 15 |
| Environments | ⬜ | Level 16 |
| CD | ⬜ | Level 17 |
| Docker | ⬜ | Level 18 |
| Reusable workflow | ⬜ | Level 19 |
| Composite action | ⬜ | Level 20 |
| Debugging | ⬜ | Level 21 |
| Security | ⬜ | Level 22 |

---

## 🔧 Syntax Reference (Updated)

| Keyword | Purpose | Example |
|---|---|---|
| `${{ secrets.NAME }}` | Access a secret | `${{ secrets.DUMMY_API_KEY }}` |
| `${{ secrets.GITHUB_TOKEN }}` | Built-in token | `env: GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` |
| `${{ vars.NAME }}` | Access a GitHub Variable | `${{ vars.API_BASE_URL }}` |
| `${#VAR}` | Shell: string length (safe) | `echo ${#API_KEY}` |

---

## 📚 Official Documentation

- [Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)
- [Automatic token authentication](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication)
- [Variables vs Secrets](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables)
- [Security hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)

---

## 🧪 Exercise

Look at this workflow snippet and find **all 4 security mistakes**:

```yaml
name: Deploy

on: push

env:
  DATABASE_URL: postgresql://user:MyPassword123@db.example.com/prod
  API_KEY: sk-live-abc123def456

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Print config
        run: |
          echo "Connecting to: $DATABASE_URL"
          echo "API Key: ${{ secrets.API_KEY }}"

      - uses: some-random-org/deploy-action@latest
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          api_key: $API_KEY

      - name: Save key to file
        run: echo $API_KEY > api-key.txt

      - uses: actions/upload-artifact@v4
        with:
          name: config
          path: api-key.txt
```

**Find the 4 mistakes and explain why each is wrong.**

> ✋ **Write your answers. I'll review.**

---

```text
Progress:        14 / 23
Current Level:   Level 14 — Secrets
Concepts Learned: GitHub Secrets, ${{ secrets.* }}, masking,
                  GITHUB_TOKEN, secrets vs vars vs env:, what NOT to do
Files Created:   .github/workflows/secrets-demo.yml
Next Concept:    Level 15 — Permissions
Exercise:        Find 4 security mistakes in a workflow
```
