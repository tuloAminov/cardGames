"""Модуль участников игры: базовый класс игрока, человек и компьютерный соперник (ИИ)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Callable, Optional
import random

from .cards import Card, Rank, Suit

if TYPE_CHECKING:
    from .game import Trick


class Player(ABC):
    """Базовый абстрактный класс игрока."""

    def __init__(self, player_id: int, name: str, team_id: int) -> None:
        self.player_id: int = player_id
        self.name: str = name
        self.team_id: int = team_id
        self.hand: list[Card] = []
        self.bid_value: int = 0
        self.tricks_won: int = 0

    def receive_cards(self, cards: list[Card]) -> None:
        """Получить карты при раздаче."""
        self.hand = list(cards)
        self.sort_hand()

    def sort_hand(self) -> None:
        """Сортировка карт в руке по масти и рангу."""
        self.hand.sort()

    def remove_card(self, card: Card) -> None:
        """Удалить сыгранную карту из руки."""
        self.hand.remove(card)

    def reset_round(self) -> None:
        """Сброс состояния игрока перед началом нового раунда."""
        self.hand.clear()
        self.bid_value = 0
        self.tricks_won = 0

    def get_cards_of_suit(self, suit: Suit) -> list[Card]:
        """Возвращает карты заданной масти в руке."""
        return [c for c in self.hand if c.suit == suit]

    def get_valid_moves(self, led_suit: Optional[Suit], spades_broken: bool) -> list[Card]:
        """Определить список допустимых карт для хода согласно правилам игры.

        Правила:
        1. Если игрок открывает взятку (led_suit is None):
           - Нельзя ходить пикой, пока пики не сломаны (spades_broken == False),
             кроме случая, когда на руке остались ТОЛЬКО пики.
        2. Если взятка уже открыта (led_suit is not None):
           - Обязательно ходить в масть взятки, если есть хотя бы одна карта этой масти.
           - Если карт масти взятки нет — можно сыграть любой картой (включая пики).
        """
        if not self.hand:
            return []

        if led_suit is None:
            # Открытие взятки
            if spades_broken:
                return list(self.hand)

            non_spades = [c for c in self.hand if c.suit != Suit.SPADES]
            if non_spades:
                return non_spades
            # Если остались только пики, разрешено ходить с пик
            return list(self.hand)

        # Ответ на открытую масть: обязаны ходить в масть
        same_suit = self.get_cards_of_suit(led_suit)
        if same_suit:
            return same_suit

        # В масти ничего нет — можно сыграть любой картой
        return list(self.hand)

    @abstractmethod
    def make_bid(self, current_bids: dict[int, int], teammates_bid: Optional[int]) -> int:
        """Объявить ставку (0 для Nil, от 1 до 13)."""
        pass

    @abstractmethod
    def choose_card(self, trick: Trick, spades_broken: bool) -> Card:
        """Выбрать карту для хода."""
        pass


class HumanPlayer(Player):
    """Игрок-человек, взаимодействующий через консоль или интерфейс."""

    def __init__(
        self,
        player_id: int,
        name: str = "Вы",
        team_id: int = 0,
        bid_callback: Optional[Callable[[HumanPlayer, dict[int, int], Optional[int]], int]] = None,
        move_callback: Optional[Callable[[HumanPlayer, list[Card], Trick], Card]] = None,
    ) -> None:
        super().__init__(player_id=player_id, name=name, team_id=team_id)
        self.bid_callback = bid_callback
        self.move_callback = move_callback

    def make_bid(self, current_bids: dict[int, int], teammates_bid: Optional[int]) -> int:
        if self.bid_callback is not None:
            bid = self.bid_callback(self, current_bids, teammates_bid)
            self.bid_value = bid
            return bid
        raise NotImplementedError("bid_callback не установлен для HumanPlayer")

    def choose_card(self, trick: Trick, spades_broken: bool) -> Card:
        valid_moves = self.get_valid_moves(trick.led_suit, spades_broken)
        if self.move_callback is not None:
            return self.move_callback(self, valid_moves, trick)
        raise NotImplementedError("move_callback не установлен для HumanPlayer")


class AIPlayer(Player):
    """Компьютерный соперник с тактическим анализом ситуации."""

    def __init__(
        self,
        player_id: int,
        name: str,
        team_id: int,
        rng: Optional[random.Random] = None,
    ) -> None:
        super().__init__(player_id=player_id, name=name, team_id=team_id)
        self._rng = rng or random.Random()
        self.teammate_bid: Optional[int] = None

    def reset_round(self) -> None:
        super().reset_round()
        self.teammate_bid = None

    def make_bid(self, current_bids: dict[int, int], teammates_bid: Optional[int]) -> int:
        """Оценка силы руки и расчет заявки на взятки."""
        self.teammate_bid = teammates_bid

        # 1. Проверка возможности ставки Nil (0)
        spades = self.get_cards_of_suit(Suit.SPADES)
        high_cards = [c for c in self.hand if c.rank in (Rank.ACE, Rank.KING)]
        has_queen_spades = any(c.rank == Rank.QUEEN and c.suit == Suit.SPADES for c in self.hand)

        # Nil целесообразен, если нет Тузов, Королей, нет старших пик и пик мало
        if (
            len(high_cards) == 0
            and not has_queen_spades
            and len(spades) <= 3
            and all(c.rank <= Rank.TEN for c in spades)
            and teammates_bid != 0  # Не ставим Nil вдвоем с напарником
        ):
            self.bid_value = 0
            return 0

        # 2. Оценка потенциальных взяток
        estimated_tricks: float = 0.0

        for suit in Suit:
            cards_in_suit = self.get_cards_of_suit(suit)
            count = len(cards_in_suit)
            ranks = [c.rank for c in cards_in_suit]

            if suit == Suit.SPADES:
                # Козыри
                if Rank.ACE in ranks:
                    estimated_tricks += 1.0
                if Rank.KING in ranks and count >= 2:
                    estimated_tricks += 0.9
                if Rank.QUEEN in ranks and count >= 3:
                    estimated_tricks += 0.7
                if Rank.JACK in ranks and count >= 4:
                    estimated_tricks += 0.5
                if count > 4:
                    estimated_tricks += (count - 4) * 0.6
            else:
                # Боковые масти
                if Rank.ACE in ranks:
                    estimated_tricks += 1.0
                if Rank.KING in ranks:
                    if count >= 2:
                        estimated_tricks += 0.7
                    elif count == 1:
                        estimated_tricks += 0.3
                if Rank.QUEEN in ranks and count >= 3:
                    estimated_tricks += 0.4

                if len(spades) >= 3:
                    if count == 0:
                        estimated_tricks += 0.8
                    elif count == 1:
                        estimated_tricks += 0.4

        # Если напарник объявил Nil, берём на себя дополнительную нагрузку по взяткам
        if teammates_bid == 0:
            estimated_tricks = max(3.0, estimated_tricks + 1.0)

        final_bid = int(round(estimated_tricks))
        final_bid = max(1, min(13, final_bid))
        self.bid_value = final_bid
        return final_bid

    def choose_card(self, trick: Trick, spades_broken: bool) -> Card:
        """Интеллектуальный выбор карты для хода."""
        valid_moves = self.get_valid_moves(trick.led_suit, spades_broken)
        if len(valid_moves) == 1:
            return valid_moves[0]

        is_nil = self.bid_value == 0

        # Если игрок открывает взятку
        if trick.led_suit is None:
            return self._lead_card(valid_moves, is_nil)

        # Если игрок ходит в открытую взятку
        return self._follow_card(valid_moves, trick, is_nil)

    def _lead_card(self, valid_moves: list[Card], is_nil: bool) -> Card:
        """Стратегия первого хода во взятке."""
        if is_nil:
            non_spades = [c for c in valid_moves if c.suit != Suit.SPADES]
            pool = non_spades if non_spades else valid_moves
            return min(pool, key=lambda c: c.rank)

        # Если напарник объявил Nil, избегаем агрессивных старших ходов и ходим безопасно с младших некозырных карт
        if getattr(self, "teammate_bid", None) == 0:
            non_spades = [c for c in valid_moves if c.suit != Suit.SPADES]
            if non_spades:
                return min(non_spades, key=lambda c: c.rank)
            return min(valid_moves, key=lambda c: c.rank)

        # Если игрок уже набрал свою заявку, стараемся не брать лишних мешков
        quota_met = (self.bid_value > 0 and self.tricks_won >= self.bid_value)
        if not quota_met:
            # Гарантированные взятки: Тузы некозырных мастей
            non_spade_aces = [
                c for c in valid_moves if c.suit != Suit.SPADES and c.rank == Rank.ACE
            ]
            if non_spade_aces:
                return self._rng.choice(non_spade_aces)

            # Короли, если в масти есть поддержка
            for c in valid_moves:
                if c.suit != Suit.SPADES and c.rank == Rank.KING:
                    suit_cards = self.get_cards_of_suit(c.suit)
                    if len(suit_cards) >= 2:
                        return c

        # Иначе выбираем младшую карту некозырной масти
        non_spades = [c for c in valid_moves if c.suit != Suit.SPADES]
        if non_spades:
            return min(non_spades, key=lambda c: c.rank)

        return min(valid_moves, key=lambda c: c.rank)

    def _follow_card(
        self,
        valid_moves: list[Card],
        trick: Trick,
        is_nil: bool,
    ) -> Card:
        """Стратегия хода во взятку вторым, третьим или четвертым игроком."""
        current_winner_player, current_winning_card = trick.get_current_winner()
        teammate_winning = (
            current_winner_player is not None
            and current_winner_player.team_id == self.team_id
        )
        teammate_is_nil = (
            teammate_winning
            and getattr(current_winner_player, "bid_value", None) == 0
        )

        winning_moves = [
            c for c in valid_moves if trick.would_beat_current(c)
        ]
        losing_moves = [c for c in valid_moves if c not in winning_moves]

        # 1. Если сам ИИ играет Nil: стараемся сбросить максимально возможную карту, которая НЕ бьёт стол
        if is_nil:
            if losing_moves:
                return max(losing_moves, key=lambda c: c.rank)
            # Вынуждены брать взятку: играем самую младшую из победных карт
            return min(valid_moves, key=lambda c: c.rank)

        # 2. Защита напарника при ставке Nil:
        # Если взятку сейчас забирает наш напарник, заявивший Nil, мы обязаны перебить его, если есть возможность!
        if teammate_is_nil and winning_moves:
            non_spade_winners = [c for c in winning_moves if c.suit != Suit.SPADES]
            if non_spade_winners:
                return min(non_spade_winners, key=lambda c: c.rank)
            return min(winning_moves, key=lambda c: c.rank)

        # 3. Напарник забирает взятку и НЕ ставил Nil: сбрасываем мусор (младшую карту)
        if teammate_winning and not teammate_is_nil:
            non_spades = [c for c in valid_moves if c.suit != Suit.SPADES]
            if non_spades:
                return min(non_spades, key=lambda c: c.rank)
            return min(valid_moves, key=lambda c: c.rank)

        # 4. Соперники забирают взятку: стараемся выиграть минимальной достаточной картой
        if winning_moves:
            non_spade_winners = [c for c in winning_moves if c.suit != Suit.SPADES]
            if non_spade_winners:
                return min(non_spade_winners, key=lambda c: c.rank)
            return min(winning_moves, key=lambda c: c.rank)

        # 5. Взятку не взять: сбрасываем младшую некозырную карту
        non_spades = [c for c in valid_moves if c.suit != Suit.SPADES]
        if non_spades:
            return min(non_spades, key=lambda c: c.rank)
        return min(valid_moves, key=lambda c: c.rank)
