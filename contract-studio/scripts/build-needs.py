"""Build the supported index and record CodeLinks' project-relative URL roots."""
import json
from pathlib import Path
import sys
import tomllib

from sphinx.cmd.build import build_main

source, output = (Path(value).resolve() for value in sys.argv[1:3])
result = build_main(["-E", "-a", "-W", "-b", "needs", str(source), str(output)])
if result == 0:
    config = tomllib.loads((source / "ubproject.toml").read_text(encoding="utf-8"))
    aliases = {}
    for name, project in config.get("codelinks", {}).get("projects", {}).items():
        location = (source / project["source_discover"]["src_dir"]).resolve()
        relative = location.relative_to(source.parent).as_posix()
        # CodeLinks local code_url uses the source directory name as URL prefix.
        aliases[name] = relative
        aliases[location.name] = relative
    (output / "source-projects.json").write_text(json.dumps(aliases, indent=2), encoding="utf-8")
sys.exit(result)
