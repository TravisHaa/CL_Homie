# Agent Guidelines

Rules for Claude Code (and any other AI agent) working in this repo.

---

## Git Hygiene

- **Keep commits atomic:** commit only the files you touched and list each path explicitly.

  For tracked files:
  ```bash
  git commit -m "<scoped message>" -- path/to/file1 path/to/file2
  ```

  For brand-new files, stage them explicitly before committing:
  ```bash
  git restore --staged :/ && git add "path/to/file1" "path/to/file2" && git commit -m "<scoped message>" -- path/to/file1 path/to/file2
  ```

- **Always double-check `git status` before any commit.** Confirm only the intended files appear staged.

- Delete unused or obsolete files when your changes make them irrelevant (refactors, feature removals, etc.), and revert files only when the change is yours or explicitly requested. If a git operation leaves you unsure about other agents' in-flight work, stop and coordinate instead of deleting.

---

## File Safety

- **Before attempting to delete a file to resolve a local type/lint failure, stop and ask the user.** Other agents are often editing adjacent files; deleting their work to silence an error is never acceptable without explicit approval.

- **Never edit `.env` or any environment variable files.** Only the user may change them.

- Coordinate with other agents before removing their in-progress edits — do not revert or delete work you did not author unless everyone agrees.

- Moving and renaming files is allowed.

---

## Multi-Agent Coordination

- If a git operation leaves the working tree in a state you did not fully create, stop and describe the situation to the user before proceeding.
- Do not delete another agent's branch, worktree, or uncommitted changes without explicit approval.
