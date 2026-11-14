---
name: contract-studio
description: Use the Contract Studio framework to inspect, change, or implement functional nodes with linked requirements, frontend/backend bindings, and test evidence.
---

# Contract Studio

Use a functional node as the unit of work. The framework provides editing, persistence, context export, capability bindings, indexing and evidence; this skill guides the agent through those facilities.

Use the [framework entry points](../../../README.md#agent-的框架入口) to discover context and save changes. Before adding requirements, nodes or source markers, read [Sphinx-Needs / CodeLinks usage](../../../README.md#sphinx-needs-与-codelinks-用法). Consult the [node contract](../../../docs/design/skill-workbench.md) for property semantics.

## Node workflow

1. **Read context.** Query the target node (or parent for a new node): contract, importance, requirements, dependencies, direct implementation, gaps and evidence. Use `context.backend` for function scopes and acceptance-linked cases; keep related functions separate. Reconcile snapshots with saved state and draft previews. For a read-only request, report findings here.
2. **Save the contract.** Save responsibility, importance (`core` / `key` / `normal`), inputs, outputs, rules, errors and acceptance criteria to the owning JSON or authored RST source. Use spec fields and native links under `traceability/node-mapping.json`; the framework projects them into nodes and properties. Keep stable IDs and actual confirmation scope. Save the selected contract and task context before implementation.
3. **Implement with source markers.** Within authorization, implement behaviour, tests and included frontend operations. Reference the exact node spec ID in each function's `@need-ids:` (or a native `impl` with `:implements:`). Declare native `test` needs with `:verifies: REQ.AC` and use `[TEST_ID]` in runtime test names. Register only trusted execution routes, test files and frontend entries; relations come from the index.
4. **Refresh and report.** Run `node scripts/build-index.mjs`, then read the projected node, function scopes and acceptance-linked cases. Verify affected behaviour within authorization using actual execution evidence. Distinguish internal inputs from trial inputs, data flow from calls, and requirement links from execution coverage; report gaps and the usable entry.

## Framework invariants

- Edit each item's owning source: existing JSON contracts or authored Needs RST. Generated RST, node documents and indexes are derived; layout is separate from behaviour. Browser drafts become project state only when saved.
- Graph edits specify behaviour; execution requires a real capability binding. Keep unbound nodes pending and executable commands in the trusted registry.
- Requirement confirmation, source/index freshness and observed test results are separate states. Report the framework's actual state, including failed builds, stale evidence and unconnected tools.
