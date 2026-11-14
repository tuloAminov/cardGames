"""Модуль карт и колоды.

Реэкспорт из пакета core.cards для обратной совместимости.
"""

from core.cards import (
    Card,
    Deck,
    Rank,
    Suit,
)

__all__ = ["Card", "Deck", "Rank", "Suit"]
