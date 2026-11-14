"""Unit-тесты для игровой логики, взяток и валидации ходов (game.py)."""

from __future__ import annotations

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
    from spades.cards import Card, Rank, Suit
    from spades.game import SpadesGame, Trick
    from spades.players import AIPlayer, Player
    from spades.scoring import ScoringConfig
except ModuleNotFoundError:
    from cards import Card, Rank, Suit
    from game import SpadesGame, Trick
    from players import AIPlayer, Player
    from scoring import ScoringConfig


class DummyPlayer(Player):
    """Тестовая заглушка игрока для проверки правил."""

    def make_bid(self, current_bids: dict[int, int], teammates_bid: int | None) -> int:
        return 1

    def choose_card(self, trick: Trick, spades_broken: bool) -> Card:
        moves = self.get_valid_moves(trick.led_suit, spades_broken)
        return moves[0]


class TestTrickWinner(unittest.TestCase):
    """Тестирование определения победителя взятки."""

    def setUp(self) -> None:
        self.p0 = DummyPlayer(0, "P0", 0)
        self.p1 = DummyPlayer(1, "P1", 1)
        self.p2 = DummyPlayer(2, "P2", 0)
        self.p3 = DummyPlayer(3, "P3", 1)

    def test_single_suit_highest_card_wins(self) -> None:
        """Все сыграли в масть: побеждает старшая карта масти взятки."""
        trick = Trick(trick_number=1)
        trick.add_card(self.p0, Card(Suit.HEARTS, Rank.TEN))
        trick.add_card(self.p1, Card(Suit.HEARTS, Rank.KING))
        trick.add_card(self.p2, Card(Suit.HEARTS, Rank.TWO))
        trick.add_card(self.p3, Card(Suit.HEARTS, Rank.SEVEN))

        winner, winning_card = trick.get_current_winner()
        self.assertEqual(winner, self.p1)
        self.assertEqual(winning_card, Card(Suit.HEARTS, Rank.KING))

    def test_off_suit_without_trump_loses(self) -> None:
        """Сброс старшей карты другой некозырной масти не перебивает масть взятки."""
        trick = Trick(trick_number=1)
        trick.add_card(self.p0, Card(Suit.HEARTS, Rank.TEN))
        trick.add_card(self.p1, Card(Suit.DIAMONDS, Rank.ACE))  # Сброс Туза бубен
        trick.add_card(self.p2, Card(Suit.HEARTS, Rank.TWO))
        trick.add_card(self.p3, Card(Suit.CLUBS, Rank.ACE))     # Сброс Туза треф

        winner, winning_card = trick.get_current_winner()
        self.assertEqual(winner, self.p0)
        self.assertEqual(winning_card, Card(Suit.HEARTS, Rank.TEN))

    def test_trump_beats_high_lead_card(self) -> None:
        """Младший козырь (пика) бьет Туза открытой некозырной масти."""
        trick = Trick(trick_number=1)
        trick.add_card(self.p0, Card(Suit.HEARTS, Rank.ACE))
        trick.add_card(self.p1, Card(Suit.SPADES, Rank.TWO))    # Козырь 2♠
        trick.add_card(self.p2, Card(Suit.HEARTS, Rank.KING))
        trick.add_card(self.p3, Card(Suit.HEARTS, Rank.QUEEN))

        winner, winning_card = trick.get_current_winner()
        self.assertEqual(winner, self.p1)
        self.assertEqual(winning_card, Card(Suit.SPADES, Rank.TWO))

    def test_higher_trump_beats_lower_trump(self) -> None:
        """Старший козырь перебивает младший козырь."""
        trick = Trick(trick_number=1)
        trick.add_card(self.p0, Card(Suit.CLUBS, Rank.KING))
        trick.add_card(self.p1, Card(Suit.SPADES, Rank.FIVE))
        trick.add_card(self.p2, Card(Suit.SPADES, Rank.JACK))   # Перебивает 5♠
        trick.add_card(self.p3, Card(Suit.CLUBS, Rank.ACE))

        winner, winning_card = trick.get_current_winner()
        self.assertEqual(winner, self.p2)
        self.assertEqual(winning_card, Card(Suit.SPADES, Rank.JACK))

    def test_trump_led_trick(self) -> None:
        """Если взятка открыта пикой, побеждает старшая пика."""
        trick = Trick(trick_number=1)
        trick.add_card(self.p0, Card(Suit.SPADES, Rank.TEN))
        trick.add_card(self.p1, Card(Suit.SPADES, Rank.ACE))
        trick.add_card(self.p2, Card(Suit.SPADES, Rank.TWO))
        trick.add_card(self.p3, Card(Suit.SPADES, Rank.KING))

        winner, winning_card = trick.get_current_winner()
        self.assertEqual(winner, self.p1)
        self.assertEqual(winning_card, Card(Suit.SPADES, Rank.ACE))


