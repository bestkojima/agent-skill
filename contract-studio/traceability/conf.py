project = 'Contract Studio traceability'
extensions = ['sphinx_needs', 'sphinx_codelinks']
master_doc = 'index'
exclude_patterns = ['_build']
needs_from_toml = 'ubproject.toml'

from pathlib import Path
import tomllib

_codelinks = tomllib.loads((Path(__file__).parent / 'ubproject.toml').read_text(encoding='utf-8'))['codelinks']
src_trace_config_from_toml = None
src_trace_set_local_url = _codelinks['set_local_url']
src_trace_projects = _codelinks['projects']
