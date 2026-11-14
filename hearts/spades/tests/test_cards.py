"""Unit-тесты для модуля карт и колоды (cards.py)."""

from __future__ import annotations

import random
import sys
import unittest
from pathlib import Path

# Обеспечиваем доступ к модулям spades
_spades_dir = Path(__file__).resolve().parent.parent
_parent_dir = _spades_dir.parent
for _p in (str(_parent_dir), str(_spades_dir)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from spades.cards import Card, Deck, Rank, Suit
except ModuleNotFoundError:
    from cards import Card, Deck, Rank, Suit


class TestCards(unittest.TestCase):
    """Тестирование создания карт, мастей, рангов и сортировки."""

    def test_suit_properties(self) -> None:
        """Проверка свойств мастей: козырь и русские названия."""
        self.assertTrue(Suit.SPADES.is_trump)
        self.assertFalse(Suit.HEARTS.is_trump)
        self.assertFalse(Suit.DIAMONDS.is_trump)
        self.assertFalse(Suit.CLUBS.is_trump)

        self.assertEqual(Suit.SPADES.name_ru, "Пики")
        self.assertEqual(Suit.HEARTS.name_ru, "Червы")
        self.assertEqual(Suit.DIAMONDS.name_ru, "Бубны")
        self.assertEqual(Suit.CLUBS.name_ru, "Трефы")

    def test_rank_ordering(self) -> None:
        """Проверка старшинства рангов от 2 до Туза."""
        self.assertLess(Rank.TWO, Rank.THREE)
        self.assertLess(Rank.TEN, Rank.JACK)
        self.assertLess(Rank.JACK, Rank.QUEEN)
        self.assertLess(Rank.QUEEN, Rank.KING)
        self.assertLess(Rank.KING, Rank.ACE)
        self.assertEqual(Rank.ACE.symbol, "Т")
        self.assertEqual(Rank.KING.symbol, "К")
        self.assertEqual(Rank.QUEEN.symbol, "Д")
        self.assertEqual(Rank.JACK.symbol, "В")
        self.assertEqual(Rank.TEN.symbol, "10")

    def test_card_representation(self) -> None:
        """Проверка строкового представления карты."""
        card = Card(suit=Suit.SPADES, rank=Rank.ACE)
        self.assertEqual(str(card), "Т♠")
        self.assertEqual(card.full_name(), "Туз Пик")

        card2 = Card(suit=Suit.HEARTS, rank=Rank.TEN)
        self.assertEqual(str(card2), "10♥")
        self.assertEqual(card2.full_name(), "Десятка Черв")

    def test_card_sorting(self) -> None:
        """Проверка сортировки карт (пики справа, старшие карты в масти справа)."""
        c1 = Card(Suit.SPADES, Rank.ACE)
        c2 = Card(Suit.SPADES, Rank.KING)
        c3 = Card(Suit.HEARTS, Rank.ACE)
        c4 = Card(Suit.CLUBS, Rank.TWO)

        hand = [c1, c3, c2, c4]
        hand.sort()
        # В отсортированной руке слева направо: 2♣, Т♥, К♠, Т♠
        self.assertEqual(hand, [c4, c3, c2, c1])

    def test_card_parse_valid(self) -> None:
        """Проверка парсинга карт из строки в русской и английской нотации."""
        self.assertEqual(Card.parse("Т♠"), Card(Suit.SPADES, Rank.ACE))
        self.assertEqual(Card.parse("AS"), Card(Suit.SPADES, Rank.ACE))
        self.assertEqual(Card.parse("as"), Card(Suit.SPADES, Rank.ACE))
        self.assertEqual(Card.parse("10s"), Card(Suit.SPADES, Rank.TEN))
        self.assertEqual(Card.parse("10♥"), Card(Suit.HEARTS, Rank.TEN))
        self.assertEqual(Card.parse("10п"), Card(Suit.SPADES, Rank.TEN))
        self.assertEqual(Card.parse("kd"), Card(Suit.DIAMONDS, Rank.KING))
        self.assertEqual(Card.parse("2c"), Card(Suit.CLUBS, Rank.TWO))
        self.assertEqual(Card.parse("qч"), Card(Suit.HEARTS, Rank.QUEEN))
        self.assertEqual(Card.parse("вт"), Card(Suit.CLUBS, Rank.JACK))

    def test_card_parse_invalid(self) -> None:
        """Проверка реакции парсера на некорректный ввод."""
        self.assertIsNone(Card.parse(""))
        self.assertIsNone(Card.parse("   "))
        self.assertIsNone(Card.parse("invalid"))
        self.assertIsNone(Card.parse("15S"))
        self.assertIsNone(Card.parse("Ax"))
        self.assertIsNone(Card.parse(None))  # type: ignore


class TestDeck(unittest.TestCase):
    """Тестирование колоды и раздачи карт."""

    def test_deck_initialization(self) -> None:
        """Колода должна содержать ровно 52 уникальные карты."""
        deck = Deck()
        self.assertEqual(len(deck), 52)

        unique_cards = set(deck.cards)
        self.assertEqual(len(unique_cards), 52)

        for suit in Suit:
            suit_cards = [c for c in deck.cards if c.suit == suit]
            self.assertEqual(len(suit_cards), 13)

    def test_deck_shuffle(self) -> None:
        """Перемешивание колоды меняет порядок, но сохраняет состав."""
        deck = Deck()
        original_cards = list(deck.cards)
        rng = random.Random(42)
        deck.shuffle(rng)

        self.assertEqual(len(deck), 52)
        self.assertEqual(set(deck.cards), set(original_cards))
        # Порядок после shuffle(seed=42) должен измениться
        self.assertNotEqual(deck.cards, original_cards)

    def test_deck_deal(self) -> None:
        """Раздача на 4 игроков по 13 карт каждому."""
        deck = Deck()
        deck.shuffle(random.Random(123))
        hands = deck.deal(num_hands=4, cards_per_hand=13)

        self.assertEqual(len(hands), 4)
        for hand in hands:
            self.assertEqual(len(hand), 13)

        all_dealt = [card for hand in hands for card in hand]
        self.assertEqual(len(all_dealt), 52)
        self.assertEqual(len(set(all_dealt)), 52)
        self.assertEqual(len(deck), 0)

    def test_deck_deal_insufficient_cards(self) -> None:
        """Попытка раздать больше карт, чем есть, вызывает исключение."""
        deck = Deck()
        with self.assertRaises(ValueError):
            deck.deal(num_hands=4, cards_per_hand=14)  # 56 > 52


if __name__ == "__main__":
    unittest.main()
