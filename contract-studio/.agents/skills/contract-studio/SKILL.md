---
name: contract-studio
description: Use the Contract Studio framework to inspect, change, or implement functional nodes with linked requirements, frontend/backend bindings, and test evidence.
---

# Contract Studio

Use a functional node as the unit of work. The framework provides editing, persistence, context export, capability bindings, indexing and evidence; this skill guides the agent through those facilities.

Read the [framework entry points](../../../README.md#agent-的框架入口) for the existing operations and commands. Consult the [node contract](../../../docs/design/skill-workbench.md) only when property semantics need clarification.

## Node workflow

1. **Read context.** Load the current graph, target node (or parent for a new node), linked requirements, direct dependencies, implementation references and evidence. Treat exported node tasks as snapshots and reconcile them with saved state. For a read-only request, report findings here.
2. **Save the contract.** Create or update the node's responsibility, importance (`core` / `key` / `normal`), inputs, outputs, rules, errors, acceptance criteria and requirement links through the framework's source and save path. Keep stable IDs and existing confirmation scope; record new confirmation only from the user. Save the selected contract and task context before implementation.
3. **Implement and bind.** When implementation is authorized, use the current agent session to implement the node's behaviour, frontend operation and tests. Divide functions by responsibility; one functional node may map to several functions. Preserve existing callers. Register the actual backend, frontend and test entry points, then bind the node to the trusted capability.
4. **Refresh and report.** Add requirement-ID references to code and tests, rebuild the framework index, and verify affected behaviour and frontend interactions within the task's authorization. Leave actual test evidence and remaining gaps available from the node; report its location and usable frontend entry.

## Framework invariants

- JSON is the editable authority; node documents, RST and indexes are derived. Browser drafts become project state only when saved.
- Graph edits specify behaviour; execution requires a real capability binding. Keep unbound nodes pending and executable commands in the trusted registry.
- Requirement confirmation, source/index freshness and observed test results are separate states. Report the framework's actual state, including failed builds, stale evidence and unconnected tools.
