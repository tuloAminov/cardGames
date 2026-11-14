"""Unit и интеграционные тесты для Flask API веб-интерфейса (web/app.py)."""

from __future__ import annotations

import unittest
from web.app import app, game_session


class TestWebAPI(unittest.TestCase):
    """Тестирование REST API веб-сервера."""

    def setUp(self) -> None:
        self.client = app.test_client()
        app.config["TESTING"] = True
        # Начинаем новую тестовую игру
        game_session.reset_game(player_name="ТестИгрок", target_score=500)

    def test_index_page(self) -> None:
        """Главная страница возвращает HTML 200 OK."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"<!DOCTYPE html>", response.data)
        self.assertIn("ПИКИ".encode("utf-8"), response.data)

    def test_api_new_game(self) -> None:
        """POST /api/new_game начинает новую партию."""
        response = self.client.post(
            "/api/new_game",
            json={"player_name": "НовыйИгрок", "target_score": 300},
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["round_number"], 1)
        self.assertEqual(data["target_score"], 300)
        self.assertEqual(len(data["hand"]), 13)

    def test_api_state(self) -> None:
        """GET /api/state возвращает текущее состояние."""
        response = self.client.get("/api/state")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("phase", data)
        self.assertIn("hand", data)
        self.assertIn("teams", data)
        self.assertIn("players", data)
        self.assertEqual(len(data["hand"]), 13)

    def test_api_bid_success_and_validation(self) -> None:
        """POST /api/bid делает ставку и проверяет валидацию."""
        # Успешная ставка 3
        res = self.client.post("/api/bid", json={"bid": 3})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "ok")
        # После ставки человека все 4 ставки должны быть сделаны
        self.assertEqual(len(data["bids"]), 4)
        self.assertEqual(data["bids"]["0"], 3)
        # Фаза перешла в playing
        self.assertEqual(data["phase"], "playing")

        # Повторная ставка при phase=playing должна вернуть ошибку 400
        res_error = self.client.post("/api/bid", json={"bid": 2})
        self.assertEqual(res_error.status_code, 400)

    def test_api_bid_invalid_value(self) -> None:
        """POST /api/bid с некорректным значением возвращает 400."""
        # Отрицательная ставка
        res = self.client.post("/api/bid", json={"bid": -1})
        self.assertEqual(res.status_code, 400)

        # Слишком большая ставка (> 13)
        res2 = self.client.post("/api/bid", json={"bid": 14})
        self.assertEqual(res2.status_code, 400)

        # Отсутствие ставки
        res3 = self.client.post("/api/bid", json={})
        self.assertEqual(res3.status_code, 400)

    def test_api_play_card(self) -> None:
        """POST /api/play_card разыгрывает карту из руки."""
        # Сначала делаем ставку, чтобы перейти к игре
        self.client.post("/api/bid", json={"bid": 2})

        # Получаем состояние
        state = self.client.get("/api/state").get_json()
        hand = state["hand"]

        # Ищем допустимую для хода карту
        valid_card = None
        for c in hand:
            if c.get("is_valid"):
                valid_card = c
                break

        self.assertIsNotNone(valid_card, "В начале хода должна быть хотя бы одна допустимая карта")

        # Играем допустимую карту
        res = self.client.post(
            "/api/play_card",
            json={
                "suit": valid_card["suit"],
                "rank": valid_card["rank"],
            },
        )
        self.assertEqual(res.status_code, 200)
        new_state = res.get_json()
        self.assertEqual(new_state["status"], "ok")
        # В руке игрока стало 12 карт
        self.assertEqual(len(new_state["hand"]), 12)

    def test_api_play_card_by_card_str(self) -> None:
        """POST /api/play_card с параметром card_str поддерживает текстовое обозначение карты."""
        self.client.post("/api/bid", json={"bid": 2})
        state = self.client.get("/api/state").get_json()
        valid_card = next(c for c in state["hand"] if c.get("is_valid"))

        res = self.client.post(
            "/api/play_card",
            json={"card_str": valid_card["display"]},
        )
        self.assertEqual(res.status_code, 200)
        new_state = res.get_json()
        self.assertEqual(len(new_state["hand"]), 12)

    def test_api_new_game_standard_mode(self) -> None:
        """POST /api/new_game со стандартным режимом (500 очков, 10 мешков, Nil = 100)."""
        res = self.client.post(
            "/api/new_game",
            json={"player_name": "Капитан", "scoring_mode": "standard"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["target_score"], 500)
        self.assertEqual(data["scoring_rules"]["bags_limit"], 10)
        self.assertEqual(data["scoring_rules"]["bag_penalty_points"], 100)
        self.assertEqual(data["scoring_rules"]["nil_points"], 100)

    def test_api_new_game_short_mode(self) -> None:
        """POST /api/new_game с быстрым режимом (250 очков, 6 мешков, Nil = 50)."""
        res = self.client.post(
            "/api/new_game",
            json={"player_name": "Быстрый", "scoring_mode": "short"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["target_score"], 250)
        self.assertEqual(data["scoring_rules"]["bags_limit"], 6)
        self.assertEqual(data["scoring_rules"]["bag_penalty_points"], 50)
        self.assertEqual(data["scoring_rules"]["nil_points"], 50)

    def test_api_history_endpoint(self) -> None:
        """GET /api/history возвращает статус ok и массив истории."""
        res = self.client.get("/api/history")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "ok")
        self.assertIsInstance(data["history"], list)

    def test_api_next_round_error_when_round_active(self) -> None:
        """POST /api/next_round возвращает 400, если текущий раунд ещё не завершён."""
        res = self.client.post("/api/next_round")
        self.assertEqual(res.status_code, 400)

    def test_api_full_game_lifecycle_end_to_end(self) -> None:
        """Сквозной интеграционный тест: полный жизненный цикл игры через Web API до победы одной из команд."""
        # 1. Запуск игры с низкой целью очков (30 очков), чтобы партия быстро завершилась
        res = self.client.post(
            "/api/new_game",
            json={"player_name": "Чемпион", "target_score": 30, "scoring_mode": "short"},
        )
        self.assertEqual(res.status_code, 200)

        max_rounds = 10
        rounds_played = 0

        while rounds_played < max_rounds:
            state = self.client.get("/api/state").get_json()

            if state["phase"] == "game_over":
                break

            # 2. Фаза торговли: делаем ставку человека
            if state["phase"] == "bidding":
                bid_res = self.client.post("/api/bid", json={"bid": 3})
                self.assertEqual(bid_res.status_code, 200)
                state = bid_res.get_json()

            # 3. Фаза розыгрыша взяток
            while state["phase"] == "playing":
                if state["is_human_turn"]:
                    valid_card = next((c for c in state["hand"] if c["is_valid"]), None)
                    self.assertIsNotNone(valid_card, "В руке человека должна быть допустимая карта")
                    play_res = self.client.post(
                        "/api/play_card",
                        json={"card_index": valid_card["index"]},
                    )
                    self.assertEqual(play_res.status_code, 200)
                    state = play_res.get_json()
                else:
                    # Если ход ИИ, запрашиваем обновлённый state
                    state = self.client.get("/api/state").get_json()

            # 4. Раунд завершён
            self.assertIn(state["phase"], ("round_end", "game_over"))
            self.assertIsNotNone(state["last_round_score"])
            rounds_played += 1

            if state["phase"] == "game_over":
                break

            # 5. Переход к следующему раунду
            next_res = self.client.post("/api/next_round")
            self.assertEqual(next_res.status_code, 200)

        # 6. Проверяем итоги партии
        final_state = self.client.get("/api/state").get_json()
        self.assertEqual(final_state["phase"], "game_over")
        self.assertIn(final_state["winner_team_id"], (0, 1))
        self.assertGreaterEqual(final_state["stats"]["played"], 1)

        # 7. Проверяем историю
        history_res = self.client.get("/api/history")
        self.assertEqual(history_res.status_code, 200)
        history_data = history_res.get_json()["history"]
        self.assertEqual(len(history_data), rounds_played)
        self.assertEqual(len(history_data[0]["tricks"]), 13)


if __name__ == "__main__":
    unittest.main()
