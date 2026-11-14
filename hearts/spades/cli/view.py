"""Консольный интерфейс игры «Пики» (CLI) на русском языке."""

from __future__ import annotations

import sys
import time
from typing import Optional

try:
    from core.cards import Card, Rank, Suit
    from core.game import SpadesGame, Trick
    from core.players import HumanPlayer, Player
    from core.scoring import TeamRoundScore, TeamState
except ModuleNotFoundError:
    from spades.core.cards import Card, Rank, Suit
    from spades.core.game import SpadesGame, Trick
    from spades.core.players import HumanPlayer, Player
    from spades.core.scoring import TeamRoundScore, TeamState


def format_card(card: Card) -> str:
    """Форматирование одной карты для вывода в консоль."""
    return f"{card.rank.symbol}{card.suit.value}"


def format_hand_by_suits(hand: list[Card]) -> str:
    """Форматирование карт игрока, сгруппированных по мастям."""
    lines: list[str] = []
    for suit in Suit:
        suit_cards = [c for c in hand if c.suit == suit]
        cards_str = " ".join(format_card(c) for c in suit_cards) if suit_cards else "—"
        lines.append(f"  {suit.name_ru} ({suit.value}): {cards_str}")
    return "\n".join(lines)


class CLIView:
    """Отображение состояния игры и обработка ввода пользователя."""

    def __init__(
        self,
        slow_mode: bool = False,
        delay: float = 0.4,
        target_score: int = 500,
    ) -> None:
        self.slow_mode = slow_mode
        self.delay = delay
        self.target_score = target_score
        self.players_ref: list[Player] = []
        self.team_states_ref: dict[int, TeamState] = {}

    def _sleep(self, custom_delay: Optional[float] = None) -> None:
        if self.slow_mode:
            time.sleep(custom_delay if custom_delay is not None else self.delay)

    def print_banner(self) -> None:
        """Приветственный баннер игры."""
        print("=" * 60)
        print("          КАРТОЧНАЯ ИГРА «ПИКИ» (SPADES)")
        print("=" * 60)
        print("Партнёры: Вы и Восток против Севера и Запада.")
        print(f"Козырь: ♠ Пики. Игра ведётся до {self.target_score} очков.")
        print("Команды в игре: 'рука', 'счет', 'взятки', 'правила'")
        print("=" * 60)
        print()

    def show_match_score(self) -> None:
        """Отображение текущего счёта партий по командам."""
        print("\n--- ТЕКУЩИЙ СЧЁТ МАТЧА ---")
        if self.team_states_ref:
            t0 = self.team_states_ref.get(0)
            t1 = self.team_states_ref.get(1)
            if t0 and t1:
                print(f"  {t0.name}: {t0.total_score} очков (мешков: {t0.bags})")
                print(f"  {t1.name}: {t1.total_score} очков (мешков: {t1.bags})")
        else:
            print("  (счёт матча пока 0:0)")
        print(f"  Цель для победы: {self.target_score} очков\n")

    def show_tricks_status(self) -> None:
        """Отображение взяток в текущем раунде."""
        if len(self.players_ref) >= 4:
            print("\n--- ТЕКУЩИЕ ВЗЯТКИ / ЗАЯВКИ ---")
            print(f"  Вы: {self.players_ref[0].tricks_won}/{self.players_ref[0].bid_value} | "
                  f"Восток: {self.players_ref[2].tricks_won}/{self.players_ref[2].bid_value} | "
                  f"Север: {self.players_ref[1].tricks_won}/{self.players_ref[1].bid_value} | "
                  f"Запад: {self.players_ref[3].tricks_won}/{self.players_ref[3].bid_value}\n")

    def show_quick_rules(self) -> None:
        """Краткая справка по правилам игры."""
        print("\n--- КРАТКИЕ ПРАВИЛА ИГРЫ «ПИКИ» ---")
        print("• Козырь всегда Пики (♠). Старшинство: 2..10, В, Д, К, Т.")
        print("• Обязательно ходить в масть взятки, если есть карты этой масти.")
        print("• Пики нельзя начинать (Spades not broken), пока они не сыграны ранее,")
        print("  кроме случаев, когда на руке остались исключительно пики.")
        print("• Ввод карты: номер в квадратных скобках (1..13) или её текст ('10s', 'as', 'тп', 'кч').")
        print("• Полезные команды во время хода: 'рука', 'счет', 'взятки', 'правила'.\n")

    def show_round_start(self, round_num: int, dealer: Player) -> None:
        """Оповещение о начале раунда."""
        print("\n" + "#" * 60)
        print(f"               РАУНД {round_num}")
        print(f"Сдающий: {dealer.name}")
        print("#" * 60 + "\n")
        self._sleep(0.5)

    def show_hand(self, player: Player) -> None:
        """Показать текущую руку игрока."""
        print(f"Ваша рука ({len(player.hand)} карт):")
        print(format_hand_by_suits(player.hand))
        print("-" * 60)

    def ask_bid(
        self,
        player: HumanPlayer,
        current_bids: dict[int, int],
        teammate_bid: Optional[int],
    ) -> int:
        """Запрос ставки у игрока-человека с валидацией ввода."""
        self.show_hand(player)

        if teammate_bid is not None:
            partner_bid_str = "Nil (0)" if teammate_bid == 0 else str(teammate_bid)
            print(f"Заявка вашего партнёра (Восток): {partner_bid_str}")
        else:
            print("Ваш партнёр ещё не делал заявку в этом раунде.")

        print("Введите количество взяток от 1 до 13 или 0 для ставки Nil («ноль»):")

        while True:
            try:
                user_input = input("Ваша ставка > ").strip().lower()
                if not user_input:
                    continue

                if user_input in ("счет", "счёт", "score"):
                    self.show_match_score()
                    continue
                if user_input in ("рука", "hand"):
                    self.show_hand(player)
                    continue
                if user_input in ("правила", "rules", "help", "помощь"):
                    self.show_quick_rules()
                    continue

                if user_input in ("nil", "ноль", "n", "н"):
                    return 0

                val = int(user_input)
                if 0 <= val <= 13:
                    return val
                print("Ошибка: ставка должна быть от 0 до 13. Попробуйте снова.")
            except ValueError:
                print("Ошибка: введите целое число от 0 до 13 или 'nil'. Команды: 'рука', 'счет', 'правила'.")
            except (KeyboardInterrupt, EOFError):
                print("\nИгра прервана пользователем.")
                sys.exit(0)

    def show_bid_made(self, player: Player, bid: int) -> None:
        """Отображение заявки любого игрока."""
        bid_str = "NIL (ноль)" if bid == 0 else f"{bid} взят."
        print(f"  Заявка игрока [{player.name}]: {bid_str}")
        self._sleep()

    def show_trick_start(self, trick_num: int, leader: Player) -> None:
        """Оповещение о начале новой взятки."""
        print(f"\n--- Взятка {trick_num}/13 (Первый ход: {leader.name}) ---")
        self._sleep()

    def show_spades_broken(self, player: Player, card: Card) -> None:
        """Оповещение о разламывании пик."""
        print(f"  💥 ПИКИ СЛОМАНЫ! {player.name} сыграл {format_card(card)}.")
        self._sleep()

    def show_card_played(self, player: Player, card: Card, trick: Trick) -> None:
        """Отображение хода игрока."""
        winner_p, winner_c = trick.get_current_winner()
        is_winning = (winner_p == player)
        winning_indicator = " (бьёт стол)" if is_winning and len(trick.played_cards) > 1 else ""
        print(f"  Ход [{player.name}]: {format_card(card)}{winning_indicator}")
        self._sleep()

    def show_trick_won(self, winner: Player, winning_card: Card, trick: Trick) -> None:
        """Отображение победителя взятки."""
        print(f"  ==> Взятку забирает {winner.name} картой {format_card(winning_card)}!")
        if len(self.players_ref) >= 4:
            print(f"      Текущие взятки: Вы: {self.players_ref[0].tricks_won}/{self.players_ref[0].bid_value} | "
                  f"Восток: {self.players_ref[2].tricks_won}/{self.players_ref[2].bid_value} | "
                  f"Север: {self.players_ref[1].tricks_won}/{self.players_ref[1].bid_value} | "
                  f"Запад: {self.players_ref[3].tricks_won}/{self.players_ref[3].bid_value}")
        print("-" * 40)
        self._sleep(0.5)

    def ask_move(
        self,
        player: HumanPlayer,
        valid_moves: list[Card],
        trick: Trick,
    ) -> Card:
        """Запрос хода у игрока-человека с валидацией."""
        print("\nВаш ход! Карты на столе:")
        if trick.played_cards:
            for play in trick.played_cards:
                print(f"  {play.player.name}: {format_card(play.card)}")
        else:
            print("  (стол пуст, вы открываете взятку)")

        print("\nВаши карты:")
        for idx, card in enumerate(player.hand, 1):
            is_valid = card in valid_moves
            status = " " if is_valid else " [нельзя]"
            print(f"  [{idx:2d}] {format_card(card):4s}{status}", end="")
            if idx % 4 == 0 or idx == len(player.hand):
                print()

        led_suit = trick.led_suit
        if led_suit is not None:
            print(f"Масть взятки: {led_suit.name_ru} ({led_suit.value})")

        while True:
            try:
                user_input = input("Выберите номер карты для хода > ").strip().lower()
                if not user_input:
                    continue

                if user_input in ("счет", "счёт", "score"):
                    self.show_match_score()
                    continue
                if user_input in ("взятки", "tricks"):
                    self.show_tricks_status()
                    continue
                if user_input in ("рука", "hand"):
                    self.show_hand(player)
                    continue
                if user_input in ("правила", "rules", "help", "помощь"):
                    self.show_quick_rules()
                    continue

                if user_input.isdigit():
                    num = int(user_input)
                    if 1 <= num <= len(player.hand):
                        chosen = player.hand[num - 1]
                        if chosen in valid_moves:
                            return chosen
                        else:
                            self._explain_invalid_move(chosen, valid_moves, led_suit)
                            continue
                    else:
                        print(f"Ошибка: введите номер от 1 до {len(player.hand)}.")
                        continue

                matched = self._match_card_by_text(user_input, player.hand)
                if matched is not None:
                    if matched in valid_moves:
                        return matched
                    else:
                        self._explain_invalid_move(matched, valid_moves, led_suit)
                        continue

                print("Не удалось распознать карту. Введите порядковый номер в квадратных скобках.")

            except (KeyboardInterrupt, EOFError):
                print("\nИгра прервана пользователем.")
                sys.exit(0)

    def _explain_invalid_move(
        self,
        chosen: Card,
        valid_moves: list[Card],
        led_suit: Optional[Suit],
    ) -> None:
        """Объяснение, почему ход данной картой запрещен правилами."""
        if led_suit is not None and chosen.suit != led_suit:
            same_suit = [c for c in valid_moves if c.suit == led_suit]
            if same_suit:
                print(
                    f"Ошибка: необходимо ходить в масть {led_suit.name_ru} ({led_suit.value})! "
                    f"У вас есть: {', '.join(format_card(c) for c in same_suit)}."
                )
                return
        if led_suit is None and chosen.suit == Suit.SPADES:
            print(
                "Ошибка: нельзя начинать взятку с пик, пока пики не сломаны (spades not broken) "
                "и у вас есть другие масти!"
            )
            return
        print(f"Ошибка: ход картой {format_card(chosen)} недопустим.")

    def _match_card_by_text(self, text: str, hand: list[Card]) -> Optional[Card]:
        """Поиск карты в руке по тексту (например '10п', 'Т♠', 'as', 'kd', '10s')."""
        normalized = text.replace(" ", "").upper()

        rank_en_map = {
            Rank.ACE: "A",
            Rank.KING: "K",
            Rank.QUEEN: "Q",
            Rank.JACK: "J",
        }

        suit_en_map = {
            Suit.SPADES: "S",
            Suit.HEARTS: "H",
            Suit.DIAMONDS: "D",
            Suit.CLUBS: "C",
        }

        for card in hand:
            if format_card(card).upper() == normalized:
                return card

            ru_suit_letter = card.suit.name_ru[0].upper()
            en_suit_letter = suit_en_map.get(card.suit, "").upper()
            ru_rank_sym = card.rank.symbol.upper()
            en_rank_sym = rank_en_map.get(card.rank, ru_rank_sym).upper()

            alt_symbols = {
                f"{ru_rank_sym}{ru_suit_letter}",
                f"{ru_rank_sym}{card.suit.value}",
                f"{card.rank.value}{card.suit.value}",
                f"{card.rank.value}{ru_suit_letter}",
                f"{en_rank_sym}{en_suit_letter}",
                f"{en_rank_sym}{card.suit.value}",
                f"{card.rank.value}{en_suit_letter}",
            }
            if normalized in alt_symbols:
                return card
        return None

    def show_round_end(
        self,
        round_num: int,
        team0: TeamRoundScore,
        team1: TeamRoundScore,
    ) -> None:
        """Отображение итогов раунда и счёта партий."""
        print("\n" + "=" * 65)
        print(f"                    ИТОГИ РАУНДА {round_num}")
        print("=" * 65)

        for score in (team0, team1):
            print(f"\n{score.team_name}:")
            for p in score.player_records:
                bid_repr = "Nil (0)" if p.is_nil else str(p.bid)
                nil_note = ""
                if p.is_nil:
                    nil_note = f" [Nil выполнен! {p.nil_points:+d}]" if p.nil_success else f" [Nil провален! {p.nil_points:+d}]"
                print(f"  • {p.name}: заявка {bid_repr}, взято {p.tricks_won}{nil_note}")

            if score.contract_bid > 0:
                status_str = "Выполнен" if score.contract_made else "Провален"
                print(f"  Контракт команды: {score.tricks_won} из {score.contract_bid} ({status_str})")
                print(f"  Очки за контракт: {score.contract_points}")
                if score.overtricks > 0:
                    print(f"  Овертрики (мешки за раунд): +{score.overtricks}")
            else:
                print("  Контракт команды: оба игрока объявили Nil")

            if score.bag_penalty > 0:
                print(f"  ⚠️  Штраф за {score.bags_limit} мешков: -{score.bag_penalty} очков!")

            print(f"  Мешков в копилке: {score.bags_after}")
            print(f"  Изменение счёта за раунд: {score.round_net_points:+d}")
            print(f"  ОБЩИЙ СЧЁТ КОМАНДЫ: {score.new_total_score}")

        print("=" * 65)
        self._sleep(1.0)

    def show_game_end(
        self,
        winner_team_id: int,
        team0: TeamState,
        team1: TeamState,
    ) -> None:
        """Оглашение победителя всей партии."""
        print("\n" + "*" * 65)
        print("                  ИГРА ЗАВЕРШЕНА!")
        print("*" * 65)
        winner_name = team0.name if winner_team_id == 0 else team1.name
        print(f"🏆 ПОБЕДИТЕЛЬ: {winner_name}!\n")
        print("Финальный счёт:")
        print(f"  {team0.name}: {team0.total_score} очков (мешков: {team0.bags})")
        print(f"  {team1.name}: {team1.total_score} очков (мешков: {team1.bags})")
        print("*" * 65 + "\n")
