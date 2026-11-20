---
name: contract-studio
description: Use the Contract Studio framework to inspect, change, or implement functional nodes with linked requirements, frontend/backend bindings, and test evidence.
---

# Contract Studio

Use a functional node as the unit of work. Keep the target application's entry point, UI, tests and report producer in the project. The workbench projects nodes, source links and evidence; the application runs independently of it.

Use the [framework entry points](../../../README.md#agent-的框架入口) to discover context and save changes. Before adding requirements, nodes or source markers, read [Sphinx-Needs / CodeLinks usage](../../../README.md#sphinx-needs-与-codelinks-用法). Consult the [node contract](../../../docs/design/skill-workbench.md) for property semantics and Module design.

## Node workflow

1. **Read context.** Query the target node (or parent for a new node): contract, importance, requirements, dependencies, direct implementation, gaps and evidence. Use `context.backend` for function scopes and acceptance-linked cases; keep related functions separate. Reconcile snapshots with saved state and draft previews. For a read-only request, report findings here.
2. **Save the contract.** Save responsibility, importance (`core` / `key` / `normal`), inputs, outputs, rules, errors and acceptance criteria to the owning JSON or authored RST source. Use spec fields and native links under `traceability/node-mapping.json`; the framework projects them into nodes and properties. Keep stable IDs and actual confirmation scope. Save the selected contract and task context before implementation.
3. **Implement inside the project.** Mark functions with exact spec IDs using `@need-ids:`. Declare tests with `@need test`, a stable ID and `:verifies: REQ.AC, SPEC_ID`. Use the spec ID only when the test directly checks that node. Match project-owned reports by test ID.
4. **Refresh and report.** Run `npm run index:build`, then read the projected node, function scopes and acceptance-linked cases. Verify affected behaviour through the Module's public Interface within authorization using actual execution evidence. Distinguish internal inputs from trial inputs, data flow from calls, and requirement links from execution coverage; report gaps and the usable entry.

## Framework invariants

- For native Needs, author one RST source under the Sphinx document tree and register it in `index.rst` via `toctree`. Keep layout in the graph and functions/tests in the application; connect them by IDs. Preserve existing JSON ownership when present. Browser drafts become project state only when saved.
- A node with indexed source can be implemented without a registered execution route. Keep missing, unmatched and stale evidence distinct from passing results.
- Requirement confirmation, source/index freshness and observed test results are separate states. Report the framework's actual state, including failed builds, stale evidence and unconnected tools.
