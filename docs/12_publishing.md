# Putting it on GitHub

I haven't run any of this. It publishes the project, so it's yours to run.

- GitHub account: `bhaveenthank`
- Repo: `bhaveenthan-manichchilambu`, public, on the `main` branch
- Repo link: https://github.com/bhaveenthank/bhaveenthan-manichchilambu

## 1. Make the empty repo

On github.com, go to **New repository**:

- **Repository name:** `bhaveenthan-manichchilambu`
- **Description:** "Maṇichchilambu (மணிச்சிலம்பு): a knowledge graph of Silappatikāram and Maṇimēkalai"
- **Visibility:** Public, so your supervisor can open it.
- Leave **"Add a README", ".gitignore" and "license" all unticked.** The project already has a README and .gitignore. An extra first commit on GitHub would make the push below fail.

Or, from the terminal, if `gh` is logged in:

```bash
gh repo create bhaveenthank/bhaveenthan-manichchilambu --public --description "Maṇichchilambu (மணிச்சிலம்பு): a knowledge graph of Silappatikāram and Maṇimēkalai"
```

## 2. Commit and push to main

Do this between runs of the line pass, not while it's writing. The pass's half-finished file (`*.partial`) is ignored anyway.

```bash
cd ~/Documents/Twin_Epics
```

Your name and email, as they'll show on every commit. Change them if you want something else:

```bash
git config --global user.name "Bhaveenthan"
```

```bash
git config --global user.email "e22051@eng.pdn.ac.lk"
```

```bash
git init -b main
```

```bash
git add .
```

Check what's going in. `.venv`, `web/node_modules`, `web/dist`, `.claude` and `data/llm_cache` should **not** be in this list:

```bash
git status --short | head -60
```

```bash
git commit -m "Maṇichchilambu: knowledge graph, method and web app for Silappatikāram and Maṇimēkalai"
```

```bash
git remote add origin https://github.com/bhaveenthank/bhaveenthan-manichchilambu.git
```

```bash
git push -u origin main
```

If it asks for a password, GitHub wants a personal access token, not your account password. Running `gh auth login` once avoids this.

## 3. The site on GitHub Pages (optional)

The repo carries a workflow, `.github/workflows/pages.yml`, that builds the site on every push to `main`. Until Pages is switched on, that workflow shows a red ✗ on the repo. Either switch Pages on:

```bash
gh api -X POST repos/bhaveenthank/bhaveenthan-manichchilambu/pages -f build_type=workflow
```

```bash
gh workflow run pages.yml
```

Then the site is at **https://bhaveenthank.github.io/bhaveenthan-manichchilambu/**. You can do the same on the website: Settings, then Pages, then Source: GitHub Actions.

If you'd rather keep only Netlify, disable the workflow so it stays quiet:

```bash
gh workflow disable pages.yml --repo bhaveenthank/bhaveenthan-manichchilambu
```

## 4. Updating later

```bash
cd ~/Documents/Twin_Epics && ./run_all.sh > reports/last_run.log 2>&1 && git add . && git commit -m "Update the graph" && git push
```

## If something goes wrong

| What you see | What to do |
|---|---|
| `git push` is rejected, "fetch first" | The repo was made with a README. Run `git pull origin main --allow-unrelated-histories`, then push again |
| `remote origin already exists` | `git remote set-url origin https://github.com/bhaveenthank/bhaveenthan-manichchilambu.git` |
| The workflow fails at the tests | Run `npm --prefix web test` here and fix what it reports |
| The workflow fails at deploy | Settings → Pages → Source: GitHub Actions |

## Decisions for you

- **`data/llm_cache/` is left out of git on purpose.** It's the record of every model prompt and answer. Your paper will probably need it public for reproducibility. When you're ready, remove that line from `.gitignore`.
- **Licence.** There isn't one yet, which means others can't legally reuse your code. MIT is common for code, and CC BY for the data. The Tamil text stays under Project Madurai's terms, which allow free distribution if their header is kept. Our raw copy in `data/raw/` keeps it.
- **Netlify.** The Netlify address still carries the old name. To match the new name, go to Project configuration, then General, then Change project name, and enter `manichchilambu`. Then upload the new `web/dist`.
