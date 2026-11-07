# Backend Adapter Interface

The unified capability is `feedback.validate`. To add a new language, implement one executable or launcher with the contract:

- One JSON input object on stdin, UTF-8, max 12 KB.
- Exactly one JSON output object on stdout, UTF-8; stderr for diagnostics.
- Successful exit code 0; process nonzero exit / malformed result / timeout = failure.
- `valid` outputs `{status:'valid',input:{title,category,detail}}`; `invalid` outputs `{status:'invalid',code,message}`.
- No side effects for this example. A different capability may define approved side effects but must have real sandboxing for dry-run.

The trusted registry in `index.mjs` controls the commands and source paths. No `shell:true`, and no command is accepted from untrusted `contract.json`, user input, or UI. Compiled outputs are placed in `_build/` and rebuilt on first use during a fresh process.

Recommended libraries for full-production JSON adapters: Node `JSON`, Python `json`, Go `encoding/json`, Java Jackson, C++ nlohmann/json, Rust serde_json, C# System.Text.Json, PHP json_decode/encode. The demo's C++ and Java stdlib parsers intentionally handle only the known flat string fields.

If an adapter is unavailable or returns output that disagrees with canonical validation rules, the app reports failure rather than marking it green. Language-specific tests must include success, validation failure, non-ASCII data and escaped strings.
