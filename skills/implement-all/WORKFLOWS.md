# Implement All — workflows mode

Read this only when the run mode is **workflows**. A **wave** covers the current frontier with at most the configured concurrency limit, which defaults to 3; this wave loop replaces steps 4–5 of [SKILL.md](SKILL.md).

Tasks inside a wave are headless — no chat output and no stopping for user input — so the step 4 task prompt gets one amendment: replace its final question sentence with "If you hit a decision the issue doesn't settle, finish with status `question` and the question text in your structured result instead of inventing an answer." Questions come back as data; every wave starts from verified ground, because its Codex project task worktrees are created from the integration branch after the previous wave landed.

## Wave loop

While the frontier is non-empty:

1. **Dispatch the wave.** Check out the integration branch in the main repo, then create one independent Codex project task per selected frontier ticket, up to the concurrency limit. Give each task an isolated worktree starting from the integration branch and the amended prompt with explicit `$implement` and full Issue URL. Follow the model/thinking rule in SKILL.md. Require a structured result with:

   ```text
   number: ticket number
   branch: task branch containing the commit
   status: done | question
   question: question text when status is question
   summary: one line describing what landed or what blocks
   ```

2. Wait for the wave's Codex tasks to finish. Digest each dispatch and completion; do not relay task transcripts.
3. **Integrate the wave.** Merge each `done` branch into the integration branch per SKILL.md step 5 — smaller diff first, resolve conflicts yourself, a branch has landed only green.
4. **Park and flush.** Park every `question` result per the Question queue. The wave boundary is the flush point — nothing is running, so put the whole batch to the user with Codex structured user input now; answered tickets rejoin the next wave.
5. Re-query the frontier — landed merges unblock tickets — and loop.

Done when: the frontier is empty and every child ticket has landed or is reported parked.
