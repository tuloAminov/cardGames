"""Unit-тесты для поведения игроков и искусственного интеллекта (players.py)."""

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
    from spades.game import Trick
    from spades.players import AIPlayer
except ModuleNotFoundError:
    from cards import Card, Deck, Rank, Suit
    from game import Trick
    from players import AIPlayer


class TestAIPlayer(unittest.TestCase):
    """Тестирование тактики и логики принятия решений ИИ."""

    def setUp(self) -> None:
        self.ai = AIPlayer(player_id=1, name="Север", team_id=1, rng=random.Random(42))

    def test_ai_bidding_range(self) -> None:
        """Ставка ИИ всегда находится в пределах 0-13."""
        deck = Deck()
        deck.shuffle(random.Random(100))
        hands = deck.deal()
        self.ai.receive_cards(hands[0])

        bid = self.ai.make_bid(current_bids={}, teammates_bid=None)
        self.assertGreaterEqual(bid, 0)
        self.assertLessEqual(bid, 13)

    def test_ai_nil_bidding_decision(self) -> None:
        """ИИ ставит Nil при слабой руке без тузов, королей и старших пик."""
        weak_hand = [
            Card(Suit.SPADES, Rank.TWO),
            Card(Suit.SPADES, Rank.FOUR),
            Card(Suit.HEARTS, Rank.TWO),
            Card(Suit.HEARTS, Rank.THREE),
            Card(Suit.HEARTS, Rank.FIVE),
            Card(Suit.DIAMONDS, Rank.TWO),
            Card(Suit.DIAMONDS, Rank.FOUR),
            Card(Suit.DIAMONDS, Rank.SIX),
            Card(Suit.CLUBS, Rank.TWO),
            Card(Suit.CLUBS, Rank.THREE),
            Card(Suit.CLUBS, Rank.FOUR),
            Card(Suit.CLUBS, Rank.FIVE),
            Card(Suit.CLUBS, Rank.SEVEN),
        ]
        self.ai.receive_cards(weak_hand)
        bid = self.ai.make_bid(current_bids={}, teammates_bid=4)
        self.assertEqual(bid, 0)

    def test_ai_high_bid_with_strong_hand(self) -> None:
        """ИИ рассчитывает больше взяток при наличии тузов и сильных пик."""
        strong_hand = [
            Card(Suit.SPADES, Rank.ACE),
            Card(Suit.SPADES, Rank.KING),
            Card(Suit.SPADES, Rank.QUEEN),
            Card(Suit.SPADES, Rank.JACK),
            Card(Suit.SPADES, Rank.TEN),
            Card(Suit.HEARTS, Rank.ACE),
            Card(Suit.HEARTS, Rank.KING),
            Card(Suit.DIAMONDS, Rank.ACE),
            Card(Suit.CLUBS, Rank.ACE),
            Card(Suit.CLUBS, Rank.TWO),
            Card(Suit.CLUBS, Rank.THREE),
            Card(Suit.DIAMONDS, Rank.TWO),
            Card(Suit.HEARTS, Rank.TWO),
        ]
        self.ai.receive_cards(strong_hand)
        bid = self.ai.make_bid(current_bids={}, teammates_bid=None)
        self.assertGreaterEqual(bid, 6)

    def test_ai_choose_card_always_legal(self) -> None:
        """Выбор карты ИИ всегда строго соответствует правилам игры."""
        deck = Deck()
        deck.shuffle(random.Random(77))
        hand = deck.deal()[0]
        self.ai.receive_cards(hand)

        # 1. Первый ход во взятке, пики не сломаны
        trick1 = Trick(trick_number=1)
        card1 = self.ai.choose_card(trick=trick1, spades_broken=False)
        valid1 = self.ai.get_valid_moves(trick1.led_suit, spades_broken=False)
        self.assertIn(card1, valid1)

        # 2. Ход в масть
        trick2 = Trick(trick_number=2)
        other_player = AIPlayer(player_id=0, name="Другой", team_id=0)
        trick2.add_card(other_player, Card(Suit.HEARTS, Rank.KING))

        card2 = self.ai.choose_card(trick=trick2, spades_broken=False)
        valid2 = self.ai.get_valid_moves(trick2.led_suit, spades_broken=False)
        self.assertIn(card2, valid2)

    def test_ai_protects_teammate_nil(self) -> None:
        """ИИ перебивает карту напарника, если напарник заявил Nil и сейчас лидирует."""
        teammate = AIPlayer(player_id=3, name="Напарник", team_id=1)
        teammate.bid_value = 0  # Nil

        trick = Trick(trick_number=1)
        trick.add_card(teammate, Card(Suit.HEARTS, Rank.NINE))

        # У ИИ есть Туз черв (бьет 9) и 3 черв (не бьет)
        c_ace = Card(Suit.HEARTS, Rank.ACE)
        c_three = Card(Suit.HEARTS, Rank.THREE)
        self.ai.receive_cards([c_ace, c_three])
        self.ai.bid_value = 3

        chosen = self.ai.choose_card(trick=trick, spades_broken=False)
        # ИИ должен перебить напарника Тузом, спасая его ставку Nil
        self.assertEqual(chosen, c_ace)

    def test_ai_discards_when_teammate_winning(self) -> None:
        """ИИ сбрасывает младшую карту, если напарник уверенно забирает взятку."""
        teammate = AIPlayer(player_id=3, name="Напарник", team_id=1)
        teammate.bid_value = 3

        trick = Trick(trick_number=1)
        trick.add_card(teammate, Card(Suit.HEARTS, Rank.ACE))

        c_low = Card(Suit.HEARTS, Rank.THREE)
        c_high = Card(Suit.HEARTS, Rank.KING)
        self.ai.receive_cards([c_low, c_high])
        self.ai.bid_value = 2

        chosen = self.ai.choose_card(trick=trick, spades_broken=False)
        self.assertEqual(chosen, c_low)

    def test_ai_nil_player_ducks(self) -> None:
        """Если ИИ играет со ставкой Nil, он сбрасывает старшую карту, которая не бьёт стол (подныривает)."""
        self.ai.bid_value = 0  # Nil

        opponent = AIPlayer(player_id=0, name="Соперник", team_id=0)
        trick = Trick(trick_number=1)
        trick.add_card(opponent, Card(Suit.HEARTS, Rank.TEN))

        c_safe_high = Card(Suit.HEARTS, Rank.NINE)  # < 10, безопасно сбросить
        c_safe_low = Card(Suit.HEARTS, Rank.TWO)    # < 10, лучше приберечь
        c_danger = Card(Suit.HEARTS, Rank.ACE)      # > 10, возьмет взятку!
        self.ai.receive_cards([c_safe_high, c_safe_low, c_danger])

        chosen = self.ai.choose_card(trick=trick, spades_broken=False)
        # Должен сбросить 9 черв, чтобы избавиться от опасной старшей карты без взятия
        self.assertEqual(chosen, c_safe_high)

    def test_ai_bid_boost_when_partner_nil(self) -> None:
        """ИИ повышает свою ставку, если напарник объявил Nil."""
        hand = [
            Card(Suit.SPADES, Rank.ACE),
            Card(Suit.HEARTS, Rank.KING),
            Card(Suit.DIAMONDS, Rank.QUEEN),
            Card(Suit.CLUBS, Rank.SEVEN),
        ]
        self.ai.receive_cards(hand)

        bid_normal = self.ai.make_bid(current_bids={}, teammates_bid=2)
        bid_with_nil_partner = self.ai.make_bid(current_bids={}, teammates_bid=0)

        self.assertGreater(bid_with_nil_partner, bid_normal)


if __name__ == "__main__":
    unittest.main()
