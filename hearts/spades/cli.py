"""Консольный интерфейс игры «Пики».

Реэкспорт из пакета cli для обратной совместимости.
"""

from cli.view import (
    CLIView,
    format_card,
    format_hand_by_suits,
)

__all__ = ["CLIView", "format_card", "format_hand_by_suits"]
