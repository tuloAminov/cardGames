"""Точка входа при вызове пакета: python -m spades [параметры]."""

from __future__ import annotations

import sys
from pathlib import Path

# Обеспечиваем доступ к модулям пакета
_current_dir = Path(__file__).resolve().parent
_parent_dir = _current_dir.parent
for p in (str(_current_dir), str(_parent_dir)):
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

if __name__ == "__main__":
    if "--web" in sys.argv:
        sys.argv.remove("--web")
        from web.app import app
        print("Запуск веб-сервера «Пики» на http://localhost:5000 ...")
        app.run(host="0.0.0.0", port=5000)
    else:
        from cli.main import main
        main()
