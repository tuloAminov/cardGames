"""Пакет unit-тестов игры «Пики»."""

import sys
from pathlib import Path

_tests_dir = Path(__file__).resolve().parent
_spades_dir = _tests_dir.parent
_parent_dir = _spades_dir.parent

for _p in (str(_parent_dir), str(_spades_dir)):
    if _p not in sys.path:
        sys.path.insert(0, _p)
