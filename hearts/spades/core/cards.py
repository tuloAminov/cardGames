"""Модуль для представления игральных карт, мастей, рангов и колоды.

В игре «Пики» используется стандартная колода из 52 карт.
Козырной мастью всегда являются пики (♠).
"""

from __future__ import annotations

from enum import Enum, IntEnum
import random
from dataclasses import dataclass
from typing import Optional


class Suit(str, Enum):
    """Масти карт."""

    SPADES = "♠"
    HEARTS = "♥"
    DIAMONDS = "♦"
    CLUBS = "♣"

    @property
    def name_ru(self) -> str:
        """Русское название масти."""
        names = {
            Suit.SPADES: "Пики",
            Suit.HEARTS: "Червы",
            Suit.DIAMONDS: "Бубны",
            Suit.CLUBS: "Трефы",
        }
        return names[self]

    @property
    def is_trump(self) -> bool:
        """Является ли масть козырной (пики)."""
        return self == Suit.SPADES

    @property
    def sort_order(self) -> int:
        """Порядок сортировки мастей в руке (пики справа)."""
        order = {
            Suit.CLUBS: 0,
            Suit.DIAMONDS: 1,
            Suit.HEARTS: 2,
            Suit.SPADES: 3,
        }
        return order[self]


class Rank(IntEnum):
    """Ранги карт от двойки до туза (старшинство)."""

    TWO = 2
    THREE = 3
    FOUR = 4
    FIVE = 5
    SIX = 6
    SEVEN = 7
    EIGHT = 8
    NINE = 9
    TEN = 10
    JACK = 11
    QUEEN = 12
    KING = 13
    ACE = 14

    @property
    def symbol(self) -> str:
        """Символ ранга на русском языке (В, Д, К, Т)."""
        symbols = {
            Rank.TWO: "2",
            Rank.THREE: "3",
            Rank.FOUR: "4",
            Rank.FIVE: "5",
            Rank.SIX: "6",
            Rank.SEVEN: "7",
            Rank.EIGHT: "8",
            Rank.NINE: "9",
            Rank.TEN: "10",
            Rank.JACK: "В",
            Rank.QUEEN: "Д",
            Rank.KING: "К",
            Rank.ACE: "Т",
        }
        return symbols[self]

    @property
    def name_ru(self) -> str:
        """Полное русское название ранга."""
        names = {
            Rank.TWO: "Двойка",
            Rank.THREE: "Тройка",
            Rank.FOUR: "Четверка",
            Rank.FIVE: "Пятерка",
            Rank.SIX: "Шестерка",
            Rank.SEVEN: "Семерка",
            Rank.EIGHT: "Восьмерка",
            Rank.NINE: "Девятка",
            Rank.TEN: "Десятка",
            Rank.JACK: "Валет",
            Rank.QUEEN: "Дама",
            Rank.KING: "Король",
            Rank.ACE: "Туз",
        }
        return names[self]


@dataclass(frozen=True)
class Card:
    """Представление отдельной игральной карты."""

    suit: Suit
    rank: Rank

    def __str__(self) -> str:
        return f"{self.rank.symbol}{self.suit.value}"

    def __repr__(self) -> str:
        return f"Card({self.rank.symbol}{self.suit.value})"

    def full_name(self) -> str:
        """Полное текстовое описание карты на русском языке."""
        suit_genitive = {
            Suit.SPADES: "Пик",
            Suit.HEARTS: "Черв",
            Suit.DIAMONDS: "Бубен",
            Suit.CLUBS: "Треф",
        }
        return f"{self.rank.name_ru} {suit_genitive[self.suit]}"

    def __lt__(self, other: object) -> bool:
        if not isinstance(other, Card):
            return NotImplemented
        # Сортировка: сначала по масти (пики справа), затем по возрастанию ранга (старшие карты справа)
        if self.suit != other.suit:
            return self.suit.sort_order < other.suit.sort_order
        return self.rank < other.rank

    @classmethod
    def parse(cls, text: str) -> Optional[Card]:
        """Разобрать строку карты в русской или английской нотации (например 'Т♠', '10♥', 'AS', 'kd', '10s')."""
        if not text or not isinstance(text, str):
            return None

        normalized = text.strip().replace(" ", "").upper()
        if not normalized:
            return None

        suit_map = {
            "♠": Suit.SPADES,
            "S": Suit.SPADES,
            "П": Suit.SPADES,
            "♥": Suit.HEARTS,
            "H": Suit.HEARTS,
            "Ч": Suit.HEARTS,
            "♦": Suit.DIAMONDS,
            "D": Suit.DIAMONDS,
            "Б": Suit.DIAMONDS,
            "♣": Suit.CLUBS,
            "C": Suit.CLUBS,
            "Т": Suit.CLUBS,
        }

        rank_map = {
            "2": Rank.TWO,
            "3": Rank.THREE,
            "4": Rank.FOUR,
            "5": Rank.FIVE,
            "6": Rank.SIX,
            "7": Rank.SEVEN,
            "8": Rank.EIGHT,
            "9": Rank.NINE,
            "10": Rank.TEN,
            "В": Rank.JACK,
            "J": Rank.JACK,
            "Д": Rank.QUEEN,
            "Q": Rank.QUEEN,
            "К": Rank.KING,
            "K": Rank.KING,
            "Т": Rank.ACE,
            "A": Rank.ACE,
            "11": Rank.JACK,
            "12": Rank.QUEEN,
            "13": Rank.KING,
            "14": Rank.ACE,
        }

        if normalized.startswith("10"):
            rank_part = "10"
            suit_part = normalized[2:]
        elif normalized.startswith(("11", "12", "13", "14")):
            rank_part = normalized[:2]
            suit_part = normalized[2:]
        else:
            rank_part = normalized[0]
            suit_part = normalized[1:]

        if rank_part not in rank_map:
            return None

        if suit_part == "Т":
            matched_suit = Suit.CLUBS
        elif suit_part in suit_map:
            matched_suit = suit_map[suit_part]
        else:
            return None

        return cls(suit=matched_suit, rank=rank_map[rank_part])


class Deck:
    """Стандартная колода из 52 карт."""

    def __init__(self, cards: Optional[list[Card]] = None) -> None:
        if cards is not None:
            self._cards: list[Card] = list(cards)
        else:
            self._cards = [
                Card(suit=suit, rank=rank)
                for suit in Suit
                for rank in Rank
            ]

    def __len__(self) -> int:
        return len(self._cards)

    @property
    def cards(self) -> list[Card]:
        """Список карт в колоде."""
        return list(self._cards)

    def shuffle(self, rng: Optional[random.Random] = None) -> None:
        """Перемешивание колоды."""
        if rng is not None:
            rng.shuffle(self._cards)
        else:
            random.shuffle(self._cards)

    def deal(self, num_hands: int = 4, cards_per_hand: int = 13) -> list[list[Card]]:
        """Раздать карты игрокам.

        :param num_hands: Число игроков (по умолчанию 4).
        :param cards_per_hand: Карт на игрока (по умолчанию 13).
        :return: Список списков карт для каждого игрока.
        """
        required = num_hands * cards_per_hand
        if len(self._cards) < required:
            raise ValueError(
                f"Недостаточно карт для раздачи: требуется {required}, имеется {len(self._cards)}"
            )

        hands: list[list[Card]] = [[] for _ in range(num_hands)]
        # Раздача по одной карте по кругу
        card_idx = 0
        for _ in range(cards_per_hand):
            for hand_idx in range(num_hands):
                hands[hand_idx].append(self._cards[card_idx])
                card_idx += 1

        self._cards = self._cards[card_idx:]
        return hands
