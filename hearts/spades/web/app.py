"""Flask веб-сервер и REST API для игры «Пики»."""

from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path
from flask import Flask, jsonify, render_template, request, session as flask_session

# Обеспечиваем доступ к пакету core
_current_dir = Path(__file__).resolve().parent
_project_root = _current_dir.parent
for _p in (str(_project_root), str(_project_root.parent)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from core.session import GameSession
    from core.scoring import ScoringConfig
except ModuleNotFoundError:
    from spades.core.session import GameSession
    from spades.core.scoring import ScoringConfig

app = Flask(
    __name__,
    template_folder=str(_current_dir / "templates"),
    static_folder=str(_current_dir / "static"),
)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "spades-game-secret-key")

# Реестр сессий для поддержки изоляции вкладок и пользователей
_sessions: dict[str, GameSession] = {}
default_session = GameSession()


def get_current_session() -> GameSession:
    """Получить игровую сессию текущего пользователя."""
    if app.config.get("TESTING"):
        return default_session

    session_id = flask_session.get("game_session_id")
    if not session_id:
        session_id = uuid.uuid4().hex
        flask_session["game_session_id"] = session_id

    if session_id not in _sessions:
        if len(_sessions) >= 200:
            # Ограничиваем объём кэша сессий в памяти (FIFO) для защиты от утечек
            oldest_key = next(iter(_sessions))
            _sessions.pop(oldest_key, None)
        _sessions[session_id] = GameSession()
    return _sessions[session_id]


# Глобальная сессия по умолчанию (для обратной совместимости при тестах и импортах)
game_session = default_session


@app.route("/")
def index():
    """Главная страница с игровым столом."""
    # Инициализируем идентификатор сессии в cookie при заходе на страницу
    get_current_session()
    return render_template("index.html")


@app.route("/api/new_game", methods=["POST"])
def api_new_game():
    """Начать новую игру.

    Параметры (JSON, необязательные):
    - player_name: str (по умолчанию "Игрок 1 (Вы)")
    - target_score: int (по умолчанию 250 или 500 в зависимости от режима)
    - scoring_mode: str ("standard", "short")
    - bags_limit: int (опционально)
    - bag_penalty: int (опционально)
    - nil_points: int (опционально)
    """
    curr_session = get_current_session()
    data = request.get_json(silent=True) or {}
    player_name = data.get("player_name", "Игрок 1 (Вы)")
    scoring_mode = data.get("scoring_mode")

    raw_target = data.get("target_score")
    if raw_target is not None:
        try:
            target_score = int(raw_target)
        except (ValueError, TypeError):
            target_score = 500 if scoring_mode == "standard" else 250
    else:
        target_score = 500 if scoring_mode == "standard" else 250

    if scoring_mode == "standard":
        scoring_config = ScoringConfig.standard()
        if raw_target is not None:
            scoring_config = ScoringConfig(
                target_score=target_score,
                bags_limit=10,
                bag_penalty_points=100,
                nil_points=100,
            )
    elif scoring_mode == "short":
        scoring_config = ScoringConfig.short_game()
        if raw_target is not None:
            scoring_config = ScoringConfig(
                target_score=target_score,
                bags_limit=6,
                bag_penalty_points=50,
                nil_points=50,
            )
    else:
        bags_limit = data.get("bags_limit")
        bag_penalty = data.get("bag_penalty")
        nil_points = data.get("nil_points")
        if bags_limit is not None or bag_penalty is not None or nil_points is not None:
            try:
                bl = int(bags_limit) if bags_limit is not None else (10 if target_score >= 500 else 6)
                bp = int(bag_penalty) if bag_penalty is not None else (100 if target_score >= 500 else 50)
                np_val = int(nil_points) if nil_points is not None else (100 if target_score >= 500 else 50)
                scoring_config = ScoringConfig(
                    target_score=target_score,
                    bags_limit=bl,
                    bag_penalty_points=bp,
                    nil_points=np_val,
                )
            except (ValueError, TypeError):
                scoring_config = (
                    ScoringConfig(target_score=target_score, bags_limit=10, bag_penalty_points=100, nil_points=100)
                    if target_score >= 500
                    else ScoringConfig(target_score=target_score, bags_limit=6, bag_penalty_points=50, nil_points=50)
                )
        else:
            scoring_config = (
                ScoringConfig(target_score=target_score, bags_limit=10, bag_penalty_points=100, nil_points=100)
                if target_score >= 500
                else ScoringConfig(target_score=target_score, bags_limit=6, bag_penalty_points=50, nil_points=50)
            )

    curr_session.reset_game(
        player_name=player_name,
        target_score=target_score,
        scoring_config=scoring_config,
    )
    state = curr_session.get_state()
    return jsonify({"status": "ok", "state": state, **state}), 200


@app.route("/api/history", methods=["GET"])
def api_get_history():
    """Получить историю завершённых раундов и взяток."""
    curr_session = get_current_session()
    history = curr_session.get_history()
    return jsonify({"status": "ok", "history": history}), 200


@app.route("/api/state", methods=["GET"])
def api_get_state():
    """Получить текущее состояние игры."""
    curr_session = get_current_session()
    state = curr_session.get_state()
    return jsonify({"status": "ok", "state": state, **state}), 200


@app.route("/api/bid", methods=["POST"])
def api_make_bid():
    """Сделать ставку для игрока.

    Тело запроса (JSON):
    - bid: int (0 для Nil, от 1 до 13)
    """
    curr_session = get_current_session()
    data = request.get_json(silent=True)
    if not data or "bid" not in data:
        return jsonify({"status": "error", "message": "Параметр 'bid' обязателен"}), 400

    try:
        bid = int(data["bid"])
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Ставка должна быть целым числом"}), 400

    try:
        curr_session.make_bid(player_id=0, bid=bid)
        state = curr_session.get_state()
        return jsonify({"status": "ok", "state": state, **state}), 200
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route("/api/play_card", methods=["POST"])
def api_play_card():
    """Сыграть карту из руки игрока.

    Тело запроса (JSON):
    - suit: str (например, "♠", "♥", "♦", "♣")
    - rank: int (2..14)
    ИЛИ:
    - card_index: int (индекс карты в руке)
    ИЛИ:
    - card_str: str (например, "Т♠", "10♥")
    """
    curr_session = get_current_session()
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error", "message": "Отсутствует тело запроса"}), 400

    suit = data.get("suit")
    rank = data.get("rank")
    card_str = data.get("card_str")
    card_index = data.get("card_index")

    if rank is not None:
        try:
            rank = int(rank)
        except (ValueError, TypeError):
            rank = None

    if card_index is not None:
        try:
            card_index = int(card_index)
        except (ValueError, TypeError):
            card_index = None

    try:
        curr_session.play_card(
            player_id=0,
            suit=suit,
            rank=rank,
            card_str=card_str,
            card_index=card_index,
        )
        state = curr_session.get_state()
        return jsonify({"status": "ok", "state": state, **state}), 200
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route("/api/next_round", methods=["POST"])
def api_next_round():
    """Начать следующий раунд после завершения предыдущего."""
    curr_session = get_current_session()
    try:
        curr_session.next_round()
        state = curr_session.get_state()
        return jsonify({"status": "ok", "state": state, **state}), 200
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)}), 400


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
