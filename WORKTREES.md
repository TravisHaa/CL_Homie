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

## How to see all worktrees

```bash
cd ~/Desktop/projects/CL/Homie
git worktree list
```

## Working on a feature

Just `cd` into the feature folder and work normally. Git commits, branches, and history all live in the main `Homie/` repo.

```bash
cd ~/Desktop/projects/CL/Homie-chores
# make changes, then:
git add -A
git commit -m "feat: implement chores screen"
```

## Merging a feature back to main

When a feature is ready:

```bash
cd ~/Desktop/projects/CL/Homie
git merge feature/chores
```

Repeat for each feature branch. Resolve any conflicts in `Homie/`.

## Removing a worktree after merging

```bash
# From inside Homie/
git worktree remove ../Homie-chores
git branch -d feature/chores
```

Or remove all feature worktrees at once when everything is merged:

```bash
for feature in chores calendar pantry shopping home; do
  git worktree remove ../Homie-$feature
  git branch -d feature/$feature
done
```

## Adding a new worktree (if you need a new feature branch)

```bash
cd ~/Desktop/projects/CL/Homie
git worktree add ../Homie-settings -b feature/settings
```

## Running the app

Always run the dev server from the **main** `Homie/` folder:

```bash
cd ~/Desktop/projects/CL/Homie
npx expo start --web      # browser at localhost:8081
npx expo start --ios      # iOS simulator
npx expo start --android  # Android emulator
```

## Firebase setup

Before the app works you need to create a Firebase project and fill in your keys:

```bash
cp .env.example .env
# then edit .env with your Firebase project values
```

Get your values from: Firebase Console → Project Settings → Your apps → Web app config.
