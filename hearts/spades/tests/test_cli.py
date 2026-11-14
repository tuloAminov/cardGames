"""Unit-тесты для консольного интерфейса CLI (cli/view.py)."""

from __future__ import annotations

import io
import sys
import unittest
from unittest.mock import patch
from pathlib import Path

# Обеспечиваем доступ к модулям spades
_spades_dir = Path(__file__).resolve().parent.parent
_parent_dir = _spades_dir.parent
for _p in (str(_parent_dir), str(_spades_dir)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from spades.cards import Card, Rank, Suit
    from spades.cli.view import CLIView, format_card, format_hand_by_suits
    from spades.players import HumanPlayer, AIPlayer
    from spades.scoring import TeamState
    from spades.game import Trick
except ModuleNotFoundError:
    from cards import Card, Rank, Suit
    from cli.view import CLIView, format_card, format_hand_by_suits
    from players import HumanPlayer, AIPlayer
    from scoring import TeamState
    from game import Trick


class TestCLIView(unittest.TestCase):
    """Тестирование форматирования и парсинга ввода в консольном интерфейсе."""

    def setUp(self) -> None:
        self.view = CLIView(slow_mode=False)
        self.hand = [
            Card(Suit.SPADES, Rank.ACE),
            Card(Suit.SPADES, Rank.TEN),
            Card(Suit.HEARTS, Rank.KING),
            Card(Suit.DIAMONDS, Rank.QUEEN),
            Card(Suit.CLUBS, Rank.JACK),
            Card(Suit.CLUBS, Rank.TWO),
        ]

    def test_format_card(self) -> None:
        """Проверка форматирования отдельной карты."""
        c = Card(Suit.SPADES, Rank.ACE)
        self.assertEqual(format_card(c), "Т♠")

        c2 = Card(Suit.HEARTS, Rank.TEN)
        self.assertEqual(format_card(c2), "10♥")

    def test_format_hand_by_suits(self) -> None:
        """Проверка группировки карт по мастям."""
        text = format_hand_by_suits(self.hand)
        self.assertIn("Пики (♠):", text)
        self.assertIn("Т♠", text)
        self.assertIn("10♠", text)
        self.assertIn("Червы (♥):", text)
        self.assertIn("Бубны (♦):", text)
        self.assertIn("Трефы (♣):", text)

    def test_match_card_by_text_russian(self) -> None:
        """Распознавание карт по русской нотации."""
        # Полное обозначение с символом масти
        self.assertEqual(
            self.view._match_card_by_text("Т♠", self.hand),
            Card(Suit.SPADES, Rank.ACE),
        )
        self.assertEqual(
            self.view._match_card_by_text("10♠", self.hand),
            Card(Suit.SPADES, Rank.TEN),
        )
        # Обозначение первой буквой масти
        self.assertEqual(
            self.view._match_card_by_text("тп", self.hand),
            Card(Suit.SPADES, Rank.ACE),
        )
        self.assertEqual(
            self.view._match_card_by_text("кч", self.hand),
            Card(Suit.HEARTS, Rank.KING),
        )
        self.assertEqual(
            self.view._match_card_by_text("дб", self.hand),
            Card(Suit.DIAMONDS, Rank.QUEEN),
        )
        self.assertEqual(
            self.view._match_card_by_text("вт", self.hand),
            Card(Suit.CLUBS, Rank.JACK),
        )

    def test_match_card_by_text_english(self) -> None:
        """Распознавание карт по международной/английской нотации."""
        self.assertEqual(
            self.view._match_card_by_text("as", self.hand),
            Card(Suit.SPADES, Rank.ACE),
        )
        self.assertEqual(
            self.view._match_card_by_text("AS", self.hand),
            Card(Suit.SPADES, Rank.ACE),
        )
        self.assertEqual(
            self.view._match_card_by_text("10s", self.hand),
            Card(Suit.SPADES, Rank.TEN),
        )
        self.assertEqual(
            self.view._match_card_by_text("kh", self.hand),
            Card(Suit.HEARTS, Rank.KING),
        )
        self.assertEqual(
            self.view._match_card_by_text("qd", self.hand),
            Card(Suit.DIAMONDS, Rank.QUEEN),
        )
        self.assertEqual(
            self.view._match_card_by_text("jc", self.hand),
            Card(Suit.CLUBS, Rank.JACK),
        )
        self.assertEqual(
            self.view._match_card_by_text("2c", self.hand),
            Card(Suit.CLUBS, Rank.TWO),
        )

    def test_match_card_by_text_not_found(self) -> None:
        """Возврат None, если карта не найдена в руке."""
        self.assertIsNone(self.view._match_card_by_text("7s", self.hand))
        self.assertIsNone(self.view._match_card_by_text("invalid", self.hand))

    def test_show_match_score(self) -> None:
        """Проверка вывода текущего счёта матча."""
        t0 = TeamState(team_id=0, name="Ваша команда", total_score=120, bags=2)
        t1 = TeamState(team_id=1, name="Соперники", total_score=80, bags=4)
        self.view.team_states_ref = {0: t0, 1: t1}

        buf = io.StringIO()
        with patch("sys.stdout", buf):
            self.view.show_match_score()
        out = buf.getvalue()
        self.assertIn("ТЕКУЩИЙ СЧЁТ МАТЧА", out)
        self.assertIn("Ваша команда: 120 очков (мешков: 2)", out)
        self.assertIn("Соперники: 80 очков (мешков: 4)", out)

    def test_show_tricks_status(self) -> None:
        """Проверка вывода состояния взяток в текущем раунде."""
        p0 = HumanPlayer(0, "Вы", 0)
        p1 = AIPlayer(1, "Север", 1)
        p2 = AIPlayer(2, "Восток", 0)
        p3 = AIPlayer(3, "Запад", 1)

        p0.tricks_won, p0.bid_value = 2, 3
        p1.tricks_won, p1.bid_value = 1, 4
        p2.tricks_won, p2.bid_value = 3, 3
        p3.tricks_won, p3.bid_value = 0, 0  # Nil

        self.view.players_ref = [p0, p1, p2, p3]

        buf = io.StringIO()
        with patch("sys.stdout", buf):
            self.view.show_tricks_status()
        out = buf.getvalue()
        self.assertIn("ТЕКУЩИЕ ВЗЯТКИ / ЗАЯВКИ", out)
        self.assertIn("Вы: 2/3", out)
        self.assertIn("Восток: 3/3", out)
        self.assertIn("Север: 1/4", out)
        self.assertIn("Запад: 0/0", out)

    def test_show_quick_rules(self) -> None:
        """Проверка вывода краткой справки по правилам."""
        buf = io.StringIO()
        with patch("sys.stdout", buf):
            self.view.show_quick_rules()
        out = buf.getvalue()
        self.assertIn("КРАТКИЕ ПРАВИЛА ИГРЫ «ПИКИ»", out)
        self.assertIn("Козырь всегда Пики", out)

    def test_ask_bid_with_helper_command(self) -> None:
        """Запрос ставки: вызов команд 'счет' и 'правила', затем ввод числа 3."""
        player = HumanPlayer(0, "Вы", 0)
        player.receive_cards(self.hand)

        inputs = ["счет", "правила", "3"]
        with patch("builtins.input", side_effect=inputs):
            buf = io.StringIO()
            with patch("sys.stdout", buf):
                bid = self.view.ask_bid(player, current_bids={}, teammate_bid=4)
        self.assertEqual(bid, 3)

    def test_ask_move_with_helper_command(self) -> None:
        """Запрос хода: вызов команд 'взятки', 'рука', затем выбор первой карты."""
        player = HumanPlayer(0, "Вы", 0)
        player.receive_cards(self.hand)

        trick = Trick(trick_number=1)
        valid_moves = [player.hand[0], player.hand[1]]

        inputs = ["взятки", "рука", "1"]
        with patch("builtins.input", side_effect=inputs):
            buf = io.StringIO()
            with patch("sys.stdout", buf):
                chosen = self.view.ask_move(player, valid_moves, trick)
        self.assertEqual(chosen, player.hand[0])


if __name__ == "__main__":
    unittest.main()
