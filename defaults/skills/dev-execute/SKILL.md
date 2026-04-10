---
name: dev-execute
description: Plan execution engine. Parses plan sections, dispatches wave-based parallel plan-worker subagents with tier-aware model overrides (quick=haiku, mid=sonnet, senior=opus), verifies per-step done-when criteria, escalates failed tiers, accumulates cross-wave wisdom, runs post-wave tests, gates final verification by complexity, and delivers a structured dev_report section.
when-to-use: When a task has an approved plan section ready for implementation. Triggers after dev-planning completes. Do NOT use for planning, analysis, or review.
---

# Dev Execute

You are the execution engine. You take an approved plan and turn it into working code through orchestrated plan-worker subagents, wave-based parallelism, tier-optimized model routing, and layered verification.

## Phase 1: Load Plan

1. `get-task-sections` to retrieve all sections. Find the section with `type=plan`
2. Parse the plan section. Extract: complexity, waves, steps (with tier + files + done-when), conventions, must-not-have
3. If no plan section exists: `report-progress(status: blocked, message: "No plan section found")` and STOP
4. Derive complexity when not explicit: 1-2 steps = simple, 3-6 = standard, 7+ = complex
5. Codebase state escalation: if project is Chaotic/Legacy, escalate all `quick` tiers to `mid`
6. `report-progress(status: implementing, percentage: 5)`
7. `create-task-section(type: notes, title: "Execution Log")` for persistent state

## Phase 2: Execute

### Simple Plans (1-2 steps)

Implement directly. No worker subagents needed. Read existing code, follow plan, write implementation + tests, run tests. Skip to Phase 3.

### Standard and Complex Plans

Execute wave-by-wave. Each wave contains steps that can run in parallel.

#### 2a. Report Execution Strategy

Before launching workers, display via `report-progress`:

```
## Execution Strategy
**Plan**: [title] | **Steps**: N | **Waves**: N | **Complexity**: [simple/standard/complex]

### Wave 1 (parallel)
- Step 1: [title] - [tier] - [files]
- Step 2: [title] - [tier] - [files]

### Wave 2 (after Wave 1)
- Step 3: [title] - [tier] - depends on Steps 1, 2
```

#### 2b. Launch Workers (parallel per wave)

For each step in the current wave, spawn a plan-worker subagent:

```
Agent(
  subagent_type: "plan-worker",
  model: {tier_model},
  run_in_background: true,
  prompt: {step_briefing}
)
```

**Tier to Model Mapping:**

| Tier | Model | Reasoning Budget | Use Case |
|------|-------|-----------------|----------|
| `quick` | haiku | Minimal | Mechanical changes, single file, copy-paste patterns |
| `mid` | sonnet | Standard | Multi-file implementation, moderate logic (DEFAULT) |
| `senior` | opus | Deep | Cross-layer architecture, complex integrations |

#### 2c. Wave Barrier

Wait for ALL workers in the wave to complete. Never start the next wave early.

#### 2d. Per-Step Verification

For each completed worker:

1. Read worker output (changes + test results)
2. Verify done-when criteria: Read/Grep changed files, check each criterion
3. If ALL criteria met: proceed to diagnostics check
4. If ANY criterion unmet: **tier escalation retry** (see below)
5. Check LSP diagnostics on modified files. ERROR = fix before done. WARNING = log, continue

**Tier Escalation on Failure:**

| Original Tier | Retry Model | Max Retries |
|--------------|-------------|-------------|
| `quick` | sonnet (mid) | 1 |
| `mid` | opus (senior) | 1 |
| `senior` | no escalation | 0 |

Pass the failure context (what failed, why, worker output) to the retry worker. If retry also fails, mark step failed in execution log.

#### 2e. Wisdom Extraction

After verifying all steps in a wave:

1. Extract actionable patterns from worker outputs: naming conventions, DI style, file organization, gotchas, error patterns
2. Append to accumulated wisdom (max 5 items per wave, max 15 total). Skip generic statements, only keep actionable discoveries
3. `update-task-section` on execution log with: completed waves, failed steps with reasons, accumulated wisdom with wave/step annotations

#### 2f. Post-Wave Testing

Run the project's test suite for affected files after each wave:

1. Identify test files related to the wave's changes
2. Run targeted tests (not full suite)
3. If tests fail: identify which step caused the failure, attempt targeted fix
4. If fix fails: log as failed step in execution notes

#### 2g. Progress Update

`report-progress(percentage: {wave_progress})` calculated as: `(completed_waves / total_waves) * 70 + 10`

Repeat 2a-2g for each wave.

## Plan-Worker Briefing Templates

### Quick Tier (haiku)

Exhaustively explicit. Compensate for lower reasoning with complete context. Leave zero ambiguity.

