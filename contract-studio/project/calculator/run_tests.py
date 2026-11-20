"""Run this project's unittest suite and publish its local report."""
import json
import re
import unittest
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent


class Report(unittest.TextTestResult):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cases = []

    def record(self, test, state, message=None):
        match = re.fullmatch(r"test_(TEST_[A-Z0-9_]+)", test.id().rsplit(".", 1)[-1])
        if match:
            case = {"id": match[1], "state": state}
            if message:
                case["message"] = message
            self.cases.append(case)

    def addSuccess(self, test):
        super().addSuccess(test)
        self.record(test, "passed")

    def addFailure(self, test, err):
        super().addFailure(test, err)
        self.record(test, "failed", str(err[1]))

    def addError(self, test, err):
        super().addError(test, err)
        self.record(test, "failed", str(err[1]))

    def addSkip(self, test, reason):
        super().addSkip(test, reason)
        self.record(test, "skipped", reason)


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.discover(str(ROOT / "tests"))
    result = unittest.TextTestRunner(verbosity=2, resultclass=Report).run(suite)
    path = ROOT / "_build" / "test-results.json"
    path.parent.mkdir(exist_ok=True)
    temp = path.with_suffix(".tmp")
    temp.write_text(json.dumps({
        "version": 1,
        "completedAt": datetime.now(timezone.utc).isoformat(),
        "cases": result.cases,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(path)
    raise SystemExit(not (result.testsRun and result.wasSuccessful()))
