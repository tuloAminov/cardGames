"""Модуль подсчёта очков в игре «Пики».

Правила:
- Контракт выполнен: 10 очков за каждую заявленную взятку + 1 очко за каждый овертрик.
- Мешки (овертрики) накапливаются. Каждые 6 мешков дают штраф −50 очков (мешки сбрасываются по модулю 6).
- Контракт провален: штраф −10 очков за каждую заявленную взятку.
- Ставка «ноль» (Nil): +50 очков при 0 взяток, −50 очков при 1 или более взятках.
- Игра продолжается до достижения 250 очков одной из команд.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class ScoringConfig:
    """Конфигурация правил подсчёта очков в игре «Пики»."""

    target_score: int = 250
    bags_limit: int = 6
    bag_penalty_points: int = 50
    nil_points: int = 50

    @classmethod
    def standard(cls) -> ScoringConfig:
        """Классические правила: цель 500 очков, 10 мешков = -100, Nil = +100/-100."""
        return cls(
            target_score=500,
            bags_limit=10,
            bag_penalty_points=100,
            nil_points=100,
        )

    @classmethod
    def short_game(cls) -> ScoringConfig:
        """Быстрая партия: цель 250 очков, 6 мешков = -50, Nil = +50/-50."""
        return cls(
            target_score=250,
            bags_limit=6,
            bag_penalty_points=50,
            nil_points=50,
        )


@dataclass
class PlayerRoundRecord:
    """Итоги раунда для отдельного игрока."""

    player_id: int
    name: str
    bid: int
    tricks_won: int
    nil_bonus: int = 50

    @property
    def is_nil(self) -> bool:
        """Объявлял ли игрок ставку Nil."""
        return self.bid == 0

    @property
    def nil_success(self) -> Optional[bool]:
        """Успешна ли ставка Nil (None, если игрок не ставил Nil)."""
        if not self.is_nil:
            return None
        return self.tricks_won == 0

    @property
    def nil_points(self) -> int:
        """Очки за ставку Nil (+nil_bonus, -nil_bonus или 0)."""
        if not self.is_nil:
            return 0
        return self.nil_bonus if self.nil_success else -self.nil_bonus


@dataclass
class TeamRoundScore:
    """Полный результат подсчёта очков команды за один раунд."""

    team_id: int
    team_name: str
    player_records: list[PlayerRoundRecord]

    # Данные контракта
    contract_bid: int
    tricks_won: int
    contract_made: bool
    contract_points: int
    overtricks: int

    # Nil
    nil_points_total: int

    # Мешки
    bags_before: int
    bags_added: int
    bag_penalty: int
    bags_after: int

    # Итоговый счет
    round_net_points: int
    previous_total_score: int
    new_total_score: int

    # Параметры правил
    bags_limit: int = 6
    nil_bonus: int = 50


@dataclass
class TeamState:
    """Текущее долговременное состояние команды в партии."""

    team_id: int
    name: str
    total_score: int = 0
    bags: int = 0
    round_history: list[TeamRoundScore] = field(default_factory=list)


class ScoringEngine:
    """Движок подсчёта очков и определения победителя."""

    TARGET_SCORE: int = 250
    BAGS_LIMIT: int = 6
    BAG_PENALTY_POINTS: int = 50
    NIL_POINTS: int = 50

    @classmethod
    def get_default_config(cls) -> ScoringConfig:
        """Получить конфигурацию по умолчанию."""
        return ScoringConfig(
            target_score=cls.TARGET_SCORE,
            bags_limit=cls.BAGS_LIMIT,
            bag_penalty_points=cls.BAG_PENALTY_POINTS,
            nil_points=cls.NIL_POINTS,
        )

    @classmethod
    def calculate_team_round(
        cls,
        team_state: TeamState,
        player1: PlayerRoundRecord,
        player2: PlayerRoundRecord,
        config: Optional[ScoringConfig] = None,
    ) -> TeamRoundScore:
        """Рассчитать очки команды за один раунд."""
        cfg = config or cls.get_default_config()
        players = [player1, player2]

        # 1. Очки за Nil
        for p in players:
            if p.is_nil:
                p.nil_bonus = cfg.nil_points
        nil_points_total = sum(p.nil_points for p in players if p.is_nil)

        # 2. Обычный контракт команды
        # Сумма ненулевых ставок партнеров
        contract_bid = sum(p.bid for p in players if not p.is_nil)
        total_tricks = player1.tricks_won + player2.tricks_won

        contract_made = False
        contract_points = 0
        overtricks = 0

        if contract_bid > 0:
            if total_tricks >= contract_bid:
                contract_made = True
                overtricks = total_tricks - contract_bid
                contract_points = (contract_bid * 10) + overtricks
            else:
                contract_made = False
                contract_points = -(contract_bid * 10)
                overtricks = 0
        else:
            # Оба игрока заявили Nil
            # Если оба заявили Nil, у команды нет контракта в обычном смысле.
            # Если взяли взятки, они являются овертриками (мешками).
            contract_made = True
            contract_points = 0
            overtricks = total_tricks

        # 3. Накопление мешков и штрафы
        bags_before = team_state.bags
        bags_added = overtricks
        total_bags_candidate = bags_before + bags_added

        penalty_count = total_bags_candidate // cfg.bags_limit
        bag_penalty = penalty_count * cfg.bag_penalty_points
        bags_after = total_bags_candidate % cfg.bags_limit

        # 4. Итоговое изменение очков за раунд
        # contract_points + nil_points_total - bag_penalty
        round_net_points = contract_points + nil_points_total - bag_penalty
        new_total_score = team_state.total_score + round_net_points

        result = TeamRoundScore(
            team_id=team_state.team_id,
            team_name=team_state.name,
            player_records=players,
            contract_bid=contract_bid,
            tricks_won=total_tricks,
            contract_made=contract_made,
            contract_points=contract_points,
            overtricks=overtricks,
            nil_points_total=nil_points_total,
            bags_before=bags_before,
            bags_added=bags_added,
            bag_penalty=bag_penalty,
            bags_after=bags_after,
            round_net_points=round_net_points,
            previous_total_score=team_state.total_score,
            new_total_score=new_total_score,
            bags_limit=cfg.bags_limit,
            nil_bonus=cfg.nil_points,
        )

        # Обновляем состояние команды
        team_state.total_score = new_total_score
        team_state.bags = bags_after
        team_state.round_history.append(result)

        return result

    @classmethod
    def check_game_over(
        cls,
        team1_score: int,
        team2_score: int,
        target_score: int = TARGET_SCORE,
    ) -> tuple[bool, Optional[int]]:
        """Проверить, завершилась ли игра.

        :return: (is_over, winning_team_id)
        Если игра не окончена, возвращает (False, None).
        Если ничья при счете >= 500, возвращает (False, None) для продолжения игры.
        """
        team1_reached = team1_score >= target_score
        team2_reached = team2_score >= target_score

        if not team1_reached and not team2_reached:
            return False, None

        if team1_reached and not team2_reached:
            return True, 0

        if team2_reached and not team1_reached:
            return True, 1

        # Обе команды набрали >= target_score
        if team1_score > team2_score:
            return True, 0
        if team2_score > team1_score:
            return True, 1

        # Ровно поровну (ничья при >= 500) — игра продолжается еще раунд
        return False, None
