# Chore Recurrence

This doc describes how chore recurrence behaves from a user's perspective: what options you can pick when creating or editing a chore, how the app schedules each one, and how it interacts with Auto‑Rotate.

## Recurrence options

When you create or edit a chore, the **Recurrence** dropdown offers five choices:

- **Does not repeat** — a one‑time chore. Optionally pick a **Due Date**; with no due date it just lives on the list until it's completed. It will not uncross itself or rotate.
- **Daily** — fires every calendar day. It is automatically uncrossed each time the day rolls over, so a chore marked done Tuesday shows up un‑done again Wednesday.
- **Weekly** — fires once a week on a single day you pick (`S M T W T F S`). On any other weekday the chore is dormant.
- **Monthly** — fires once a month on the day‑of‑month you pick (1–31). For months that don't have that day (e.g. day 31 in February), the chore fires on the last day of that month instead.
- **Custom** — flexible interval. You choose:
  - **Repeat every N** with unit **days** or **weeks** (`N ≥ 1`).
  - If the unit is **weeks**, you also pick one or more days of the week the chore fires on (at least one is required).
  - If the unit is **days**, the chore fires every N days counted from the day you created it.

The schedule shown in the chore list and detail sheet is generated from these settings, e.g. *"Every Monday"*, *"Monthly on day 15"*, *"Every 2 weeks on Mon, Thu"*, *"Every 3 days"*.

## When chores uncross

The app runs a daily reset that decides whether a chore should appear un‑done again:

- **Daily** and **Custom every 1 day** — uncrossed every day boundary.
- **Weekly / Monthly / Custom multi‑day / Custom weeks** — uncrossed only when their next scheduled fire day arrives. Completing one of these "ahead of time" keeps it marked done until that next fire.
- **One‑time (Does not repeat)** — never auto‑uncrossed. Once you mark it done, it stays done.

## Assignment & Auto‑Rotate

Below the recurrence settings you assign the chore to a housemate, or pick **Auto Rotate**.

- **Auto Rotate** is offered for every recurring shape — **Daily**, **Weekly**, **Monthly**, and **Custom**. Only **One‑time** chores must be assigned to a specific person.
- Its default state mirrors the house‑wide *Weekly Scramble* switch in settings: if the master switch is on, new recurring chores default to Auto‑Rotate ON.
- When Auto‑Rotate is on, the app seeds the first holder for you (staggered across housemates so successive chores you create don't all land on the same person) and then rotates to the next housemate on every fire after the first one.
- The **first** occurrence always stays with the seeded housemate, so a chore you create today will not silently rotate away before you've seen it on the schedule. Rotation kicks in on the next fire and onward — for Daily chores that means the seeded housemate owns today, and the next housemate owns tomorrow.
- If you turn Auto‑Rotate off and pick a specific housemate, the chore stays with that person on every fire.

## Editing recurrence later

You can change a chore's recurrence, day‑of‑week, day‑of‑month, custom interval, or Auto‑Rotate setting at any time from its detail sheet. The new settings take effect on the next scheduled fire — already‑completed occurrences keep their completion state until the next uncross.

## Quick examples

- **"Wash dishes, daily, Auto‑Rotate"** — fires every day; today's seeded housemate owns it, then rotates to the next person tomorrow and each day after.
- **"Take out the trash, every Tuesday, Auto‑Rotate"** — fires every Tuesday; first Tuesday goes to the seeded housemate, then rotates to the next person each week.
- **"Pay rent, monthly on day 1"** — fires the 1st of each month; in months without enough days it would clamp to the last day (not relevant for day 1, relevant for day 31).
- **"Water plants, custom: every 3 days"** — counted from the day you created the chore; e.g. created Mon → fires Mon, Thu, Sun, Wed…
- **"Deep clean, custom: every 2 weeks on Sat"** — fires every other Saturday starting from the Saturday on/after creation.
- **"Buy birthday gift, does not repeat, due Fri"** — appears on this week's list (the week of the due date) and stays until marked done.
