---
name: contract-studio
description: Design, trace, implement, or review user-facing features using a functional graph that links confirmed requirements to code and tests. Use for Contract Studio and projects adopting its requirement-to-feature traceability workflow.
---

# Contract Studio

Keep a feature understandable from the user's requirement through its functional graph, implementation, tests, and observed behaviour. The graph models meaningful user-visible steps, not every function or source file; editing a node does not itself change the application.

## Match the work to the request

- For analysis or discussion, inspect the existing requirements, graph, code and evidence; explain gaps without changing the project or running tests unless requested.
- For a new or changed requirement, establish its outcome, inputs, visible effects, exceptions and acceptance criteria with the user. Resolve ordinary details yourself; leave material choices open. Record a requirement as confirmed only after the user actually confirms it. A substantive edit returns it to draft until reconfirmed.
- For authorized implementation, use confirmed requirements and the affected functional nodes to guide changes; preserve existing entry points and behaviour outside the requested change. Do not assume an unchanged requirement authorizes unrelated work.
- Run checks suited to the requested work and project instructions. Report what was actually observed, failed or remains unverified; a mock, source annotation or diagram alone is not a passing test.

## One traceable chain

1. **Requirement.** Keep one authoritative, versioned requirement record with a stable ID, user-facing behaviour, acceptance criteria and confirmation status. Reuse an existing Sphinx-Needs source where the project already has one. If a project uses a different authoritative format, make any Sphinx-Needs export a clearly derived view, and regenerate it when the source changes.
2. **Feature graph.** Link meaningful React Flow feature nodes to requirement IDs. `parentId` expresses containment; edges express business or data dependencies. Record branch conditions and join behaviour where they matter. Keep the graph's structure authoritative in one place rather than maintaining a second graph by hand.
3. **Implementation and tests.** Associate each requirement with real source and test locations. Where Sphinx-CodeLinks is adopted, use its `@need-ids:` annotations and its supported language formats; avoid claiming that an annotation proves the implementation is correct. Resolve references against actual files, report missing or stale links and distinguish code from test evidence. If code is generated or cannot be annotated, record a verifiable location using the project's existing convention.
4. **Evidence.** Connect actual test results and runtime traces to their feature nodes when available. Clearly distinguish confirmed requirements, implementation links, test links, mock output, execution failures and unverified behaviour. Follow changes upstream and downstream, including tests and related nodes.

## Make the structure usable

Start with the user-facing path from input through the main capability to its result. Group a complex capability under a parent node and let the user expand it to see meaningful stages; keep containment separate from the edges that carry data or branch outcomes. Use names and input/output descriptions that explain the business action rather than exposing every function call. Preserve an existing graph’s semantics and saved edits when adding a presentation.

Selecting a node should make its requirement and its actual implementation and test references easy to find. Display draft or confirmed status separately from test evidence; a discovered source marker is a link, not a test result. If a reference is absent, show that gap instead of inventing coverage. Where a runnable example is requested, connect its controls, displayed result, steps and graph highlights to the same real execution. Show errors and partial steps from that execution, and keep fixed fixtures visibly distinct from live results.

Inspect the rendered view and exercise the main interaction, expanding and collapsing a group, following a requirement to source and tests, and running a representative success and failure when those capabilities are in scope. Keep any existing noninteractive or read-only use usable.

## Sphinx-Needs, CodeLinks and ubCode

Sphinx-Needs defines and relates needs; Sphinx-CodeLinks can extract traceability markers from code; ubCode provides a Rust-based indexer, editor tooling, CLI and MCP for compatible projects. Choose the tools already installed and licensed for the project. Inspect their actual output before claiming they ran; a local marker scan or an exported RST file is not a Sphinx or ubCode build. Preserve multiple code and test references, and surface unsupported languages or tools rather than silently treating them as covered.

For the bundled example, read the project README for the authoritative requirement store, generated Sphinx-Needs material, current traceability endpoints, and supported run commands. Keep it usable without requiring a third-party commercial license. When integrating another project, adapt to that project's requirements, frontend and build tools instead of assuming the demo's commands or files exist.

## Runtime boundary

Only invoke known, trusted backend capabilities. The demo's adapter registry selects fixed commands and enforces execution limits; never take executable shell commands from graph JSON or browser input. Dry-run is side-effect-free only when the called operations actually are; use isolated, authorized test data for writes. A feature graph is a planning and evidence view, not an unrestricted workflow executor.