class TestValidMoves(unittest.TestCase):
    """Тестирование правил допустимости ходов."""

    def setUp(self) -> None:
        self.player = DummyPlayer(0, "Игрок", 0)

    def test_cannot_lead_spades_when_not_broken(self) -> None:
        """Нельзя начинать с пик, пока пики не сломаны, если есть другие карты."""
        c_spade = Card(Suit.SPADES, Rank.ACE)
        c_heart = Card(Suit.HEARTS, Rank.TEN)
        self.player.receive_cards([c_spade, c_heart])

        valid = self.player.get_valid_moves(led_suit=None, spades_broken=False)
        self.assertNotIn(c_spade, valid)
        self.assertIn(c_heart, valid)

    def test_can_lead_spades_when_only_spades_remain(self) -> None:
        """Можно начинать с пик, даже если они не сломаны, если на руке только пики."""
        c1 = Card(Suit.SPADES, Rank.ACE)
        c2 = Card(Suit.SPADES, Rank.KING)
        self.player.receive_cards([c1, c2])

        valid = self.player.get_valid_moves(led_suit=None, spades_broken=False)
        self.assertEqual(set(valid), {c1, c2})

    def test_can_lead_spades_when_broken(self) -> None:
        """Если пики уже сломаны, можно начинать ход с любой карты, включая пики."""
        c_spade = Card(Suit.SPADES, Rank.ACE)
        c_heart = Card(Suit.HEARTS, Rank.TEN)
        self.player.receive_cards([c_spade, c_heart])

        valid = self.player.get_valid_moves(led_suit=None, spades_broken=True)
        self.assertIn(c_spade, valid)
        self.assertIn(c_heart, valid)

    def test_must_follow_suit_when_holding_it(self) -> None:
        """Игрок обязан ходить в масть взятки, если на руке есть эта масть."""
        c_h1 = Card(Suit.HEARTS, Rank.TEN)
        c_h2 = Card(Suit.HEARTS, Rank.TWO)
        c_spade = Card(Suit.SPADES, Rank.ACE)
        c_club = Card(Suit.CLUBS, Rank.KING)
        self.player.receive_cards([c_h1, c_h2, c_spade, c_club])

        valid = self.player.get_valid_moves(led_suit=Suit.HEARTS, spades_broken=False)
        self.assertEqual(set(valid), {c_h1, c_h2})

    def test_can_play_any_card_when_void_in_lead_suit(self) -> None:
        """Если в масти взятки карт нет (void), разрешено ходить любой картой (пикой или сбросом)."""
        c_spade = Card(Suit.SPADES, Rank.TEN)
        c_club = Card(Suit.CLUBS, Rank.ACE)
        c_diamond = Card(Suit.DIAMONDS, Rank.SEVEN)
        self.player.receive_cards([c_spade, c_club, c_diamond])

        # Открыта масть Червы, которой нет у игрока
        valid = self.player.get_valid_moves(led_suit=Suit.HEARTS, spades_broken=False)
        self.assertEqual(set(valid), {c_spade, c_club, c_diamond})


class TestGameRoundIntegration(unittest.TestCase):
    """Интеграционные тесты для полного раунда игры."""

    def test_complete_round_simulation(self) -> None:
        """Симуляция полного раунда с 4 ИИ игроками."""
        import random
        from spades.game import SpadesGame
        from spades.players import AIPlayer

        rng = random.Random(42)
        players = [
            AIPlayer(0, "Игрок 0", team_id=0, rng=rng),
            AIPlayer(1, "Игрок 1", team_id=1, rng=rng),
            AIPlayer(2, "Игрок 2", team_id=0, rng=rng),
            AIPlayer(3, "Игрок 3", team_id=1, rng=rng),
        ]
        game = SpadesGame(players=players, rng=rng)

        score0, score1 = game.play_round()

        # В раунде ровно 13 взяток в сумме
        total_tricks = sum(p.tricks_won for p in players)
        self.assertEqual(total_tricks, 13)

        # Все карты сыграны
        for p in players:
            self.assertEqual(len(p.hand), 0)

        # Обе команды получили результаты
        self.assertEqual(score0.team_id, 0)
        self.assertEqual(score1.team_id, 1)
        self.assertEqual(score0.tricks_won + score1.tricks_won, 13)

    def test_game_simulation_and_termination(self) -> None:
        """Симуляция полной партии из нескольких раундов до победы через SpadesGame.simulate."""
        import random
        rng = random.Random(999)

        # Симуляция быстрой партии до 100 очков
        winner, s0, s1, rounds = SpadesGame.simulate(
            target_score=100,
            scoring_config=ScoringConfig(target_score=100, bags_limit=6, bag_penalty_points=50, nil_points=50),
            rng=rng,
        )

        self.assertIn(winner, (0, 1))
        self.assertGreater(rounds, 0)
        # Команда-победитель должна набрать не менее target_score
        winner_score = s0 if winner == 0 else s1
        loser_score = s1 if winner == 0 else s0
        self.assertGreaterEqual(winner_score, 100)
        self.assertGreater(winner_score, loser_score)


if __name__ == "__main__":
    unittest.main()
