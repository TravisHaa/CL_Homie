# Chores rotate on a nightly server reset.

- One Cloud Function — clients only read.
- Anchored day-key math decides who fires today.
- Idempotent + catches up missed nights.

---

**Speaker notes (~30 s, ~80 words):**

Under the hood, every chore state change happens in one nightly Cloud
Function — the apps only read. It checks each chore against its anchor
day, uncrosses it if it's due, and rotates the assignee to the next
housemate. It's idempotent, so a missed night just catches up on the
next run. One guard: the very first occurrence sticks with the seeded
user, so a chore you create today won't silently rotate away before you
see it.
