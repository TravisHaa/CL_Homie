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

Each feature gets its own pane in a single tmux session. All 5 agents are visible at once in a tiled layout. Each worktree contains an `AGENT_PROMPT.md` file with the full task — agents are launched with the prompt pre-loaded so no pasting is needed.

### Launch the full session (first time or after a restart)

```bash
# Kill any existing session first
tmux kill-session -t homie 2>/dev/null

# Create session with 5 tiled panes
tmux new-session -d -s homie -x 220 -y 55
tmux split-window -t homie:0 -v
tmux split-window -t homie:0 -v
tmux split-window -t homie:0 -v
tmux split-window -t homie:0 -v
tmux select-layout -t homie tiled

# Expo dev server in a background window
tmux new-window -t homie -n _server
tmux send-keys -t homie:_server "cd /Users/travisha/Desktop/projects/CL/Homie && npx expo start --web" Enter

# Launch all 5 agents with their prompts pre-loaded
tmux send-keys -t homie:0.0 "cd /Users/travisha/Desktop/projects/CL/Homie-chores && claude --dangerously-skip-permissions \"\$(cat AGENT_PROMPT.md)\"" Enter
sleep 1
tmux send-keys -t homie:0.1 "cd /Users/travisha/Desktop/projects/CL/Homie-calendar && claude --dangerously-skip-permissions \"\$(cat AGENT_PROMPT.md)\"" Enter
sleep 1
tmux send-keys -t homie:0.2 "cd /Users/travisha/Desktop/projects/CL/Homie-pantry && claude --dangerously-skip-permissions \"\$(cat AGENT_PROMPT.md)\"" Enter
sleep 1
tmux send-keys -t homie:0.3 "cd /Users/travisha/Desktop/projects/CL/Homie-shopping && claude --dangerously-skip-permissions \"\$(cat AGENT_PROMPT.md)\"" Enter
sleep 1
tmux send-keys -t homie:0.4 "cd /Users/travisha/Desktop/projects/CL/Homie-home && claude --dangerously-skip-permissions \"\$(cat AGENT_PROMPT.md)\"" Enter

# Attach
tmux attach -t homie
```

> **`--dangerously-skip-permissions`** lets agents edit/create files without pausing to ask approval on every action. Safe here because each agent is isolated in its own worktree — review with `git diff` before merging to main. Remove the flag if you want to manually approve each action.

### Resuming after running out of credits or restarting

If agents stop mid-task (credits ran out, machine restarted, etc.):

```bash
# Re-run the exact same launch script above — it kills the old session and starts fresh.
# Each agent will read its AGENT_PROMPT.md and resume by reading the existing files
# in the worktree to understand what's already been done.
```

You can also resume a single agent manually:
```bash
cd /Users/travisha/Desktop/projects/CL/Homie-chores
claude --dangerously-skip-permissions "$(cat AGENT_PROMPT.md)"
# Claude will read the existing files and pick up where it left off
```

Or if you just want to check what an agent completed so far:
```bash
cd /Users/travisha/Desktop/projects/CL/Homie-chores
git diff main  # see everything the agent has done relative to main
```

### Navigating the session
```
tmux attach -t homie       → attach to session
Ctrl+b 0                   → jump to panes window (all 5 agents)
Ctrl+b w                   → visual window/pane picker
Ctrl+b arrow keys          → move between panes
Ctrl+b z                   → zoom a pane to full screen (toggle)
Ctrl+b _server             → switch to expo server window
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
