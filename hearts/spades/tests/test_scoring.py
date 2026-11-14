"""Unit-тесты для модуля подсчёта очков (scoring.py)."""

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
    from spades.scoring import (
        PlayerRoundRecord,
        ScoringConfig,
        ScoringEngine,
        TeamRoundScore,
        TeamState,
    )
except ModuleNotFoundError:
    from scoring import (
        PlayerRoundRecord,
        ScoringConfig,
        ScoringEngine,
        TeamRoundScore,
        TeamState,
    )


class TestScoring(unittest.TestCase):
    """Тестирование подсчета контрактов, овертриков, Nil и мешков."""

    def setUp(self) -> None:
        self.team = TeamState(team_id=0, name="Тестовая Команда", total_score=0, bags=0)

    def test_contract_made_exact(self) -> None:
        """Контракт выполнен в точности: 10 очков за каждую взятку, 0 мешков."""
        p1 = PlayerRoundRecord(player_id=0, name="Игрок 1", bid=3, tricks_won=3)
        p2 = PlayerRoundRecord(player_id=2, name="Игрок 2", bid=4, tricks_won=4)

        result = ScoringEngine.calculate_team_round(self.team, p1, p2)

        self.assertEqual(result.contract_bid, 7)
        self.assertEqual(result.tricks_won, 7)
        self.assertTrue(result.contract_made)
        self.assertEqual(result.contract_points, 70)
        self.assertEqual(result.overtricks, 0)
        self.assertEqual(result.bag_penalty, 0)
        self.assertEqual(result.round_net_points, 70)
        self.assertEqual(self.team.total_score, 70)
        self.assertEqual(self.team.bags, 0)

    def test_contract_made_with_overtricks(self) -> None:
        """Контракт выполнен с превышением (овертрики/мешки)."""
        p1 = PlayerRoundRecord(player_id=0, name="Игрок 1", bid=3, tricks_won=4)
        p2 = PlayerRoundRecord(player_id=2, name="Игрок 2", bid=2, tricks_won=3)

        result = ScoringEngine.calculate_team_round(self.team, p1, p2)

        # Заявка 5, взято 7: 50 + 2 = 52 очка, +2 мешка
        self.assertEqual(result.contract_bid, 5)
        self.assertEqual(result.tricks_won, 7)
        self.assertTrue(result.contract_made)
        self.assertEqual(result.overtricks, 2)
        self.assertEqual(result.contract_points, 52)
        self.assertEqual(result.round_net_points, 52)
        self.assertEqual(self.team.total_score, 52)
        self.assertEqual(self.team.bags, 2)

    def test_contract_failed(self) -> None:
        """Контракт провален: команда получает штраф −10 очков за каждую заявленную взятку."""
        p1 = PlayerRoundRecord(player_id=0, name="Игрок 1", bid=4, tricks_won=2)
        p2 = PlayerRoundRecord(player_id=2, name="Игрок 2", bid=3, tricks_won=3)

        result = ScoringEngine.calculate_team_round(self.team, p1, p2)

        # Заявка 7, взято 5: провал (-70 очков)
        self.assertEqual(result.contract_bid, 7)
        self.assertEqual(result.tricks_won, 5)
        self.assertFalse(result.contract_made)
        self.assertEqual(result.contract_points, -70)
        self.assertEqual(result.overtricks, 0)
        self.assertEqual(result.round_net_points, -70)
        self.assertEqual(self.team.total_score, -70)
        self.assertEqual(self.team.bags, 0)

    def test_nil_successful(self) -> None:
        """Успешная ставка Nil (+50 очков) в сочетании со ставкой партнера."""
        p1 = PlayerRoundRecord(player_id=0, name="Игрок 1", bid=0, tricks_won=0)  # Nil
        p2 = PlayerRoundRecord(player_id=2, name="Игрок 2", bid=4, tricks_won=4)

        result = ScoringEngine.calculate_team_round(self.team, p1, p2)

        self.assertEqual(result.contract_bid, 4)
        self.assertEqual(result.tricks_won, 4)
        self.assertEqual(result.contract_points, 40)
        self.assertEqual(result.nil_points_total, 50)
        self.assertEqual(result.round_net_points, 90)
        self.assertEqual(self.team.total_score, 90)

    def test_nil_failed(self) -> None:
        """Проваленная ставка Nil (-50 очков)."""
        p1 = PlayerRoundRecord(player_id=0, name="Игрок 1", bid=0, tricks_won=1)  # Взял 1 взятку при Nil
        p2 = PlayerRoundRecord(player_id=2, name="Игрок 2", bid=3, tricks_won=3)  # Взял 3

        result = ScoringEngine.calculate_team_round(self.team, p1, p2)

        # Контракт партнера 3. Всего команда взяла 4 взятки (3 + 1) -> контракт выполнен с 1 овертриком (31 очко)
        # Nil провален: -50 очков
        # Итог: 31 - 50 = -19 очков
        self.assertEqual(result.contract_bid, 3)
        self.assertEqual(result.tricks_won, 4)
        self.assertTrue(result.contract_made)
        self.assertEqual(result.contract_points, 31)
        self.assertEqual(result.nil_points_total, -50)
        self.assertEqual(result.round_net_points, -19)
        self.assertEqual(self.team.total_score, -19)
        self.assertEqual(self.team.bags, 1)

    def test_bags_accumulation_and_penalty(self) -> None:
        """Накопление 6 мешков вызывает штраф −50 очков."""
        self.team.bags = 4
        self.team.total_score = 150

        # Команда заявляет 4, берет 7 (+3 мешка)
        # Итого мешков: 4 + 3 = 7 -> штраф 50, остается 1 мешок
        p1 = PlayerRoundRecord(player_id=0, name="Игрок 1", bid=2, tricks_won=4)
        p2 = PlayerRoundRecord(player_id=2, name="Игрок 2", bid=2, tricks_won=3)

        result = ScoringEngine.calculate_team_round(self.team, p1, p2)

        self.assertEqual(result.contract_points, 43)
        self.assertEqual(result.overtricks, 3)
        self.assertEqual(result.bag_penalty, 50)
        # 43 - 50 = -7
        self.assertEqual(result.round_net_points, -7)
        self.assertEqual(self.team.total_score, 143)
        self.assertEqual(self.team.bags, 1)

    def test_game_over_conditions(self) -> None:
        """Проверка условий завершения партии (250 очков)."""
        # Никто не достиг 250
        is_over, winner = ScoringEngine.check_game_over(210, 240)
        self.assertFalse(is_over)
        self.assertIsNone(winner)

        # Команда 0 достигла 250
        is_over, winner = ScoringEngine.check_game_over(260, 220)
        self.assertTrue(is_over)
        self.assertEqual(winner, 0)

        # Команда 1 достигла 250
        is_over, winner = ScoringEngine.check_game_over(210, 270)
        self.assertTrue(is_over)
        self.assertEqual(winner, 1)

        # Обе команды достигли 250: побеждает набравшая больше
        is_over, winner = ScoringEngine.check_game_over(280, 255)
        self.assertTrue(is_over)
        self.assertEqual(winner, 0)

        # Ничья при >= 250: игра продолжается
        is_over, winner = ScoringEngine.check_game_over(260, 260)
        self.assertFalse(is_over)
        self.assertIsNone(winner)

    def test_scoring_standard_rules_preset(self) -> None:
        """Классический режим: 10 мешков = -100, Nil = +100/-100, цель 500."""
        cfg = ScoringConfig.standard()
        self.assertEqual(cfg.target_score, 500)
        self.assertEqual(cfg.bags_limit, 10)
        self.assertEqual(cfg.bag_penalty_points, 100)
        self.assertEqual(cfg.nil_points, 100)

        # 1. Nil успешен (+100)
        p1 = PlayerRoundRecord(player_id=0, name="Игрок 1", bid=0, tricks_won=0)
        p2 = PlayerRoundRecord(player_id=2, name="Игрок 2", bid=4, tricks_won=4)
        result = ScoringEngine.calculate_team_round(self.team, p1, p2, config=cfg)
        self.assertEqual(result.nil_points_total, 100)
        self.assertEqual(result.contract_points, 40)
        self.assertEqual(result.round_net_points, 140)

        # 2. Накопление 10 мешков в классике дает штраф -100
        team = TeamState(team_id=0, name="Команда", total_score=200, bags=8)
        p1 = PlayerRoundRecord(player_id=0, name="Игрок 1", bid=2, tricks_won=4)
        p2 = PlayerRoundRecord(player_id=2, name="Игрок 2", bid=2, tricks_won=3)
        # Заявка 4, взято 7 -> +3 овертрика. 8 + 3 = 11 мешков -> штраф 100, остается 1
        res2 = ScoringEngine.calculate_team_round(team, p1, p2, config=cfg)
        self.assertEqual(res2.overtricks, 3)
        self.assertEqual(res2.bag_penalty, 100)
        self.assertEqual(team.bags, 1)

    def test_scoring_custom_config(self) -> None:
        """Пользовательская конфигурация правил."""
        cfg = ScoringConfig(target_score=300, bags_limit=5, bag_penalty_points=75, nil_points=80)
        team = TeamState(team_id=0, name="Кастом", total_score=100, bags=4)
        p1 = PlayerRoundRecord(player_id=0, name="И1", bid=0, tricks_won=1)  # Nil fail (-80), 1 взятка
        p2 = PlayerRoundRecord(player_id=2, name="И2", bid=3, tricks_won=4)  # 4 взятки, всего команда 5 (30 + 2 овертрика = 32)
        # 4 + 2 = 6 мешков -> штраф 75, остается 1 мешок
        res = ScoringEngine.calculate_team_round(team, p1, p2, config=cfg)
        self.assertEqual(res.nil_points_total, -80)
        self.assertEqual(res.overtricks, 2)
        self.assertEqual(res.bag_penalty, 75)
        self.assertEqual(team.bags, 1)
        self.assertEqual(res.round_net_points, 32 - 80 - 75)  # -123
        self.assertEqual(team.total_score, -23)


if __name__ == "__main__":
    unittest.main()
