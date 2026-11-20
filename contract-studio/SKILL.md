---
name: contract-studio
description: Set up or use Contract Studio for functional-node development, connecting node properties, Sphinx-Needs requirements, CodeLinks function references, frontend operations, and test evidence.
---

# Contract Studio

Develop through functional contracts. The target project owns its entry point, UI and tests and runs with the workbench closed. The workbench projects nodes, source links and evidence. A node can contain several functions.

## Enter the project

Use the existing workbench when present. For an authorized new setup, initialize the bundled neutral template using [workbench setup](references/workbench.md#setup). Copy the template into a new or empty directory; keep the user's existing application and technology choices intact. The template starts with one root group and no business capabilities.

## Work on a node

1. **Read its context.** Use the [workbench entry points](references/workbench.md#node-operations) to discover the feature and fetch the node or its parent. Read the owning source, direct functions, dependencies, gaps and current evidence. A read-only request ends with findings, without saving or executing.
2. **Save the contract.** Capture responsibility, importance, inputs, outputs, rules, errors and observable acceptance in the owning JSON or authored RST. Read [node contracts](references/node-contract.md) when shaping properties or functions. Keep stable IDs and confirmation scope; persist the selected contract and task context before implementation.
3. **Implement inside the project.** Add or update the actual entry point, behaviour and tests. Write exact spec markers and native acceptance links using [Needs and CodeLinks](references/needs-codelinks.md). Keep the Module Interface small. For project-owned reports use the [independent project seam](references/workbench.md#independent-projects); embedded execution and frontend registration require a separate request.
4. **Refresh and demonstrate.** Run `node scripts/build-index.mjs` in the workbench. Read the resulting node context to check properties, direct functions and acceptance-linked tests. Verify affected behaviour through its public Interface within the task's authorization. Report the usable entry, actual evidence and remaining gaps.

## Preserve the framework's meaning

- Edit the owning source once. Generated RST, indexes and node documents are derived; browser drafts become project state only when saved. Layout stays separate from behaviour.
- Semantic associations come from Needs and CodeLinks. An indexed function can be implemented without an executable workbench binding.
- Requirement confirmation, index freshness and test execution are separate states. Missing, unmatched and stale evidence cannot establish a passing result.
