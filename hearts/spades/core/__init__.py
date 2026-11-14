"""Пакет игровой логики «Пики» (Spades Core).

Содержит чистую библиотеку без зависимостей от консольного ввода-вывода (print / input).
"""

from .cards import Card, Deck, Rank, Suit
from .game import GameEvents, PlayedCard, SpadesGame, Trick
from .players import AIPlayer, HumanPlayer, Player
from .scoring import (
    PlayerRoundRecord,
    ScoringConfig,
    ScoringEngine,
    TeamRoundScore,
    TeamState,
)
from .session import GameSession

__all__ = [
    "Card",
    "Deck",
    "Rank",
    "Suit",
    "Player",
    "HumanPlayer",
    "AIPlayer",
    "ScoringConfig",
    "ScoringEngine",
    "TeamState",
    "TeamRoundScore",
    "PlayerRoundRecord",
    "PlayedCard",
    "Trick",
    "GameEvents",
    "SpadesGame",
    "GameSession",
]
