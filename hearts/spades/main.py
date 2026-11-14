"""Главная точка входа для запуска консольной игры «Пики» (CLI)."""

from __future__ import annotations

import sys
from pathlib import Path

# Обеспечиваем доступ к пакетам spades, core и cli
CURRENT_DIR = Path(__file__).resolve().parent
PARENT_DIR = CURRENT_DIR.parent
for p in (str(CURRENT_DIR), str(PARENT_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    if hasattr(sys.stderr, "reconfigure"):
        try:
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

from cli.main import main

if __name__ == "__main__":
    main()
