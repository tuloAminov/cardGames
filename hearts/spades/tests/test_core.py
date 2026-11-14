"""Unit-тесты для чистого пакета core/ и GameSession."""

from __future__ import annotations

import random
import unittest

from core.cards import Card, Deck, Rank, Suit
from core.players import AIPlayer, HumanPlayer
from core.scoring import ScoringConfig, ScoringEngine, TeamState, PlayerRoundRecord
from core.game import SpadesGame, Trick
from core.session import GameSession


class TestCoreImports(unittest.TestCase):
    """Проверка чистого импорта всех компонентов из пакета core."""

    def test_core_classes(self) -> None:
        self.assertIsNotNone(Card)
        self.assertIsNotNone(Deck)
        self.assertIsNotNone(Rank)
        self.assertIsNotNone(Suit)
        self.assertIsNotNone(HumanPlayer)
        self.assertIsNotNone(AIPlayer)
        self.assertIsNotNone(ScoringEngine)
        self.assertIsNotNone(TeamState)
        self.assertIsNotNone(PlayerRoundRecord)
        self.assertIsNotNone(SpadesGame)
        self.assertIsNotNone(Trick)
        self.assertIsNotNone(GameSession)


class TestGameSession(unittest.TestCase):
    """Тестирование сессионного менеджера GameSession."""

    def setUp(self) -> None:
        self.rng = random.Random(42)
        self.session = GameSession(player_name="Тестер", target_score=500, rng=self.rng)

    def test_session_initial_state(self) -> None:
        state = self.session.get_state()
        self.assertEqual(state["phase"], GameSession.PHASE_BIDDING)
        self.assertEqual(state["round_number"], 1)
        self.assertEqual(len(state["hand"]), 13)
        self.assertTrue(state["is_human_turn"])

    def test_session_play_full_trick(self) -> None:
        # Человек делает ставку 3
        state = self.session.make_bid(player_id=0, bid=3)
        self.assertEqual(state["phase"], GameSession.PHASE_PLAYING)
        self.assertEqual(len(state["bids"]), 4)

        # Выбираем допустимую карту для хода
        valid_card = None
        for c in state["hand"]:
            if c["is_valid"]:
                valid_card = c
                break

        self.assertIsNotNone(valid_card)
        new_state = self.session.play_card(
            player_id=0,
            suit=valid_card["suit"],
            rank=valid_card["rank"],
        )
        self.assertEqual(len(new_state["hand"]), 12)
        # Взятка завершилась, сохранена в last_trick
        self.assertIsNotNone(new_state["last_trick"])
        self.assertEqual(len(new_state["last_trick"]["cards"]), 4)

    def test_session_with_scoring_config(self) -> None:
        """GameSession инициализируется с переданной конфигурацией правил."""
        cfg = ScoringConfig.standard()
        session = GameSession(player_name="Профи", scoring_config=cfg, rng=self.rng)
        state = session.get_state()
        self.assertEqual(state["target_score"], 500)
        self.assertEqual(state["scoring_rules"]["bags_limit"], 10)
        self.assertEqual(state["scoring_rules"]["nil_points"], 100)

    def test_session_complete_round_and_history(self) -> None:
        """Симуляция полного раунда через GameSession с переходом в round_end и записью в history."""
        # Делаем ставку
        self.session.make_bid(player_id=0, bid=2)

        # Разыгрываем все 13 взяток
        for _ in range(13):
            state = self.session.get_state()
            if state["phase"] != GameSession.PHASE_PLAYING:
                break
            # Если ход человека, играем любую допустимую карту
            if state["is_human_turn"]:
                valid_c = next(c for c in state["hand"] if c["is_valid"])
                state = self.session.play_card(player_id=0, card_index=valid_c["index"])

        final_state = self.session.get_state()
        # Фаза должна стать round_end или game_over
        self.assertIn(final_state["phase"], (GameSession.PHASE_ROUND_END, GameSession.PHASE_GAME_OVER))
        self.assertIsNotNone(final_state["last_round_score"])
        # Проверяем, что раунд записался в историю
        history = self.session.get_history()
        self.assertEqual(len(history), 1)
        self.assertEqual(history[0]["round_number"], 1)
        self.assertEqual(len(history[0]["tricks"]), 13)


if __name__ == "__main__":
    unittest.main()
