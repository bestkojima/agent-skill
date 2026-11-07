---
name: contract-studio
description: Design and verify user-facing software features using one hierarchical contract graph and trusted backend language adapters.
---

# Contract Studio — lightweight Coding Agent rules

Use when building, modifying, testing, or explaining a feature in a project with `contracts/*.json`. The graph describes the **user-visible functional flow**; it is not the source call graph or a general-purpose workflow runtime.

## Six rules
1. **Read the one feature graph first.** Define/locate a functional node by input → processing → output/exception → UI effect. Keep only meaningful nested steps; don't turn every async function, thread or source file into a node.
2. **Maintain parent/child and edge semantics.** `parentId` means containment; `edges` means business/data dependencies. Record conditions for multiple out-edges and waiting for multiple in-edges. In-degree and out-degree come from the edges, not a cached field.
3. **Use a stable capability identifier.** Language-specific code binds through the trusted Adapter Registry. Switching Python/C++/Go/Java/etc. must not require duplicating the feature graph. Do not put executable Shell commands in JSON, or claim a drawn node already has an implementation.
4. **Tie UI operations to the feature.** React is the default frontend. Bind the real UI action, input and visible effects; verify by interaction, not only a screenshot or prose. Display intermediate input/output and error paths in the node inspector.
5. **Verify with evidence.** Execute the associated real test(s), and check the node contract and downstream effects. Mock means simulated; dry-run runs only **known side-effect-free** operations; sandbox writes require isolation and explicit approval. Unknown or changed backend binaries must never be run casually.
6. **Report honest status.** Mark success only from real test / trace output, preserve errors and logs, and verify code references against actual files and symbols. Without a supported language toolchain or UI E2E test, mark that part unverified rather than promising success.

## Development loop
Read graph → choose affected node → update contract → implement in backend adapter / React → run `npm run verify` → test real page → link verified code and trace → revisit upstream/downstream edges.

## Minimal backend contract
`stdin: JSON → stdout: JSON`, logs on stderr; the `server/adapters/index.mjs` whitelist chooses the executable and enforces timeouts and result schema. Start by reading `server/adapters/README.md`. Existing example capability: `feedback.validate`.

## Not in scope
Do not build an AST architecture visualizer, low-code interpreter, custom LLM runtime, unrestricted subprocess executor or second copy of the JSON graph. Cross-project integration requires adapting trusted execution bindings; a new UI-only node does not automatically become executable.
