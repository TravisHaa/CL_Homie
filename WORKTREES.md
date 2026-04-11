# Git Worktrees — Homie Dev Setup

## What's going on

This project uses **git worktrees** to develop multiple features in parallel. Each feature lives on its own branch, checked out into its own folder alongside the main repo. They all share the same git history — it's one repo, not five.

```
CL/
├── Homie/           → main branch (base scaffold, types, firebase config, auth)
├── Homie-chores/    → feature/chores branch
├── Homie-calendar/  → feature/calendar branch
├── Homie-pantry/    → feature/pantry branch
├── Homie-shopping/  → feature/shopping branch
└── Homie-home/      → feature/home branch
```

---

## Running parallel Claude agents (one per feature)

Each worktree gets its own tmux window with its own Claude agent. Open a new tmux window for each feature, `cd` into the worktree, and launch Claude.

### Step-by-step

**1. Open a new tmux window and name it**
```
Ctrl+b c        → create new window
Ctrl+b ,        → rename it (e.g. "chores")
```

**2. In that window, launch the agent**
```bash
cd ~/Desktop/projects/CL/Homie-chores
claude --dangerouslySkipPermissions "your task prompt here"
```

**3. Repeat for each feature** — each agent runs independently in its own window with no awareness of the others.

### Switching between windows
```
Ctrl+b w        → visual window picker
Ctrl+b 0-9      → jump to window by number
Ctrl+b n / p    → next / previous window
```

### Check on all agents at a glance
```bash
tmux list-windows     # see all open windows and their current command
```

---

## Prompting the agents

When you launch `claude` in a worktree, give it a focused prompt scoped to that feature. Example for the chores agent:

```bash
cd ~/Desktop/projects/CL/Homie-chores
claude --dangerouslySkipPermissions "Build the chores feature.
Implement app/(tabs)/chores.tsx and src/hooks/useChores.ts.
See src/types/index.ts for the Chore type.
See src/firebase/firestore.ts for choresCol().
Real-time updates via onSnapshot. Weekly view grouped by day."
```

Each agent only modifies files relevant to its feature. The base layer (types, firebase config, stores, auth) already exists on `main` and is shared across all worktrees.

---

## After agents finish — merging back to main

When a feature branch is ready, merge it into `main` from the `Homie/` directory:

```bash
cd ~/Desktop/projects/CL/Homie

git merge feature/chores
git merge feature/calendar
git merge feature/pantry
git merge feature/shopping
git merge feature/home
```

Resolve any conflicts in `Homie/` (unlikely since each agent touches different screen files).

## Removing worktrees after merging

```bash
# Remove one
git worktree remove ../Homie-chores
git branch -d feature/chores

# Remove all feature worktrees at once
for feature in chores calendar pantry shopping home; do
  git worktree remove ../Homie-$feature
  git branch -d feature/$feature
done
```

---

## Adding a new worktree for a new feature

```bash
cd ~/Desktop/projects/CL/Homie
git worktree add ../Homie-settings -b feature/settings
```

Then open a new tmux window, `cd` into `Homie-settings/`, and launch your agent.

## See all active worktrees

```bash
cd ~/Desktop/projects/CL/Homie
git worktree list
```

---

## Running the app

Always run the dev server from the **main** `Homie/` folder:

```bash
cd ~/Desktop/projects/CL/Homie
npx expo start --web      # browser at localhost:8081
npx expo start --ios      # iOS simulator
npx expo start --android  # Android emulator
```

---

## Firebase setup

Before the app works you need a Firebase project and your keys:

```bash
cp .env.example .env
# edit .env with your Firebase project values
```

Get values from: Firebase Console → Project Settings → Your apps → Web app config.
