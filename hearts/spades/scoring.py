"""Модуль подсчёта очков.

Реэкспорт из пакета core.scoring для обратной совместимости.
"""

from core.scoring import (
    PlayerRoundRecord,
    ScoringConfig,
    ScoringEngine,
    TeamRoundScore,
    TeamState,
)

__all__ = [
    "PlayerRoundRecord",
    "ScoringConfig",
    "ScoringEngine",
    "TeamRoundScore",
    "TeamState",
]
