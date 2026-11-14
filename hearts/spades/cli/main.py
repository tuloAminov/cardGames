"""Точка входа для запуска консольной игры «Пики» (CLI)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Обеспечиваем корректный импорт модулей
_current_dir = Path(__file__).resolve().parent
_project_root = _current_dir.parent
for p in (str(_project_root), str(_project_root.parent)):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from core.game import SpadesGame
    from core.players import AIPlayer, HumanPlayer
    from cli.view import CLIView
except ModuleNotFoundError:
    from spades.core.game import SpadesGame
    from spades.core.players import AIPlayer, HumanPlayer
    from spades.cli.view import CLIView


def setup_game(player_name: str, slow_mode: bool, target_score: int) -> tuple[SpadesGame, CLIView]:
    """Инициализация игры, игроков и консольного интерфейса."""
    view = CLIView(slow_mode=slow_mode, target_score=target_score)

    human = HumanPlayer(
        player_id=0,
        name=player_name,
        team_id=0,
        bid_callback=view.ask_bid,
        move_callback=view.ask_move,
    )

    ai_north = AIPlayer(player_id=1, name="Север", team_id=1)
    ai_east = AIPlayer(player_id=2, name="Восток (Партнёр)", team_id=0)
    ai_west = AIPlayer(player_id=3, name="Запад", team_id=1)

    players = [human, ai_north, ai_east, ai_west]
    game = SpadesGame(players=players, target_score=target_score)

    view.players_ref = players
    view.team_states_ref = game.team_states

    # Привязка событий игры к методам CLIView
    game.events.on_round_start = view.show_round_start
    game.events.on_bid_made = view.show_bid_made
    game.events.on_trick_start = view.show_trick_start
    game.events.on_card_played = view.show_card_played
    game.events.on_spades_broken = view.show_spades_broken
    game.events.on_trick_won = view.show_trick_won
    game.events.on_round_end = view.show_round_end
    game.events.on_game_end = view.show_game_end

    return game, view


def main() -> None:
    """Основной цикл запуска приложения."""
    # Настройка кодировки консоли для корректного вывода символов мастей (♠, ♥, ♦, ♣) на Windows
    if sys.platform == "win32":
        try:
            import os
            os.system("")  # Включение поддержки ANSI escape-последовательностей
        except Exception:
            pass
        if hasattr(sys.stdout, "reconfigure"):
            try:
                sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass
        if hasattr(sys.stderr, "reconfigure"):
            try:
                sys.stderr.reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass
        if hasattr(sys.stdin, "reconfigure"):
            try:
                sys.stdin.reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass

    parser = argparse.ArgumentParser(description="Консольная игра «Пики» (Spades) на Python")
    parser.add_argument("--name", type=str, default="Вы", help="Имя игрока")
    parser.add_argument(
        "--slow",
        action="store_true",
        help="Включить паузы между ходами ИИ для плавного чтения",
    )
    parser.add_argument(
        "--target",
        type=int,
        default=500,
        help="Количество очков для победы (по умолчанию 500)",
    )

    args = parser.parse_args()

    while True:
        try:
            game, view = setup_game(
                player_name=args.name,
                slow_mode=args.slow,
                target_score=args.target,
            )
            view.print_banner()
            game.play_game()

            print("\nХотите сыграть ещё раз? (д/н / y/n): ", end="")
            answer = input().strip().lower()
            if answer not in ("д", "да", "y", "yes"):
                print("Спасибо за игру! До встречи!")
                break
        except (KeyboardInterrupt, EOFError):
            print("\n\nВыход из игры. До встречи!")
            break


if __name__ == "__main__":
    main()
