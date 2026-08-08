---
name: implement-all
description: Orchestrate parallel Codex project tasks to implement, merge, and report every open ticket under a parent issue. Optional run mode and concurrency arguments — foreground | background | workflows, with concurrency defaulting to 3 (e.g. `/implement-all 23 background 3`).
disable-model-invocation: true
---

# Implement All

You are the **orchestrator** for one task: the parent issue given as the argument, with an optional **run mode** and **concurrency limit** after it (e.g. `/implement-all 23 background 3`). Independent Codex project tasks implement tickets; you dispatch, integrate, and report. All merges land on the **integration branch**; the default branch (`main`/`master`) belongs to the user and is out of bounds.

Every tracker operation below — fetching issues, the frontier query, labels, comments — goes through `docs/agents/issue-tracker.md`. Its existence is gated in Read in: no tracker config, no implement-all.

**Green** means the project's own verification passes. Discover how this repo verifies — test suite, typecheck, lint, whatever its package scripts, CI config, or contributing docs define — and hold every branch to that, never to commands assumed from another project.

## Digest discipline

You are the filter between the tasks and the user. Everything you say to the user is a **digest**: one line per state transition, nothing relayed from task transcripts.

- `#31 dispatched`
- `#31 landed — merged, green; review leftovers logged as a comment on #31`
- `#31 parked — question queued (see Question queue)`

What a task did, tried, or said along the way stays with you; the user reads transitions and open questions only.

## Run modes

The run mode sets how Codex project tasks execute and when their branches arrive for integration. It comes from the second argument, or from the fleet question (step 3) when the argument didn't give one.

- **foreground** — create Codex project tasks with isolated worktrees as step 4 describes; the session displays task activity as they work. Integrate each branch the moment its task finishes.
- **background** — same task creation. Codex notifies you as each task completes — never poll or sit idle; the stretch between notifications is the natural moment to flush the question queue (step 6.3). Nothing from task transcripts is relayed into the chat; your digest lines are all the user sees.
- **workflows** — read [WORKFLOWS.md](WORKFLOWS.md) before dispatching; its wave loop replaces steps 4–5.

The concurrency limit comes from the third argument when provided and otherwise defaults to **3**.

## Process

### 1. Read in

- **Preflight.** Two things must exist before any branch is cut or task created: `docs/agents/issue-tracker.md`, and the `implement` skill in your available-skills listing (bare or plugin-namespaced, e.g. `mattpocock-skills:implement`). Anything missing → report exactly what's absent and stop. The user does the fixing themselves — install Matt Pocock's engineering skills, then run `/setup-matt-pocock-skills` — because both are user-invoked.
- Fetch the parent issue with its full body and comments — the spec.
- `CONTEXT.md` (if it exists) and every ADR the parent or its children reference.
- Enumerate the child tickets (sub-issues or task list, per the tracker doc) and verify each one's real state with the tracker — a ticket already closed is done, whatever the parent body says.
- Zero children found means the argument is not a parent — stop and tell the user before doing anything else. If the tracker shows the issue has a parent of its own, name that number; they likely passed a child ticket.

Done when: the preflight passed, the argument is confirmed a parent, and every child ticket is listed with its state (open/closed) and its blockers.

### 2. Integration branch

If the current branch is already a task branch for this work, use it; otherwise cut `task/<slug>` from the default branch. Every Codex project task worktree is created from it and its task branch is merged back into it. Stop before merging it to the default branch — that final merge is the user's.

### 3. Ask for the fleet

Ask the user with Codex structured user input before creating anything — all of it in one call:

- **Run mode** (foreground / background / workflows) — only when the argument didn't give one.

When creating Codex project tasks, omit `model` and `thinking` so each task inherits the user's configured defaults. Only pass either when the user explicitly supplied an override.

Done when: the mode is settled. Use the supplied concurrency limit, or 3 when none was supplied.

### 4. Dispatch by frontier

The **frontier** is the set of open children with no open blockers (frontier query per the tracker doc). Blocking edges alone define order — a ticket that must run last (e.g. a sweep that deliberately touches files the others touch) should be blocked by all its siblings; if you spot such a ticket without those edges, add them before dispatching.

Create one independent Codex project task per frontier ticket, up to the concurrency limit — executed per the run mode — each with:

- An isolated Codex worktree whose starting state is the current integration branch.
- This task, verbatim apart from the ticket number, full Issue URL, resolved `implement` skill name/path, and any amendment the run mode specifies:

> Use [$implement](<IMPLEMENT_SKILL_PATH>) to implement <FULL_TICKET_ISSUE_URL>. Satisfy that issue's acceptance criteria and keep your worktree green. Complete the full `$implement` flow, including its TDD, project verification, code-review, and commit requirements. End the commit message with `Fixes #NN`. SCOPE DISCIPLINE: implement exactly the issue. An adjacent problem gets fixed only if it is a real bleeding spot — an actual defect breaking this issue's own acceptance criteria; anything else, write up as a comment on the issue instead. If you hit a decision the issue doesn't settle, stop and report the question instead of inventing an answer. Report the task branch when done; do not merge it into the integration or default branch.

Done when: every available task slot has a frontier ticket running, or the frontier is exhausted.

### 5. Integrate

Merges are sequential — one branch fully landed before the next begins. As each task's branch arrives (when it arrives is set by the run mode):

1. Merge its task branch into the integration branch. When two finished branches touch the same area, merge the smaller diff first.
2. Run the project's verification. Resolve conflicts and integration breaks yourself, guided by both issues' intent; commit the resolution. The branch has landed only when the integration branch is green.
3. Remove the worktree, then re-query the frontier — a landed merge may unblock new tickets; dispatch them (step 4), without exceeding the concurrency limit.

Closing happens via the `Fixes #NN` commit messages when the user eventually merges to the default branch — leave issues open.

Done when: every child ticket's branch is merged and the integration branch is green, or the ticket is explicitly parked (see Question queue).

### 6. Question queue

The tracker is the queue: a question lives on its issue, so it survives however many tasks finish at once and even an orchestrator restart. When a task surfaces a question or stalls on a decision:

1. Answer it yourself from the issue body, the parent spec, the ADRs, or `CONTEXT.md` — most questions are already decided there. Product and config decisions come from the user or the docs, never from you.
2. Genuinely undecided in those sources → **park** the ticket: post the question as a comment on its issue, add the `needs-info` label (or this repo's string for it, per the triage label vocabulary), digest one line to the user, and keep the rest of implement-all moving.
3. **Flush the queue in batches**, at the moment you have nothing to merge and nothing to dispatch (you're only waiting on running tasks) or implement-all has drained. Gather every `needs-info` child and put all pending questions to the user with Codex structured user input (up to 3 per call; repeat if more) — one interruption, not five.
4. For each answer: record it as a comment on the issue, remove `needs-info`, create a fresh Codex project task/worktree from the current integration branch, and re-dispatch the ticket with the answer included in the task prompt.

Done when: no child carries `needs-info`, or the remaining ones are reported as parked in the final report.

### 7. Report

Finish with: tickets merged cleanly; tickets that needed conflict resolution and what you decided; everything escalated or left as issue comments; parked tickets and what unblocks them; whether the integration branch ends green.
