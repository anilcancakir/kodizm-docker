---
name: dev-planning
description: Development planning workflow — codebase investigation, complexity estimation, structured plan generation, and plan review. Produces Wave/Step plans consumed by dev-execute. Applies to any task requiring a structured implementation plan before coding begins.
when-to-use: Any task that needs an implementation plan before coding. Triggered when asked to plan a feature, analyze a task, or produce a development plan for a Lead Developer role.
---

# Development Planning

You investigate the codebase, estimate complexity, and produce a structured plan. You do not write code — you produce plans that the execution phase follows exactly.

## Phase 1: Load Context

1. `get-task` — read description, acceptance criteria, existing sections
2. Read the PM's `analysis` section if present
3. `report-progress(status: planning, percentage: 5)`

## Phase 2: Investigate

Estimate complexity first from the task description, then launch investigation accordingly.

**Simple (1-2 steps):** Direct Grep/Read on known files — no agents needed.

**Normal (3-6 steps):** Parallel investigation:
- 1 Explore agent: conventions, similar implementations, callers
- 1 librarian agent: official docs if external library involved

**Complex (7+ steps):** Parallel investigation:
- 2 Explore agents: conventions + organization, impact scope + test coverage
- 1 librarian agent: official docs, API references
- Self-assess: stress-test the approach, surface risks before planning

After investigation, assess codebase state: **Disciplined** (follow patterns) / **Transitional** (follow new direction) / **Legacy** (improve, don't copy) / **Chaotic** (establish from scratch).

`report-progress(percentage: 20)`

## Phase 3: Pre-Plan Analysis (complexity-gated)

**Simple:** Skip — proceed to Phase 4.

**Normal:**
1. Self-analyze: context sufficiency, hidden requirements, gaps in the task description
2. Identify MUST DO / MUST NOT directives for your plan
3. If ambiguity remains: resolve via further investigation or `ask-user` MCP tool

**Complex:**
1. Deep analysis before planning:
   - Context sufficiency: hidden requirements, gaps, unstated assumptions
   - Effort estimation: prerequisites, codebase fit, dependency ordering
   - Stress-test: challenge the approach, surface risks and alternatives
2. Synthesize all findings into plan directives
3. If ambiguity remains: resolve before proceeding

`report-progress(percentage: 40)`

## Phase 4: Create Development Plan

Apply `my-coding` skill — plans must align with project coding standards. Apply `my-language` skill to all written output.

### Tier System

| Tier | Files | When | Verbosity |
|------|-------|------|-----------|
| `quick` | 1 | Mechanical: config, rename, scaffold, boilerplate | Verbose — exact commands, before/after state |
| `mid` | 1-3 | Standard implementation, business logic. **DEFAULT** | Standard — description + acceptance criteria |
| `senior` | 3+ | Cross-layer, architecture, migration, complex edge cases | Lean — high-level + constraints |

**Codebase state escalation:** Chaotic or Legacy — escalate all `quick` to `mid`. Transitional or Disciplined — no change.

### Wave Construction Rules

- Steps within a wave MUST touch different files (file-exclusive parallelism)
- Steps across waves MAY touch the same files (sequential execution)
- Group independent steps into the same wave for parallel execution
- Dependent steps go into later waves

`report-progress(percentage: 60)`

## Phase 5: Plan Review (complexity-gated)

**Simple:** Skip — save plan directly.

**Normal:**
1. Spawn `plan-review` agent with the plan content
2. If REJECT: fix cited issues, re-submit (max 2 iterations)
3. If OKAY: proceed to Phase 6

**Complex:**
1. Spawn `plan-review` agent (opus override): comprehensive review including adversarial checks, reference verification, AI-slop detection
2. If REJECT: fix cited issues, re-submit (max 2 iterations)
3. If OKAY: proceed to Phase 6

`report-progress(percentage: 90)`

## Phase 6: Deliver

1. `create-task-section(type: plan)` — save the structured plan (format below)
2. DO NOT call `update-task` to change status — the pipeline advances automatically
3. `report-progress(status: planned, percentage: 100)`

---

## Plan Format

```markdown
## Development Plan

**Complexity**: simple | normal | complex
**Steps**: {total count}
**Waves**: {wave count}
**Codebase State**: disciplined | transitional | legacy | chaotic

### Wave 1

#### Step 1: {imperative title}
- **Tier**: quick | mid | senior
- **Files**: {comma-separated absolute paths}
- **Done when**:
  - {verifiable criterion 1}
  - {verifiable criterion 2}
- **QA**: {test scenario or command + expected result}

#### Step 2: {imperative title}
- **Tier**: mid
- **Files**: {paths — MUST NOT overlap with Step 1}
- **Done when**:
  - {criterion}
- **QA**: {scenario + expected result}

### Wave 2 (depends on Wave 1)

#### Step 3: {title}
...

### Conventions
- {Pattern from codebase to follow — file:line reference}

### Must NOT
- {Forbidden change or pattern}
- {File or module to leave untouched}

### Risks
- {Open questions, assumptions, unresolved gaps}
```

### Plan Quality Rules

- Every step has tier, files list, done-when, and QA
- Done-when criteria are verifiable (testable, greppable, readable) — never vague
- Files are absolute paths that exist in the codebase
- Conventions reference actual code patterns (file:line) — not generic advice
- Must NOT section prevents scope creep — always include for normal/complex

### Complexity Reference

| Steps | Complexity | Pre-Plan Analysis | Plan Review |
|-------|-----------|-------------------|-------------|
| 1-2 | simple | skip | skip |
| 3-6 | normal | self-analysis | plan-review (sonnet) |
| 7+ | complex | deep self-analysis | plan-review (opus) |
