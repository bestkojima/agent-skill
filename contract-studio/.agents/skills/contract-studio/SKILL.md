---
name: contract-studio
description: Design, implement, or review user-facing features through functional nodes that connect requirements, frontend operations, backend code, and test evidence. Use for Contract Studio or projects adopting this node-driven development workflow.
---

# Contract Studio

Use the functional graph to carry a feature from the user's intent to an operable interface and verified behaviour. A node represents a meaningful capability or business step and may map to several functions.

## Establish the assignment

- For analysis or discussion, inspect requirements, graph, code and evidence without implementing changes or running tests unless requested.
- For requirement changes, resolve the outcome, inputs, visible behaviour, exceptions and acceptance criteria. Ask about material choices; choose ordinary details yourself. Record confirmation only when the user gives it, and retain exactly what was confirmed.
- For authorized implementation, follow the affected nodes through backend, frontend and tests. Preserve existing entry points, requirements, drafts and behaviour outside the change.
- In the bundled workbench, use the user's current Codex session to implement the saved node task. Graph edits change the specification; business code controls execution. An in-app model dispatcher or a graph execution engine requires a separate design decision.

For work on the bundled project, read the [project guide](../../../README.md) for its actual commands and data sources. When changing node semantics, consult the [accepted design](../../../docs/design/skill-workbench.md) and [glossary](../../../GLOSSARY.md). For other projects, retain their authoritative sources, frontend and build tools rather than copying the demo's structure.

When adopting this workflow in another repository and its source mapping or index setup is missing, read [External project quick start](references/external-project.md). Map existing sources first; use the minimal setup only for missing pieces.

When asked to evaluate this skill, use the [skill evaluation protocol](../../../docs/skill-evaluation.md). Assess whether an independent agent can apply it to a fresh task; keep example-project test results separate from evidence of reusable skill behaviour.

## Develop a complete feature

1. **Define and save the node contract.** Give the node a stable identity, responsibility, parent, input/output constraints and examples, processing rules, exceptions and acceptance criteria. Keep requirement text in its authoritative source; reference it from nodes. Support several requirements per node and several nodes per requirement without duplicating the text. Save the selected contract before editing business implementation.
2. **Save the implementation context.** Include the selected node and its dependencies, linked requirements, confirmed scope, existing functions and callers, frontend entry, test references and acceptance conditions. Mark missing or stale references. Derive the readable node document and Codex handoff from these sources and save them before step 3; exported documents are snapshots. This ordering adds no approval rounds for already authorized work.
3. **Implement by responsibility.** Separate input handling, business validation, pure computation, orchestration and presentation where their responsibilities differ. Reuse shared helpers while preserving each caller's contract: a new feature's constraints must not silently relax or tighten existing ones. Show helper functions in implementation details rather than turning each into a feature node.
4. **Connect the frontend.** Every user-facing capability needs an actual operation, input handling, success result and failure feedback. Use the real backend result for values, steps and graph highlights. Track missing frontend entry, missing implementation and missing evidence separately. Register only trusted runtime entry points; a draft node stays pending until connected.
5. **Refresh traceability and verify.** Regenerate derived documents and build the supported index. Resolve code and test references to actual files. Exercise affected success and failure paths and the actual frontend. If the project has a workbench or the task includes building one, also check the affected graph expansion, node creation, side-panel editing, save/reopen and source navigation. Compare the result with the original acceptance criteria before reporting completion.

## Keep the graph and side panel useful

Apply the workbench interaction guidance only to projects with a workbench or tasks that request one. Other projects can use functional node data and derived documents alongside their existing interface.

Start with input → main capability → result. Expand complex capabilities into meaningful stages. Parent relationships express containment; edges express business or data dependencies, including branch conditions where needed. Preserve saved layout and old entry points when consolidating views.

Let the user add children in the graph and edit the selected node in a side panel. Group identity, behaviour contract, implementation/frontend links and evidence. Separate browser drafts from project saves. Show a missing execution binding as pending rather than offering an action that will fail. Keep descriptions readable and provide progressively disclosed structured input/output fields when useful.

Use motion to communicate selection, expansion and execution, with reduced-motion support. Inspect the actual render and interactions; a build or screenshot alone does not establish the whole user path.

## Use the real requirement index

Sphinx-Needs parses structured engineering objects and their relationships. CodeLinks extracts source references such as `@need-ids:`. ubCode provides compatible indexing, diagnostics and CLI/MCP tooling. Codex does the natural-language interpretation and implementation.

Keep one editable authority. In the bundled project, JSON owns requirements, confirmation records and graph data; generated RST feeds the real Sphinx-Needs/CodeLinks build. Existing RST-based projects keep their source. Consumers read a normalized index, and source previews and editor navigation resolve the same references. Preserve multiple locations and configured source-project aliases.

Show source-document synchronization separately from index build state. If source saving succeeds but indexing fails, retain the saved work and report the failed or stale index. Identify explicitly supported compatibility scanners by their actual origin. An exported RST file or local marker scan does not count as a Sphinx or ubCode run.

The bundled workflow must work with Sphinx-Needs and CodeLinks without ubCode. Report ubCode as connected only after its tool and applicable project license are available and its output is consumed. Keep unindexed languages and missing references visible without silently dropping existing access.

## Keep evidence and authority distinct

- Requirement confirmation records approved content. Preserve the scope of old confirmations; newly added acceptance conditions require their own confirmation.
- Source and test links establish traceability. Actual test reports establish their observed pass/fail results; a single node trial and a mock are different evidence.
- Store execution records separately from graph specifications. Mark evidence stale when relevant code or behaviour changes; display-only movement does not change a requirement's approval.
- Run only known project capabilities and fixed, trusted test commands. Never execute commands from graph JSON or browser input. A `dry-run` label guarantees no writes only when the called implementation does; use authorized isolated data for write paths.

Deliver the usable feature or requested assessment, the decisive evidence, and any remaining failed or unverified acceptance condition with its next action.
