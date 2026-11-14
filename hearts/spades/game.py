"""Модуль управления игрой.

Реэкспорт из пакета core.game для обратной совместимости.
"""

from core.game import (
    GameEvents,
    PlayedCard,
    SpadesGame,
    Trick,
)

__all__ = [
    "PlayedCard",
    "Trick",
    "GameEvents",
    "SpadesGame",
]
