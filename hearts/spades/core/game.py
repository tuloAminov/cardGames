"""Модуль управления игровым процессом: взятки, раунды и партия в «Пики»."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Optional
import random

from .cards import Card, Deck, Rank, Suit
from .players import AIPlayer, HumanPlayer, Player
from .scoring import (
    PlayerRoundRecord,
    ScoringConfig,
    ScoringEngine,
    TeamRoundScore,
    TeamState,
)


@dataclass
class PlayedCard:
    """Карта, сыгранная участником во взятке."""

    player: Player
    card: Card


@dataclass
class Trick:
    """Отдельная взятка из 4 карт."""

    trick_number: int
    played_cards: list[PlayedCard] = field(default_factory=list)

    @property
    def led_suit(self) -> Optional[Suit]:
        """Масть, которой была открыта взятка."""
        if not self.played_cards:
            return None
        return self.played_cards[0].card.suit

    def add_card(self, player: Player, card: Card) -> None:
        """Добавить сыгранную карту во взятку."""
        self.played_cards.append(PlayedCard(player=player, card=card))

    def get_current_winner(self) -> tuple[Optional[Player], Optional[Card]]:
        """Определить игрока и карту, побеждающую на данный момент во взятке.

        Правила:
        1. Если сыграны пики (козыри): побеждает старшая пика.
        2. Иначе: побеждает старшая карта открытой масти (led_suit).
        3. Карты других некозырных мастей не могут победить.
        """
        if not self.played_cards:
            return None, None

        first_card = self.played_cards[0].card
        best_player = self.played_cards[0].player
        best_card = first_card

        for play in self.played_cards[1:]:
            card = play.card
            player = play.player

            if best_card.suit == Suit.SPADES:
                # Если текущий лидер — козырь, побить его может только старший козырь
                if card.suit == Suit.SPADES and card.rank > best_card.rank:
                    best_card = card
                    best_player = player
            else:
                # Текущий лидер — некозырная карта
                if card.suit == Suit.SPADES:
                    # Любой козырь бьет некозырную карту
                    best_card = card
                    best_player = player
                elif card.suit == self.led_suit and card.rank > best_card.rank:
                    # Старшая карта той же масти
                    best_card = card
                    best_player = player

        return best_player, best_card

    def would_beat_current(self, candidate: Card) -> bool:
        """Проверить, побьет ли карта кандидата текущую лучшую карту во взятке."""
        _, current_best = self.get_current_winner()
        if current_best is None:
            return True

        if candidate.suit == Suit.SPADES:
            if current_best.suit == Suit.SPADES:
                return candidate.rank > current_best.rank
            return True

        # Кандидат не пика
        if current_best.suit == Suit.SPADES:
            return False

        if candidate.suit == self.led_suit:
            return candidate.rank > current_best.rank

        return False


class GameEvents:
    """Обработчики событий игры для отображения в интерфейсе."""

    def __init__(self) -> None:
        self.on_round_start: Optional[Callable[[int, Player], None]] = None
        self.on_cards_dealt: Optional[Callable[[Player], None]] = None
        self.on_bid_made: Optional[Callable[[Player, int], None]] = None
        self.on_trick_start: Optional[Callable[[int, Player], None]] = None
        self.on_card_played: Optional[Callable[[Player, Card, Trick], None]] = None
        self.on_trick_won: Optional[Callable[[Player, Card, Trick], None]] = None
        self.on_spades_broken: Optional[Callable[[Player, Card], None]] = None
        self.on_round_end: Optional[Callable[[int, TeamRoundScore, TeamRoundScore], None]] = None
        self.on_game_end: Optional[Callable[[int, TeamState, TeamState], None]] = None


class SpadesGame:
    """Основной класс партии игры «Пики»."""

    def __init__(
        self,
        players: Optional[list[Player]] = None,
        target_score: int = ScoringEngine.TARGET_SCORE,
        scoring_config: Optional[ScoringConfig] = None,
        rng: Optional[random.Random] = None,
    ) -> None:
        self.rng = rng or random.Random()
        if scoring_config is not None:
            self.scoring_config = scoring_config
            self.target_score = scoring_config.target_score
        else:
            self.target_score = target_score
            if target_score >= 500:
                self.scoring_config = ScoringConfig.standard()
            else:
                self.scoring_config = ScoringConfig(
                    target_score=target_score,
                    bags_limit=ScoringEngine.BAGS_LIMIT,
                    bag_penalty_points=ScoringEngine.BAG_PENALTY_POINTS,
                    nil_points=ScoringEngine.NIL_POINTS,
                )
        self.events = GameEvents()

        # По умолчанию создаем классический расклад 4 игроков
        if players is not None:
            self.players = players
        else:
            self.players = [
                HumanPlayer(player_id=0, name="Вы", team_id=0),
                AIPlayer(player_id=1, name="Север", team_id=1, rng=self.rng),
                AIPlayer(player_id=2, name="Восток (Напарник)", team_id=0, rng=self.rng),
                AIPlayer(player_id=3, name="Запад", team_id=1, rng=self.rng),
            ]

        # Инициализация команд (Команда 0: 0 и 2; Команда 1: 1 и 3)
        self.team_states: dict[int, TeamState] = {
            0: TeamState(team_id=0, name="Ваша команда (Вы + Партнёр)"),
            1: TeamState(team_id=1, name="Соперники (Север + Запад)"),
        }

        self.dealer_idx: int = 3  # Сдающий начинает с Запада, первый ход у игрока 0
        self.round_number: int = 0
        self.spades_broken: bool = False

    def play_game(self) -> int:
        """Запустить полный цикл игры до достижения 500 очков."""
        while True:
            self.round_number += 1
            self.play_round()

            is_over, winning_team_id = ScoringEngine.check_game_over(
                team1_score=self.team_states[0].total_score,
                team2_score=self.team_states[1].total_score,
                target_score=self.target_score,
            )

            if is_over and winning_team_id is not None:
                if self.events.on_game_end:
                    self.events.on_game_end(
                        winning_team_id,
                        self.team_states[0],
                        self.team_states[1],
                    )
                return winning_team_id

            # Смена сдающего по часовой стрелке
            self.dealer_idx = (self.dealer_idx + 1) % 4

    @classmethod
    def simulate(
        cls,
        target_score: int = ScoringEngine.TARGET_SCORE,
        scoring_config: Optional[ScoringConfig] = None,
        rng: Optional[random.Random] = None,
    ) -> tuple[int, int, int, int]:
        """Симуляция полной партии между четырьмя ИИ-игроками.

        :return: (winning_team_id, team0_score, team1_score, rounds_played)
        """
        r = rng or random.Random()
        players: list[Player] = [
            AIPlayer(player_id=0, name="Игрок 0 (ИИ)", team_id=0, rng=r),
            AIPlayer(player_id=1, name="Игрок 1 (ИИ)", team_id=1, rng=r),
            AIPlayer(player_id=2, name="Игрок 2 (ИИ)", team_id=0, rng=r),
            AIPlayer(player_id=3, name="Игрок 3 (ИИ)", team_id=1, rng=r),
        ]
        game = cls(
            players=players,
            target_score=target_score,
            scoring_config=scoring_config,
            rng=r,
        )
        winning_team = game.play_game()
        return (
            winning_team,
            game.team_states[0].total_score,
            game.team_states[1].total_score,
            game.round_number,
        )

    def play_round(self) -> tuple[TeamRoundScore, TeamRoundScore]:
        """Сыграть один раунд: раздача, торговля, 13 взяток, подсчет очков."""
        self.spades_broken = False
        dealer = self.players[self.dealer_idx]

        for p in self.players:
            p.reset_round()

        if self.events.on_round_start:
            self.events.on_round_start(self.round_number, dealer)

        # 1. Раздача карт
        deck = Deck()
        deck.shuffle(self.rng)
        hands = deck.deal(num_hands=4, cards_per_hand=13)

        for idx, player in enumerate(self.players):
            player.receive_cards(hands[idx])

        # Уведомляем игрока-человека о раздаче
        human_player = self.players[0]
        if self.events.on_cards_dealt:
            self.events.on_cards_dealt(human_player)

        # 2. Торговля
        # Торговля начинается с игрока слева от сдающего
        first_bidder_idx = (self.dealer_idx + 1) % 4
        current_bids: dict[int, int] = {}

        for offset in range(4):
            current_idx = (first_bidder_idx + offset) % 4
            player = self.players[current_idx]
            partner_idx = (current_idx + 2) % 4
            teammate_bid = current_bids.get(partner_idx)

            bid = player.make_bid(current_bids=current_bids, teammates_bid=teammate_bid)
            current_bids[current_idx] = bid

            if self.events.on_bid_made:
                self.events.on_bid_made(player, bid)

        # 3. Розыгрыш 13 взяток
        # Первый ход делает игрок слева от сдающего
        current_leader_idx = (self.dealer_idx + 1) % 4

        for trick_num in range(1, 14):
            trick = self._play_trick(trick_num=trick_num, leader_idx=current_leader_idx)
            winner, _ = trick.get_current_winner()
            assert winner is not None
            winner.tricks_won += 1
            current_leader_idx = winner.player_id

        # 4. Подсчёт очков
        team0_players = [p for p in self.players if p.team_id == 0]
        team1_players = [p for p in self.players if p.team_id == 1]

        rec0 = PlayerRoundRecord(
            player_id=team0_players[0].player_id,
            name=team0_players[0].name,
            bid=team0_players[0].bid_value,
            tricks_won=team0_players[0].tricks_won,
            nil_bonus=self.scoring_config.nil_points,
        )
        rec2 = PlayerRoundRecord(
            player_id=team0_players[1].player_id,
            name=team0_players[1].name,
            bid=team0_players[1].bid_value,
            tricks_won=team0_players[1].tricks_won,
            nil_bonus=self.scoring_config.nil_points,
        )
        score_team0 = ScoringEngine.calculate_team_round(
            team_state=self.team_states[0],
            player1=rec0,
            player2=rec2,
            config=self.scoring_config,
        )

        rec1 = PlayerRoundRecord(
            player_id=team1_players[0].player_id,
            name=team1_players[0].name,
            bid=team1_players[0].bid_value,
            tricks_won=team1_players[0].tricks_won,
            nil_bonus=self.scoring_config.nil_points,
        )
        rec3 = PlayerRoundRecord(
            player_id=team1_players[1].player_id,
            name=team1_players[1].name,
            bid=team1_players[1].bid_value,
            tricks_won=team1_players[1].tricks_won,
            nil_bonus=self.scoring_config.nil_points,
        )
        score_team1 = ScoringEngine.calculate_team_round(
            team_state=self.team_states[1],
            player1=rec1,
            player2=rec3,
            config=self.scoring_config,
        )

        if self.events.on_round_end:
            self.events.on_round_end(self.round_number, score_team0, score_team1)

        return score_team0, score_team1

    def _play_trick(self, trick_num: int, leader_idx: int) -> Trick:
        """Сыграть одну взятку."""
        leader = self.players[leader_idx]
        trick = Trick(trick_number=trick_num)

        if self.events.on_trick_start:
            self.events.on_trick_start(trick_num, leader)

        for offset in range(4):
            player_idx = (leader_idx + offset) % 4
            player = self.players[player_idx]

            valid_moves = player.get_valid_moves(trick.led_suit, self.spades_broken)
            chosen_card = player.choose_card(trick=trick, spades_broken=self.spades_broken)

            if chosen_card not in valid_moves:
                raise ValueError(
                    f"Недопустимый ход игрока {player.name}: карта {chosen_card} "
                    f"не входит в список допустимых: {valid_moves}"
                )

            # Проверка разламывания пик (spades broken)
            if chosen_card.suit == Suit.SPADES:
                if not self.spades_broken:
                    self.spades_broken = True
                    if self.events.on_spades_broken:
                        self.events.on_spades_broken(player, chosen_card)

            player.remove_card(chosen_card)
            trick.add_card(player=player, card=chosen_card)

            if self.events.on_card_played:
                self.events.on_card_played(player, chosen_card, trick)

        winner, winning_card = trick.get_current_winner()
        assert winner is not None and winning_card is not None
        if self.events.on_trick_won:
            self.events.on_trick_won(winner, winning_card, trick)

        return trick
