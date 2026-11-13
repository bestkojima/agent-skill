---
name: contract-studio
description: Use the Contract Studio framework to inspect, change, or implement functional nodes with linked requirements, frontend/backend bindings, and test evidence.
---

# Contract Studio

Use a functional node as the unit of work. The framework provides editing, persistence, context export, capability bindings, indexing and evidence; this skill guides the agent through those facilities.

Read the [framework entry points](../../../README.md#agent-的框架入口) and [Sphinx-Needs / CodeLinks usage](../../../README.md#sphinx-needs-与-codelinks-用法) as needed. Consult the [node contract](../../../docs/design/skill-workbench.md) for property semantics.

## Node workflow

1. **Read context.** Query the target node (or parent for a new node): contract, importance, requirements, dependencies, direct implementation, gaps and evidence. Use `context.backend` for function scopes and acceptance-linked cases; keep related functions separate. Reconcile snapshots with saved state and draft previews. For a read-only request, report findings here.
2. **Save the contract.** Save responsibility, importance (`core` / `key` / `normal`), inputs, outputs, rules, errors, acceptance criteria and requirement links through the framework. Describe actual function inputs separately from trial-adapter inputs. Keep stable acceptance IDs and existing confirmation scope; record new confirmation only from the user. Save the selected contract and task context before implementation.
3. **Implement and bind.** Within the authorized scope, implement behaviour and tests, plus frontend operations when included. Divide functions by responsibility and preserve callers. Register each node's direct file/symbol bindings and test cases with exact file/name and requirement/acceptance IDs; bind its trusted capability. Keep data-flow edges, declared calls and observed runtime calls distinct.
4. **Refresh and report.** Add `@need-ids: REQ_…` above implementations and `@need-ids: TEST_…` above registered tests. Run `node scripts/build-index.mjs` to derive RST and build Sphinx-Needs / CodeLinks indexes. Verify affected behaviour within authorization; use current scopes and per-case execution evidence, report gaps and the usable entry.

## Framework invariants

- JSON is the editable authority; node documents, RST and indexes are derived. Browser drafts become project state only when saved.
- Graph edits specify behaviour; execution requires a real capability binding. Keep unbound nodes pending and executable commands in the trusted registry.
- Requirement confirmation, source/index freshness and observed test results are separate states. Report the framework's actual state, including failed builds, stale evidence and unconnected tools.
