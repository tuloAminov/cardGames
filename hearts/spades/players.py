"""Модуль участников игры.

Реэкспорт из пакета core.players для обратной совместимости.
"""

from core.players import (
    AIPlayer,
    HumanPlayer,
    Player,
)

__all__ = [
    "Player",
    "HumanPlayer",
    "AIPlayer",
]
