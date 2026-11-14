"""Сессионный игровой менеджер для пошагового взаимодействия (Web / API / боты)."""

from __future__ import annotations

import random
from typing import Any, Optional

from .cards import Card, Deck, Rank, Suit
from .players import AIPlayer, HumanPlayer, Player
from .scoring import (
    PlayerRoundRecord,
    ScoringConfig,
    ScoringEngine,
    TeamRoundScore,
    TeamState,
)
from .game import Trick


class GameSession:
    """Управляет пошаговым состоянием игры для REST API."""

    PHASE_BIDDING = "bidding"
    PHASE_PLAYING = "playing"
    PHASE_ROUND_END = "round_end"
    PHASE_GAME_OVER = "game_over"

    def __init__(
        self,
        player_name: str = "Игрок 1 (Вы)",
        target_score: int = ScoringEngine.TARGET_SCORE,
        scoring_config: Optional[ScoringConfig] = None,
        rng: Optional[random.Random] = None,
    ) -> None:
        self.rng = rng or random.Random()
        self.player_name = player_name
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

        self.players: list[Player] = []
        self.team_states: dict[int, TeamState] = {}
        self.round_number: int = 0
        self.dealer_idx: int = 3
        self.phase: str = self.PHASE_BIDDING
        self.spades_broken: bool = False
        self.bids: dict[int, int] = {}
        self.current_turn: int = 0
        self.current_trick: Optional[Trick] = None
        self.trick_number: int = 1
        self.last_trick: Optional[dict[str, Any]] = None
        self.round_tricks: list[dict[str, Any]] = []
        self.history: list[dict[str, Any]] = []
        self.last_round_score: Optional[dict[str, Any]] = None
        self.winner_team_id: Optional[int] = None
        self.message: str = ""
        self.event_type: str = "state"
        self.last_played_by: Optional[int] = None
        self.trick_winner_id: Optional[int] = None
        self.winning_card_str: Optional[str] = None
        self._step_snapshots: list[dict[str, Any]] = []
        self.game_id: int = 0
        self.stats: dict[str, int] = {
            "played": 0,
            "won": 0,
            "lost": 0,
        }

        self.reset_game(
            player_name=player_name,
            target_score=self.target_score,
            scoring_config=self.scoring_config,
        )

    def reset_game(
        self,
        player_name: Optional[str] = None,
        target_score: Optional[int] = None,
        scoring_config: Optional[ScoringConfig] = None,
    ) -> None:
        """Начать полностью новую игру."""
        if player_name:
            self.player_name = player_name
        if scoring_config is not None:
            self.scoring_config = scoring_config
            self.target_score = scoring_config.target_score
        elif target_score is not None:
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

        # Расположение за столом по часовой стрелке:
        # 0 (снизу): Игрок 1 — Вы (Команда 0)
        # 1 (слева): Игрок 3 — Соперник (Команда 1)
        # 2 (сверху): Игрок 2 — Партнёр (Команда 0)
        # 3 (справа): Игрок 4 — Соперник (Команда 1)
        self.players = [
            HumanPlayer(player_id=0, name=self.player_name, team_id=0),
            AIPlayer(player_id=1, name="Игрок 3 (Соперник)", team_id=1, rng=self.rng),
            AIPlayer(player_id=2, name="Игрок 2 (Партнёр)", team_id=0, rng=self.rng),
            AIPlayer(player_id=3, name="Игрок 4 (Соперник)", team_id=1, rng=self.rng),
        ]

        self.team_states = {
            0: TeamState(team_id=0, name="Ваша команда"),
            1: TeamState(team_id=1, name="Соперники"),
        }

        self.game_id += 1
        self.round_number = 0
        self.dealer_idx = 3  # Сдающий Игрок 4 (справа) => первый ход и ставка у игрока 0
        self.winner_team_id = None
        self.last_round_score = None
        self._step_snapshots.clear()
        self.round_tricks.clear()
        self.history.clear()

        self.start_round()

    def start_round(self) -> None:
        """Начать новый раунд (раздача карт, подготовка торговли)."""
        self.round_number += 1
        self.spades_broken = False
        self.bids.clear()
        self.last_trick = None
        self.round_tricks.clear()
        self.current_trick = None
        self.trick_number = 1
        self.phase = self.PHASE_BIDDING

        for p in self.players:
            p.reset_round()

        # Раздача карт
        deck = Deck()
        deck.shuffle(self.rng)
        hands = deck.deal(num_hands=4, cards_per_hand=13)
        for idx, player in enumerate(self.players):
            player.receive_cards(hands[idx])

        # Очередь ставок начинается слева от сдающего
        first_bidder = (self.dealer_idx + 1) % 4
        self.current_turn = first_bidder
        self._run_ai_bids()

    def _run_ai_bids(self) -> None:
        """Автоматический ход ставок ИИ до тех пор, пока не наступит очередь игрока-человека."""
        while len(self.bids) < 4:
            if self.current_turn == 0:
                # Очередь игрока-человека: ждем вызова make_bid()
                partner_bid = self.bids.get(2)
                p_text = f" (заявка партнёра: {partner_bid})" if partner_bid is not None else ""
                self.message = f"Ваш черёд делать ставку{p_text}."
                self._record_snapshot(event_type="human_bid_turn")
                return

            # Ход ИИ игрока
            ai = self.players[self.current_turn]
            partner_idx = (self.current_turn + 2) % 4
            teammate_bid = self.bids.get(partner_idx)

            bid = ai.make_bid(current_bids=self.bids, teammates_bid=teammate_bid)
            self.bids[self.current_turn] = bid
            bid_str = "Nil (0)" if bid == 0 else str(bid)
            self.message = f"Заявка [{ai.name}]: {bid_str}"

            self.current_turn = (self.current_turn + 1) % 4
            self._record_snapshot(event_type="bid_made")

        # Все 4 игрока сделали ставки -> переходим к игре
        self._finish_bidding()

    def make_bid(self, player_id: int, bid: int) -> dict[str, Any]:
        """Сделать ставку для игрока."""
        if self.phase != self.PHASE_BIDDING:
            raise ValueError(f"Ставки сейчас не принимаются (текущая фаза: {self.phase})")
        if self.current_turn != player_id:
            raise ValueError(f"Сейчас не ход игрока {player_id}")
        if not (0 <= bid <= 13):
            raise ValueError("Ставка должна быть от 0 до 13")

        self._step_snapshots.clear()
        player = self.players[player_id]
        player.bid_value = bid
        self.bids[player_id] = bid
        bid_str = "Nil (0)" if bid == 0 else str(bid)
        self.message = f"Заявка [{player.name}]: {bid_str}"

        self.current_turn = (self.current_turn + 1) % 4
        self._record_snapshot(event_type="bid_made")
        self._run_ai_bids()
        return self.get_state()

    def _finish_bidding(self) -> None:
        """Завершение фазы торговли и начало первой взятки."""
        self.phase = self.PHASE_PLAYING
        self.trick_number = 1
        self.current_trick = Trick(trick_number=1)
        # Первый ход делает игрок слева от сдающего
        self.current_turn = (self.dealer_idx + 1) % 4
        leader = self.players[self.current_turn]
        if self.current_turn != 0:
            self.message = f"Торговля завершена. Первый ход: {leader.name}..."
            self._record_snapshot(event_type="bidding_complete")

        self._run_ai_plays()

    def _run_ai_plays(self) -> None:
        """ИИ разыгрывают карты во взятке до тех пор, пока не наступит ход игрока-человека или взятка не завершится."""
        while self.phase == self.PHASE_PLAYING:
            assert self.current_trick is not None

            # Если взятка набрала 4 карты — подводим итоги
            if len(self.current_trick.played_cards) == 4:
                winner, winning_card = self.current_trick.get_current_winner()
                assert winner is not None and winning_card is not None
                self.current_turn = winner.player_id
                self.message = f"Взятку забирает {winner.name} ({winning_card})!"
                self._record_snapshot(
                    event_type="trick_complete",
                    trick_winner_id=winner.player_id,
                    winning_card_str=str(winning_card),
                )
                self._finish_trick()
                # Если после завершения взятки фаза сменилась (раунд закончился), выходим
                if self.phase != self.PHASE_PLAYING:
                    self._record_snapshot(event_type="round_complete")
                    return
                # Иначе взятка началась заново, продолжаем цикл
                if self.current_turn != 0:
                    leader = self.players[self.current_turn]
                    self.message = f"Взятка {self.trick_number}/13. Ход: {leader.name}..."
                    self._record_snapshot(event_type="trick_start")
                continue

            # Если текущий ход человека — прерываемся и ждем действия пользователя
            if self.current_turn == 0:
                self.message = "Ваш ход! Выберите карту."
                self._record_snapshot(event_type="human_turn")
                return

            # Ход ИИ игрока
            ai = self.players[self.current_turn]
            card = ai.choose_card(self.current_trick, spades_broken=self.spades_broken)

            if card.suit == Suit.SPADES and not self.spades_broken:
                self.spades_broken = True

            ai.remove_card(card)
            self.current_trick.add_card(player=ai, card=card)

            played_by = ai.player_id
            self.current_turn = (self.current_turn + 1) % 4

            if len(self.current_trick.played_cards) < 4:
                if self.current_turn == 0:
                    self.message = f"{ai.name} сходил {card}. Ваш ход! Выберите карту."
                    self._record_snapshot(event_type="human_turn", last_played_by=played_by)
                    return
                else:
                    next_p = self.players[self.current_turn]
                    self.message = f"{ai.name} сходил {card}. Ход: {next_p.name}..."
                    self._record_snapshot(event_type="card_played", last_played_by=played_by)
            else:
                self.message = f"{ai.name} сходил {card}."
                self._record_snapshot(event_type="card_played", last_played_by=played_by)

    def play_card(
        self,
        player_id: int,
        suit: Optional[str] = None,
        rank: Optional[int] = None,
        card_str: Optional[str] = None,
        card_index: Optional[int] = None,
    ) -> dict[str, Any]:
        """Сыграть карту игроком."""
        if self.phase != self.PHASE_PLAYING:
            raise ValueError(f"Сейчас нельзя ходить картой (текущая фаза: {self.phase})")
        if self.current_turn != player_id:
            raise ValueError(f"Сейчас не ход игрока {player_id}")
        assert self.current_trick is not None

        self._step_snapshots.clear()
        player = self.players[player_id]
        chosen_card = self._resolve_card(
            player=player,
            suit=suit,
            rank=rank,
            card_str=card_str,
            card_index=card_index,
        )

        valid_moves = player.get_valid_moves(self.current_trick.led_suit, self.spades_broken)
        if chosen_card not in valid_moves:
            raise ValueError(
                f"Карта {chosen_card} недопустима для хода. Допустимые: {[str(c) for c in valid_moves]}"
            )

        if chosen_card.suit == Suit.SPADES and not self.spades_broken:
            self.spades_broken = True

        player.remove_card(chosen_card)
        self.current_trick.add_card(player=player, card=chosen_card)

        self.current_turn = (self.current_turn + 1) % 4
        if len(self.current_trick.played_cards) < 4:
            next_p = self.players[self.current_turn]
            self.message = f"Вы сходили {chosen_card}. Ход: {next_p.name}..."
        else:
            self.message = f"Вы сходили {chosen_card}."
        self._record_snapshot(event_type="card_played", last_played_by=player_id)

        # Доигрываем оставшиеся ходы ИИ в этой взятке и, возможно, начинаем следующую
        self._run_ai_plays()

        return self.get_state()

    def _resolve_card(
        self,
        player: Player,
        suit: Optional[str] = None,
        rank: Optional[int] = None,
        card_str: Optional[str] = None,
        card_index: Optional[int] = None,
    ) -> Card:
        """Найти карту в руке игрока по переданным параметрам."""
        if card_index is not None:
            if 0 <= card_index < len(player.hand):
                return player.hand[card_index]
            raise ValueError(f"Неверный индекс карты: {card_index}")

        if suit is not None and rank is not None:
            for c in player.hand:
                if (c.suit.value == suit or c.suit.name == suit) and c.rank.value == rank:
                    return c
            raise ValueError(f"Карта {rank}{suit} не найдена в руке игрока")

        if card_str is not None:
            parsed = Card.parse(card_str)
            if parsed is not None and parsed in player.hand:
                return parsed
            s = card_str.strip().upper()
            for c in player.hand:
                if str(c).upper() == s:
                    return c
            raise ValueError(f"Карта '{card_str}' не найдена в руке игрока")

        raise ValueError("Не указана карта для хода")

    def _finish_trick(self) -> None:
        """Определить победителя взятки и перейти к следующей взятке или концу раунда."""
        assert self.current_trick is not None
        winner, winning_card = self.current_trick.get_current_winner()
        assert winner is not None and winning_card is not None

        winner.tricks_won += 1

        self.last_trick = {
            "trick_number": self.trick_number,
            "winner_id": winner.player_id,
            "winner_name": winner.name,
            "winning_card": str(winning_card),
            "cards": [
                {
                    "player_id": play.player.player_id,
                    "player_name": play.player.name,
                    "suit": play.card.suit.value,
                    "rank": play.card.rank.value,
                    "symbol": play.card.rank.symbol,
                    "display": str(play.card),
                }
                for play in self.current_trick.played_cards
            ],
        }
        self.round_tricks.append(dict(self.last_trick))

        if self.trick_number >= 13:
            # Все 13 взяток завершены -> подсчёт очков
            self._finish_round()
        else:
            # Следующая взятка
            self.trick_number += 1
            self.current_trick = Trick(trick_number=self.trick_number)
            self.current_turn = winner.player_id

    def _finish_round(self) -> None:
        """Подсчёт очков за раунд и проверка окончания партии."""
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
        score0 = ScoringEngine.calculate_team_round(
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
        score1 = ScoringEngine.calculate_team_round(
            team_state=self.team_states[1],
            player1=rec1,
            player2=rec3,
            config=self.scoring_config,
        )

        self.last_round_score = {
            "round_number": self.round_number,
            "team_0": {
                "name": score0.team_name,
                "contract_bid": score0.contract_bid,
                "tricks_won": score0.tricks_won,
                "contract_made": score0.contract_made,
                "contract_points": score0.contract_points,
                "overtricks": score0.overtricks,
                "nil_points": score0.nil_points_total,
                "bag_penalty": score0.bag_penalty,
                "round_net": score0.round_net_points,
                "total_score": score0.new_total_score,
                "bags": score0.bags_after,
            },
            "team_1": {
                "name": score1.team_name,
                "contract_bid": score1.contract_bid,
                "tricks_won": score1.tricks_won,
                "contract_made": score1.contract_made,
                "contract_points": score1.contract_points,
                "overtricks": score1.overtricks,
                "nil_points": score1.nil_points_total,
                "bag_penalty": score1.bag_penalty,
                "round_net": score1.round_net_points,
                "total_score": score1.new_total_score,
                "bags": score1.bags_after,
            },
        }

        self.history.append({
            "round_number": self.round_number,
            "dealer_id": self.dealer_idx,
            "dealer_name": self.players[self.dealer_idx].name,
            "bids": dict(self.bids),
            "tricks": list(self.round_tricks),
            "score": dict(self.last_round_score),
        })

        # Проверка завершения игры
        is_over, winning_team_id = ScoringEngine.check_game_over(
            team1_score=self.team_states[0].total_score,
            team2_score=self.team_states[1].total_score,
            target_score=self.target_score,
        )

        if is_over and winning_team_id is not None:
            self.phase = self.PHASE_GAME_OVER
            self.winner_team_id = winning_team_id
            self.stats["played"] += 1
            if winning_team_id == 0:
                self.stats["won"] += 1
            else:
                self.stats["lost"] += 1
            winner_name = self.team_states[winning_team_id].name
            self.message = f"Игра окончена! Победитель: {winner_name}!"
        else:
            self.phase = self.PHASE_ROUND_END
            self.message = f"Раунд {self.round_number} завершён. Нажмите 'Следующий раунд'."

    def next_round(self) -> dict[str, Any]:
        """Перейти к следующему раунду после завершения предыдущего."""
        if self.phase == self.PHASE_GAME_OVER:
            raise ValueError("Игра уже завершена. Начните новую игру.")
        if self.phase != self.PHASE_ROUND_END:
            raise ValueError("Текущий раунд ещё не завершён")

        self._step_snapshots.clear()
        self.dealer_idx = (self.dealer_idx + 1) % 4
        self.start_round()
        return self.get_state()

    def _record_snapshot(
        self,
        event_type: str = "state",
        last_played_by: Optional[int] = None,
        trick_winner_id: Optional[int] = None,
        winning_card_str: Optional[str] = None,
    ) -> None:
        """Записать промежуточный снимок состояния для пошаговой анимации в клиенте."""
        self.event_type = event_type
        self.last_played_by = last_played_by
        self.trick_winner_id = trick_winner_id
        self.winning_card_str = winning_card_str
        self._step_snapshots.append(self._build_state_dict())

    def _build_state_dict(self) -> dict[str, Any]:
        """Сформировать словарь текущего состояния без истории шагов."""
        human = self.players[0]
        valid_moves: list[Card] = []
        if self.phase == self.PHASE_PLAYING and self.current_turn == 0 and self.event_type != "trick_complete":
            led_suit = self.current_trick.led_suit if self.current_trick else None
            valid_moves = human.get_valid_moves(led_suit, self.spades_broken)

        # Сериализация карт руки
        hand_cards = [
            {
                "index": idx,
                "suit": c.suit.value,
                "suit_name": c.suit.name_ru,
                "rank": c.rank.value,
                "symbol": c.rank.symbol,
                "name": c.full_name(),
                "display": str(c),
                "is_trump": c.suit.is_trump,
                "is_valid": c in valid_moves,
            }
            for idx, c in enumerate(human.hand)
        ]

        # Карты текущей взятки
        trick_cards = []
        if self.current_trick:
            for play in self.current_trick.played_cards:
                trick_cards.append({
                    "player_id": play.player.player_id,
                    "player_name": play.player.name,
                    "suit": play.card.suit.value,
                    "rank": play.card.rank.value,
                    "symbol": play.card.rank.symbol,
                    "display": str(play.card),
                })

        # Игроки
        players_data = [
            {
                "id": p.player_id,
                "name": p.name,
                "team_id": p.team_id,
                "bid": self.bids.get(p.player_id),
                "tricks_won": p.tricks_won,
                "cards_count": len(p.hand),
                "is_dealer": p.player_id == self.dealer_idx,
                "is_current": p.player_id == self.current_turn,
            }
            for p in self.players
        ]

        # Команды
        bids_t0 = (self.bids.get(0, 0) or 0) + (self.bids.get(2, 0) or 0)
        bids_t1 = (self.bids.get(1, 0) or 0) + (self.bids.get(3, 0) or 0)
        tricks_t0 = self.players[0].tricks_won + self.players[2].tricks_won
        tricks_t1 = self.players[1].tricks_won + self.players[3].tricks_won

        teams_data = {
            "0": {
                "team_id": 0,
                "name": self.team_states[0].name,
                "total_score": self.team_states[0].total_score,
                "bags": self.team_states[0].bags,
                "bid": bids_t0,
                "tricks_won": tricks_t0,
            },
            "1": {
                "team_id": 1,
                "name": self.team_states[1].name,
                "total_score": self.team_states[1].total_score,
                "bags": self.team_states[1].bags,
                "bid": bids_t1,
                "tricks_won": tricks_t1,
            },
        }

        # Описание текущего статуса
        current_player = self.players[self.current_turn]
        status_message = self.message
        if not status_message:
            if self.phase == self.PHASE_BIDDING:
                status_message = f"Очередь делать ставку: {current_player.name}"
            elif self.phase == self.PHASE_PLAYING:
                status_message = f"Очередь хода: {current_player.name}"

        if self.phase == self.PHASE_BIDDING:
            is_human_turn = (self.current_turn == 0 and 0 not in self.bids)
        elif self.phase == self.PHASE_PLAYING:
            is_human_turn = (self.current_turn == 0 and self.event_type != "trick_complete")
        else:
            is_human_turn = False

        return {
            "game_id": self.game_id,
            "stats": dict(self.stats),
            "phase": self.phase,
            "event_type": self.event_type,
            "last_played_by": self.last_played_by,
            "trick_winner_id": self.trick_winner_id,
            "winning_card_str": self.winning_card_str,
            "round_number": self.round_number,
            "target_score": self.target_score,
            "dealer_idx": self.dealer_idx,
            "dealer_name": self.players[self.dealer_idx].name,
            "current_turn": self.current_turn,
            "current_player_name": current_player.name,
            "is_human_turn": is_human_turn,
            "spades_broken": self.spades_broken,
            "hand": hand_cards,
            "valid_moves_count": len(valid_moves),
            "bids": dict(self.bids),
            "current_trick_number": self.trick_number,
            "current_trick": trick_cards,
            "last_trick": self.last_trick,
            "players": players_data,
            "teams": teams_data,
            "last_round_score": self.last_round_score,
            "winner_team_id": self.winner_team_id,
            "message": status_message,
            "scoring_rules": {
                "target_score": self.target_score,
                "bags_limit": self.scoring_config.bags_limit,
                "bag_penalty_points": self.scoring_config.bag_penalty_points,
                "nil_points": self.scoring_config.nil_points,
            },
            "history_count": len(self.history),
        }

    def get_state(self) -> dict[str, Any]:
        """Сформировать полное состояние игры в формате JSON-словаря."""
        state = self._build_state_dict()
        state["steps"] = list(self._step_snapshots)
        return state

    def get_history(self) -> list[dict[str, Any]]:
        """Получить историю всех завершённых раундов и взяток текущей партии."""
        return list(self.history)