```
## Your Task
**Assignment**: [Step N: title]

[Full step description with exact file paths, exact changes, before/after state.
Spell out every detail. Do not assume the worker can infer anything.]

**Files**: [absolute paths to every file]
**Done when**:
  [acceptance criteria, verbatim from plan]
**Conventions**: [project + plan conventions]

[If accumulated wisdom exists:]
**Wisdom from prior steps**: [wisdom items]

After changes: run tests/linters for affected files.
Summarize: files changed, verification results, issues found.
```

### Mid Tier (sonnet)

Structured briefing. Worker infers implementation details from description and criteria.

```
## Task
**Overall Goal**: [Plan title]
**Your Assignment**: [Step N: title]

[Full step description]

## Expected Outcome
**Files to Modify**: [paths]
**Acceptance Criteria**:
  [done-when criteria, verbatim from plan]
**QA**: [test scenarios from plan]

## Must Do
- Follow project conventions from CLAUDE.md + plan conventions
- Read existing files before modifying
- Implement ONLY your assigned step
- Run verification after changes

## Must NOT Do
- Modify files outside your step's scope
- Add bonus refactors or scope creep

[If accumulated wisdom exists:]
**Wisdom from prior steps**: [wisdom items]
```

### Senior Tier (opus)

Lean briefing. Trust the model to explore deeply and make sound architectural decisions.

```
## Task
**Overall Goal**: [Plan title]
**Your Assignment**: [Step N: title]

[Full step description]

## Expected Outcome
**Files**: [paths]
**Done when**: [criteria]

## Constraints
[Plan conventions + must-not-have items]

**Senior Tier**: Explore deeply before acting. Check edge cases, cross-cutting concerns, architectural impact. Trace downstream effects.

[If accumulated wisdom exists:]
**Wisdom from prior steps**: [wisdom items]
```

### Infrastructure Tier (for steps with Type: infra)

```
## Task (Infrastructure)
**Assignment**: [Step N: title]

[Full step description]

**Target**: [SSH connection string from plan]
**Commands**: [commands from plan step]
**Done when**: [acceptance criteria]

Execute commands via Bash tool (SSH to target). Verify done-when after each command group.

[If accumulated wisdom exists:]
**Wisdom from prior steps**: [wisdom items]
```

## Phase 3: Verify

After all waves complete, run the full test suite. Then apply layered verification gated by complexity.

### Verification Layers by Complexity

| Complexity | Layer 1 | Layer 2 |
|-----------|---------|---------|
| simple | plan-code-review (sonnet) | none |
| standard (normal) | plan-code-review (sonnet) | none |
| complex | plan-code-review (opus) | none |

**Layer 1: plan-code-review (ALL plans)**

Spawn `plan-code-review` agent (foreground). For simple/standard: sonnet model (default). For complex: opus model override. Three-stage check: plan compliance (done-when verification), spec compliance, and code quality. If BLOCKED: fix cited issues, re-run tests, re-submit.

**Verification order:** Layer 1 must pass before delivery. Complex plans get opus-level deep review.

### 3-Strike Rule

After 3 total verification failures across all layers:

1. Stop. Do not attempt more fixes
2. `create-task-section(type: notes, title: "Verification Failed")` with unmet criteria, attempts made, remaining issues
3. `report-progress(status: blocked, percentage: 90)`
4. Do NOT transition task. Leave in `in_progress` for human intervention

## Phase 4: Deliver

1. Git commit via `/git-master` (auto-detects commit style). You are in an isolated worktree, branch is checked out. Do NOT push (platform handles this). Do NOT switch branches (breaks worktree isolation)
2. Do NOT call `update-task` to change status. Pipeline manages transitions automatically
3. `create-task-section(type: dev_report)` with structured report (format below)
4. `report-progress(status: complete, percentage: 100)`

### Dev Report Format

```
## Summary
{1-2 sentence overview}

## Changes Made
- `file/path.ext:line` - {what changed and why}

## Tests
- `test/path.ext` - {what it verifies}
- Test command: `{command}` - {result: N passed, 0 failed}

## Execution Stats
- Complexity: {simple|standard|complex}
- Waves: {completed}/{total}
- Steps: {completed}/{total} ({failed} failed)
- Tier distribution: {N} quick, {N} mid, {N} senior
- Escalations: {N} (quick to sonnet: {N}, mid to opus: {N})
- Verification: plan-code-review {APPROVED|BLOCKED}

## Accumulated Wisdom
- {Patterns discovered during execution}

## Decisions
- {Non-obvious choices and why}

## Open Questions
- {Anything the reviewer should check}
```

## Failure Handling

| Scenario | Action |
|----------|--------|
| Worker returns incomplete output | Read changed files directly. If changes exist, verify manually and continue |
| Wave has mixed results | Continue to next wave ONLY if failed steps are not dependencies. Otherwise stop and report |
| Test suite fails after all waves | Isolate which wave introduced failure. Targeted fix. 3 attempts max, then 3-strike rule |
| Plan is unexecutable | Do NOT improvise. `report-progress(status: blocked)` with specific issues. Plan needs revision |
| Need clarification | Use `ask-user` MCP tool. Session pauses and resumes on answer |
