"""Publish the full suite report, or print a selected run without saving it."""
import argparse
from inspect import getsourcefile
import json
import re
import unittest
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
TEST_ID = re.compile(r"test_(TEST_[A-Z0-9_]+)")


def case_id(test):
    match = TEST_ID.fullmatch(test.id().rsplit(".", 1)[-1])
    return match[1] if match else None


def iter_tests(suite):
    for test in suite:
        if isinstance(test, unittest.TestSuite):
            yield from iter_tests(test)
        else:
            yield test


class Report(unittest.TextTestResult):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.cases = {}

    def record(self, test, state, message=None):
        identifier = case_id(test)
        if identifier:
            case = {"id": identifier, "state": state}
            if message:
                case["message"] = message
            self.cases[test.id()] = case

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

    def addSubTest(self, test, subtest, err):
        super().addSubTest(test, subtest, err)
        if err:
            self.record(test, "failed", str(err[1]))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--test-id", action="append", help="Select a discovered stable test ID; repeat to select more")
    args = parser.parse_args()
    loader = unittest.TestLoader()
    suite = loader.discover(str(ROOT / "tests"))
    locations = {}
    if args.test_id:
        if loader.errors:
            parser.error("\n".join(loader.errors))
        tests = list(iter_tests(suite))
        selected = []
        for identifier in dict.fromkeys(args.test_id):
            matches = [test for test in tests if case_id(test) == identifier]
            if len(matches) != 1:
                parser.error(f"用例 {identifier} 必须在项目测试中唯一存在")
            test = matches[0]
            method = test.id().rsplit(".", 1)[-1]
            file = Path(getsourcefile(getattr(test, method))).resolve().relative_to(ROOT)
            locations[test.id()] = {"file": file.as_posix(), "symbol": f"{type(test).__qualname__}.{method}"}
            selected.append(test)
        suite = unittest.TestSuite(selected)

    result = unittest.TextTestRunner(verbosity=2, resultclass=Report).run(suite)
    report = {
        "version": 1,
        "completedAt": datetime.now(timezone.utc).isoformat(),
        "cases": [{**case, **locations.get(identity, {})} for identity, case in result.cases.items()],
    }
    if args.test_id:
        print(json.dumps(report, ensure_ascii=True))
    else:
        path = ROOT / "_build" / "test-results.json"
        path.parent.mkdir(exist_ok=True)
        temp = path.with_suffix(".tmp")
        temp.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        temp.replace(path)
    return not (result.testsRun and result.wasSuccessful())


if __name__ == "__main__":
    raise SystemExit(main())
