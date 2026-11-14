/**
 * Клиентский скрипт для веб-интерфейса игры «Пики» (Spades).
 * Поддержка звуковых эффектов (Web Audio API), горячих клавиш,
 * виджета предыдущей взятки, журнала истории партии и модальных окон.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Состояние игры
    let gameState = null;
    let isRequestInProgress = false;
    let animationRunId = 0;

    // Настройки звука и скорости
    let soundEnabled = localStorage.getItem("spades_sound_enabled") !== "false";
    let currentSpeed = localStorage.getItem("spades_anim_speed") || "normal";
    let audioCtx = null;

    // DOM Элементы шапки
    const roundNumberEl = document.getElementById("round-number");
    const statPlayedEl = document.getElementById("stat-played");
    const statWonEl = document.getElementById("stat-won");
    const statLostEl = document.getElementById("stat-lost");
    const scoreTeam0El = document.getElementById("score-team0");
    const contractTeam0El = document.getElementById("contract-team0");
    const bagsTeam0El = document.getElementById("bags-team0");
    const scoreTeam1El = document.getElementById("score-team1");
    const contractTeam1El = document.getElementById("contract-team1");
    const bagsTeam1El = document.getElementById("bags-team1");

    const btnSoundToggle = document.getElementById("btn-sound-toggle");
    const soundIcon = document.getElementById("sound-icon");
    const btnRules = document.getElementById("btn-rules");
    const btnHistory = document.getElementById("btn-history");
    const btnNewGame = document.getElementById("btn-new-game");

    const centerMessageEl = document.getElementById("center-message");
    const trickTitleEl = document.getElementById("trick-title");

    // Слоты взятки (0 - Вы, 1 - Запад/Игрок 3, 2 - Север/Игрок 2, 3 - Восток/Игрок 4)
    const spots = {
        0: document.getElementById("spot-south"),
        1: document.getElementById("spot-west"),
        2: document.getElementById("spot-north"),
        3: document.getElementById("spot-east"),
    };

    const spotDirections = {
        0: "from-south",
        1: "from-west",
        2: "from-north",
        3: "from-east",
    };

    const collectDirections = {
        0: "collect-to-south",
        1: "collect-to-west",
        2: "collect-to-north",
        3: "collect-to-east",
    };

    // Виджет предыдущей взятки
    const lastTrickWidget = document.getElementById("last-trick-widget");
    const lastTrickWinnerEl = document.getElementById("last-trick-winner");
    const lastTrickCardsEl = document.getElementById("last-trick-cards");

    // Рука игрока
    const cardsFanContainer = document.getElementById("cards-fan");
    const humanBidBadge = document.getElementById("human-bid-badge");
    const humanTricksBadge = document.getElementById("human-tricks-badge");
    const humanTeamContract = document.getElementById("human-team-contract");
    const oppTeamContract = document.getElementById("opp-team-contract");

    // Модальные окна
    const bidModal = document.getElementById("bid-modal");
    const bidPartnerInfo = document.getElementById("bid-partner-info");
    const roundSummaryModal = document.getElementById("round-summary-modal");
    const roundSummaryContent = document.getElementById("round-summary-content");
    const btnNextRound = document.getElementById("btn-next-round");
    const gameOverModal = document.getElementById("game-over-modal");
    const gameoverWinnerTitle = document.getElementById("gameover-winner-title");
    const gameoverContent = document.getElementById("gameover-content");
    const btnRestartGame = document.getElementById("btn-restart-game");

    // Новые модальные окна
    const newGameModal = document.getElementById("new-game-modal");
    const btnCloseNewGame = document.getElementById("btn-close-new-game");
    const btnCancelNewGame = document.getElementById("btn-cancel-new-game");
    const btnConfirmNewGame = document.getElementById("btn-confirm-new-game");
    const inputPlayerName = document.getElementById("input-player-name");
    const radioStandard = document.getElementById("radio-label-standard");
    const radioShort = document.getElementById("radio-label-short");
    const selectAnimSpeed = document.getElementById("select-anim-speed");

    const rulesModal = document.getElementById("rules-modal");
    const btnCloseRules = document.getElementById("btn-close-rules");
    const btnOkRules = document.getElementById("btn-ok-rules");

    const historyModal = document.getElementById("history-modal");
    const btnCloseHistory = document.getElementById("btn-close-history");
    const btnCloseHistoryFooter = document.getElementById("btn-close-history-footer");
    const historyContent = document.getElementById("history-content");

    const HOTKEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "q", "w", "e", "r"];

    // =========================================================================
    // ЗВУКОВОЙ СИНТЕЗАТОР (WEB AUDIO API)
    // =========================================================================

    function updateSoundIcon() {
        if (soundIcon) {
            soundIcon.textContent = soundEnabled ? "🔊" : "🔇";
        }
    }

    function getAudioContext() {
        if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContextClass();
        }
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playSound(type) {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            if (type === "card_play") {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(480, now);
                osc.frequency.exponentialRampToValueAtTime(240, now + 0.07);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.07);
            } else if (type === "trick_won") {
                [523.25, 659.25, 783.99].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "triangle";
                    osc.frequency.setValueAtTime(freq, now + idx * 0.07);
                    gain.gain.setValueAtTime(0.18, now + idx * 0.07);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.07);
                    osc.stop(now + idx * 0.07 + 0.18);
                });
            } else if (type === "deal") {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(540, now + 0.06);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.06);
            } else if (type === "victory") {
                [440, 554.37, 659.25, 880].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                    gain.gain.setValueAtTime(0.22, now + idx * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.1);
                    osc.stop(now + idx * 0.1 + 0.35);
                });
            }
        } catch (e) {
            // Аудио-контекст может блокироваться браузером до первого клика
        }
    }

    // =========================================================================
    // API И АНИМАЦИЯ
    // =========================================================================

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function getSpeedMultiplier() {
        if (currentSpeed === "fast") return 0.5;
        if (currentSpeed === "slow") return 1.6;
        return 1.0;
    }

    function getStepDelay(currentStep, nextStep) {
        const type = currentStep.event_type;
        let baseDelay = 300;
        if (type === "bid_made") baseDelay = 260;
        else if (type === "bidding_complete") baseDelay = 300;
        else if (type === "trick_complete") baseDelay = 500;
        else if (type === "trick_start") baseDelay = 200;
        else if (type === "card_played") {
            baseDelay = (nextStep && nextStep.event_type === "trick_complete") ? 300 : 400;
        }
        return Math.round(baseDelay * getSpeedMultiplier());
    }

    function animateTrickCollect(winnerId) {
        const collectClass = collectDirections[winnerId];
        if (!collectClass) return;

        [0, 1, 2, 3].forEach((id) => {
            const spot = spots[id];
            if (!spot) return;
            const cardEl = spot.querySelector(".card.in-trick");
            if (cardEl) {
                cardEl.classList.remove("from-south", "from-west", "from-north", "from-east");
                cardEl.classList.add(collectClass);
            }
        });
    }

    async function applyStateWithSteps(stateData) {
        const currentRun = ++animationRunId;
        const steps = stateData.steps;

        if (Array.isArray(steps) && steps.length > 1) {
            for (let i = 0; i < steps.length; i++) {
                if (currentRun !== animationRunId) return;
                const step = steps[i];
                gameState = step;
                renderGame();

                if (step.event_type === "card_played") {
                    playSound("card_play");
                }

                if (step.event_type === "trick_complete" && step.trick_winner_id != null) {
                    playSound("trick_won");
                    const winnerSlot = document.getElementById(`player-${step.trick_winner_id}`);
                    if (winnerSlot) winnerSlot.classList.add("trick-winner-highlight");
                    await sleep(Math.round(480 * getSpeedMultiplier()));
                    if (currentRun !== animationRunId) return;
                    animateTrickCollect(step.trick_winner_id);
                    await sleep(Math.round(300 * getSpeedMultiplier()));
                    if (winnerSlot) winnerSlot.classList.remove("trick-winner-highlight");
                    continue;
                }

                if (i < steps.length - 1) {
                    const delay = getStepDelay(step, steps[i + 1]);
                    await sleep(delay);
                }
            }
            if (currentRun !== animationRunId) return;
            gameState = stateData;
            renderGame();
        } else {
            gameState = stateData;
            renderGame();
        }
    }

    async function fetchState() {
        try {
            const res = await fetch("/api/state");
            const data = await res.json();
            gameState = data.state || data;
            renderGame();
        } catch (err) {
            console.error("Ошибка загрузки состояния:", err);
            showCenterMessage("Ошибка подключения к серверу");
        }
    }

    async function sendNewGame(options = {}) {
        if (isRequestInProgress) return;
        isRequestInProgress = true;
        try {
            const playerName = options.player_name || (inputPlayerName ? inputPlayerName.value.trim() : "Игрок 1 (Вы)");
            const mode = options.scoring_mode || "standard";
            const targetScore = options.target_score || (mode === "standard" ? 500 : 250);

            const res = await fetch("/api/new_game", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    player_name: playerName,
                    target_score: targetScore,
                    scoring_mode: mode,
                }),
            });
            const data = await res.json();
            closeAllModals();
            playSound("deal");
            await applyStateWithSteps(data.state || data);
        } catch (err) {
            console.error("Ошибка начала новой игры:", err);
        } finally {
            isRequestInProgress = false;
        }
    }

    async function sendBid(bidValue) {
        if (isRequestInProgress) return;
        isRequestInProgress = true;
        try {
            const res = await fetch("/api/bid", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bid: bidValue }),
            });
            const data = await res.json();
            if (data.status === "error") {
                showToast(data.message, "error");
            } else {
                bidModal.classList.remove("show");
                await applyStateWithSteps(data.state || data);
            }
        } catch (err) {
            console.error("Ошибка ставки:", err);
        } finally {
            isRequestInProgress = false;
        }
    }

    async function sendPlayCard(card) {
        if (isRequestInProgress) return;
        isRequestInProgress = true;
        try {
            playSound("card_play");
            const res = await fetch("/api/play_card", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    suit: card.suit,
                    rank: card.rank,
                    card_index: card.index,
                }),
            });
            const data = await res.json();
            if (data.status === "error") {
                showToast("Недопустимый ход: " + data.message, "error");
            } else {
                await applyStateWithSteps(data.state || data);
            }
        } catch (err) {
            console.error("Ошибка хода:", err);
        } finally {
            isRequestInProgress = false;
        }
    }

    async function sendNextRound() {
        if (isRequestInProgress) return;
        isRequestInProgress = true;
        try {
            const res = await fetch("/api/next_round", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();
            if (data.status === "error") {
                showToast(data.message, "error");
            } else {
                roundSummaryModal.classList.remove("show");
                playSound("deal");
                await applyStateWithSteps(data.state || data);
            }
        } catch (err) {
            console.error("Ошибка перехода к следующему раунду:", err);
        } finally {
            isRequestInProgress = false;
        }
    }

    // =========================================================================
    // СТАТИСТИКА ИГРОКА (LOCALSTORAGE + СЕРВЕР)
    // =========================================================================

    const STATS_STORAGE_KEY = "spades_player_stats_v1";

    function loadLocalStats() {
        try {
            const raw = localStorage.getItem(STATS_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    played: Number(parsed.played) || 0,
                    won: Number(parsed.won) || 0,
                    lost: Number(parsed.lost) || 0,
                    lastRecordedGameKey: parsed.lastRecordedGameKey || null,
                };
            }
        } catch (e) {
            // Игнорируем
        }
        return { played: 0, won: 0, lost: 0, lastRecordedGameKey: null };
    }

    function saveLocalStats(statsObj) {
        try {
            localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(statsObj));
        } catch (e) {
            // Игнорируем
        }
    }

    function updateAndRenderStats() {
        if (!gameState) return;
        const local = loadLocalStats();

        if (gameState.phase === "game_over" && gameState.winner_team_id != null) {
            const gameKey = `${gameState.game_id || 1}-${gameState.round_number || 1}-${gameState.winner_team_id}`;
            if (local.lastRecordedGameKey !== gameKey) {
                local.played += 1;
                if (gameState.winner_team_id === 0) {
                    local.won += 1;
                    playSound("victory");
                } else {
                    local.lost += 1;
                }
                local.lastRecordedGameKey = gameKey;
                saveLocalStats(local);
            }
        }

        const srv = gameState.stats || { played: 0, won: 0, lost: 0 };
        const played = Math.max(local.played, srv.played || 0);
        const won = Math.max(local.won, srv.won || 0);
        const lost = Math.max(local.lost, srv.lost || 0);

        if (played !== local.played || won !== local.won || lost !== local.lost) {
            local.played = played;
            local.won = won;
            local.lost = lost;
            saveLocalStats(local);
        }

        if (statPlayedEl) statPlayedEl.textContent = played;
        if (statWonEl) statWonEl.textContent = won;
        if (statLostEl) statLostEl.textContent = lost;

        return { played, won, lost };
    }

    // =========================================================================
    // ПРЕДЫДУЩАЯ ВЗЯТКА
    // =========================================================================

    function renderLastTrick(lastTrick) {
        if (!lastTrickWidget || !lastTrickWinnerEl || !lastTrickCardsEl) return;
        if (!lastTrick || !lastTrick.cards || lastTrick.cards.length === 0) {
            lastTrickWidget.classList.remove("visible");
            return;
        }

        lastTrickWidget.classList.add("visible");
        lastTrickWinnerEl.textContent = `Победитель: ${lastTrick.winner_name || "—"}`;
        lastTrickCardsEl.innerHTML = "";

        lastTrick.cards.forEach((c) => {
            const isRed = c.suit === "♥" || c.suit === "♦";
            const mini = document.createElement("span");
            mini.className = `mini-card ${isRed ? "red" : ""}`;
            mini.textContent = c.display || `${c.symbol}${c.suit}`;
            mini.title = `${c.player_name}: ${c.display}`;
            lastTrickCardsEl.appendChild(mini);
        });
    }

    // =========================================================================
    // ОТРИСОВКА (RENDER)
    // =========================================================================

    function renderGame() {
        if (!gameState) return;

        // 1. Шапка и статистика
        roundNumberEl.textContent = gameState.round_number || 1;
        updateAndRenderStats();

        const bagsLimit = gameState.scoring_rules ? gameState.scoring_rules.bags_limit : 6;
        const penaltyPoints = gameState.scoring_rules ? gameState.scoring_rules.bag_penalty_points : 50;

        // Счёт команд
        if (gameState.teams) {
            const t0 = gameState.teams["0"] || {};
            const t1 = gameState.teams["1"] || {};
            scoreTeam0El.textContent = t0.total_score ?? 0;
            if (contractTeam0El) {
                contractTeam0El.textContent = `Контракт: ${t0.tricks_won ?? 0}/${t0.bid ?? 0}`;
            }
            bagsTeam0El.textContent = `🎒 ${t0.bags ?? 0}/${bagsLimit}`;
            bagsTeam0El.title = `Мешки (${bagsLimit} = −${penaltyPoints})`;

            scoreTeam1El.textContent = t1.total_score ?? 0;
            if (contractTeam1El) {
                contractTeam1El.textContent = `Контракт: ${t1.tricks_won ?? 0}/${t1.bid ?? 0}`;
            }
            bagsTeam1El.textContent = `🎒 ${t1.bags ?? 0}/${bagsLimit}`;
            bagsTeam1El.title = `Мешки (${bagsLimit} = −${penaltyPoints})`;
        }

        // 2. Игроки за столом
        if (gameState.players) {
            gameState.players.forEach((p) => {
                const slot = document.getElementById(`player-${p.id}`);
                if (slot) {
                    if (p.is_current) {
                        slot.classList.add("active-turn");
                    } else {
                        slot.classList.remove("active-turn");
                    }

                    const nameEl = document.getElementById(`name-${p.id}`);
                    if (nameEl && p.name) {
                        nameEl.textContent = p.name;
                    }

                    const bidEl = document.getElementById(`bid-${p.id}`);
                    if (bidEl) {
                        const bidText = p.bid === 0 ? "NIL (0)" : (p.bid != null ? `${p.bid}` : "—");
                        bidEl.textContent = `Ставка: ${bidText}`;
                    }

                    const tricksEl = document.getElementById(`tricks-${p.id}`);
                    if (tricksEl) {
                        tricksEl.textContent = `Взято: ${p.tricks_won}`;
                    }
                }
            });

            // Игрок-человек (Вы)
            const human = gameState.players[0] || {};
            const hBidText = human.bid === 0 ? "NIL (0)" : (human.bid != null ? `${human.bid}` : "—");
            humanBidBadge.textContent = `Ставка: ${hBidText}`;
            humanTricksBadge.textContent = `Взято: ${human.tricks_won || 0}`;

            if (gameState.teams && gameState.teams["0"]) {
                const t0 = gameState.teams["0"];
                humanTeamContract.textContent = `Наш контракт: ${t0.tricks_won}/${t0.bid}`;
            }
            if (gameState.teams && gameState.teams["1"] && oppTeamContract) {
                const t1 = gameState.teams["1"];
                oppTeamContract.textContent = `Контракт соперников: ${t1.tricks_won}/${t1.bid}`;
            }
        }

        // 3. Текущая взятка на столе
        trickTitleEl.textContent = `Взятка ${gameState.current_trick_number || 1}/13`;

        const playedByPlayerId = {};
        if (gameState.current_trick && gameState.current_trick.length > 0) {
            gameState.current_trick.forEach((play) => {
                playedByPlayerId[play.player_id] = play;
            });
        }

        [0, 1, 2, 3].forEach((id) => {
            const spot = spots[id];
            if (!spot) return;
            const container = spot.querySelector(".spot-card-container");
            const play = playedByPlayerId[id];

            if (!play) {
                container.innerHTML = "";
                return;
            }

            const cardKey = `${play.suit}-${play.rank}`;
            let cardEl = container.querySelector(".card.in-trick");
            if (!cardEl || cardEl.dataset.cardKey !== cardKey) {
                container.innerHTML = "";
                cardEl = createCardElement(play, false, false);
                cardEl.classList.add("in-trick", spotDirections[id] || "from-south");
                cardEl.dataset.cardKey = cardKey;
                container.appendChild(cardEl);
            }

            if (gameState.event_type === "trick_complete" && gameState.trick_winner_id === id) {
                cardEl.classList.add("winning-card");
            } else {
                cardEl.classList.remove("winning-card");
            }
        });

        // Сообщение по центру
        showCenterMessage(gameState.message || "");

        // Предыдущая взятка
        renderLastTrick(gameState.last_trick);

        // 4. Рука игрока (веер)
        renderHandFan(gameState.hand || []);

        // 5. Модальные окна
        handleModals();
    }

    // Отрисовка веера карт внизу
    function renderHandFan(hand) {
        const total = hand.length;
        if (total === 0) {
            cardsFanContainer.innerHTML = "";
            return;
        }

        const maxAngle = 34;
        const angleStep = total > 1 ? (maxAngle * 2) / (total - 1) : 0;
        const startAngle = total > 1 ? -maxAngle : 0;

        const maxSpread = Math.min(860, total * 64);
        const cardStep = total > 1 ? maxSpread / (total - 1) : 0;
        const startX = -maxSpread / 2;

        const existingMap = new Map();
        Array.from(cardsFanContainer.children).forEach((el) => {
            if (el.dataset && el.dataset.cardKey) {
                existingMap.set(el.dataset.cardKey, el);
            }
        });

        const currentKeys = new Set();
        let playableCounter = 0;

        hand.forEach((card, idx) => {
            const cardKey = `${card.suit}-${card.rank}`;
            currentKeys.add(cardKey);

            const isHumanTurn = Boolean(gameState.is_human_turn);
            const isPlayable = isHumanTurn && gameState.phase === "playing" && Boolean(card.is_valid);
            const isDisabled = isHumanTurn && gameState.phase === "playing" && !card.is_valid;
            const canHover = isPlayable || (isHumanTurn && gameState.phase === "bidding");

            let cardEl = existingMap.get(cardKey);
            if (!cardEl) {
                cardEl = createCardElement(card, isPlayable, isDisabled);
                cardEl.classList.add("fan-card");
                cardEl.dataset.cardKey = cardKey;
                bindFanCardInteraction(cardEl);
                cardsFanContainer.appendChild(cardEl);
            } else {
                cardEl.classList.toggle("playable", isPlayable);
                cardEl.classList.toggle("disabled", isDisabled);
            }

            cardEl.classList.toggle("can-hover", canHover);
            cardEl._playableCard = isPlayable ? card : null;

            // Горячие клавиши
            let hintEl = cardEl.querySelector(".card-key-hint");
            if (isPlayable && playableCounter < HOTKEYS.length) {
                const hk = HOTKEYS[playableCounter];
                cardEl.dataset.hotkey = hk;
                if (!hintEl) {
                    hintEl = document.createElement("span");
                    hintEl.className = "card-key-hint";
                    cardEl.appendChild(hintEl);
                }
                hintEl.textContent = hk.toUpperCase();
                playableCounter++;
            } else {
                delete cardEl.dataset.hotkey;
                if (hintEl) hintEl.remove();
            }

            const angle = startAngle + idx * angleStep;
            const x = startX + idx * cardStep;
            const norm = (idx - (total - 1) / 2) / (total / 2 || 1);
            const y = Math.pow(norm, 2) * 22;

            cardEl.style.setProperty("--tx", `${x}px`);
            cardEl.style.setProperty("--ty", `${y}px`);
            cardEl.style.setProperty("--rot", `${angle}deg`);
            cardEl.style.zIndex = idx + 1;
        });

        // Удаляем сыгранные карты
        existingMap.forEach((el, key) => {
            if (!currentKeys.has(key)) {
                el.remove();
            }
        });
    }

    function bindFanCardInteraction(cardEl) {
        let isHandling = false;
        const triggerPlay = () => {
            if (isHandling || !cardEl._playableCard || isRequestInProgress) return;
            isHandling = true;
            const cardToPlay = cardEl._playableCard;
            sendPlayCard(cardToPlay).finally(() => {
                isHandling = false;
            });
        };

        cardEl.addEventListener("click", () => {
            triggerPlay();
        });

        cardEl.addEventListener("pointerdown", (e) => {
            if (e.button !== 0 || !cardEl._playableCard) return;
            const startX = e.clientX;
            const startY = e.clientY;

            const cleanup = () => {
                window.removeEventListener("pointerup", onPointerUp);
                window.removeEventListener("pointercancel", cleanup);
            };

            const onPointerUp = (upEvent) => {
                cleanup();
                const dx = upEvent.clientX - startX;
                const dy = upEvent.clientY - startY;
                if (Math.hypot(dx, dy) < 25 || dy < -35) {
                    triggerPlay();
                }
            };

            window.addEventListener("pointerup", onPointerUp);
            window.addEventListener("pointercancel", cleanup);
        });
    }

    // Создание DOM элемента карты
    function createCardElement(card, isPlayable, isDisabled) {
        const el = document.createElement("div");
        const isRed = card.suit === "♥" || card.suit === "♦";
        const isTrump = card.suit === "♠";
        const rankSymbol = String(card.symbol || card.rank);
        const suitSymbol = card.suit;
        const isFace = rankSymbol === "В" || rankSymbol === "Д" || rankSymbol === "К";
        const isAce = rankSymbol === "Т";

        el.className = `card ${isRed ? "red" : "black"} ${isTrump ? "is-trump" : ""} ${isFace ? "is-face" : ""} ${isAce ? "is-ace" : ""}`;
        if (isPlayable) el.classList.add("playable");
        if (isDisabled) el.classList.add("disabled");

        let centerMarkup = `<div class="card-center"><span class="center-pip">${suitSymbol}</span></div>`;
        if (isFace) {
            const courtIcon = rankSymbol === "К" ? "♚" : (rankSymbol === "Д" ? "♛" : "♞");
            centerMarkup = `
                <div class="card-center face-center">
                    <span class="face-crown">${courtIcon}</span>
                    <span class="face-suit">${suitSymbol}</span>
                    <span class="face-watermark">${rankSymbol}</span>
                </div>
            `;
        } else if (isAce) {
            centerMarkup = `
                <div class="card-center ace-center">
                    <span class="ace-medallion">${suitSymbol}</span>
                </div>
            `;
        }

        const isTen = rankSymbol === "10";
        el.innerHTML = `
            <div class="card-inner-frame"></div>
            <div class="card-top">
                <span class="card-rank ${isTen ? "rank-ten" : ""}">${rankSymbol}</span>
                <span class="card-suit">${suitSymbol}</span>
            </div>
            ${centerMarkup}
            <div class="card-bottom">
                <span class="card-rank ${isTen ? "rank-ten" : ""}">${rankSymbol}</span>
                <span class="card-suit">${suitSymbol}</span>
            </div>
        `;

        if (card.name) {
            el.setAttribute("title", card.name);
        }

        return el;
    }

    let toastContainer = null;

    function showToast(message, type = "error") {
        if (!toastContainer) {
            toastContainer = document.createElement("div");
            toastContainer.className = "toast-container";
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement("div");
        toast.className = `toast-notification ${type === "error" ? "toast-error" : ""}`;
        const icon = type === "error" ? "⚠️" : "ℹ️";
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("toast-fadeout");
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3200);
    }

    function showCenterMessage(msg) {
        if (!msg) {
            centerMessageEl.style.display = "none";
        } else {
            centerMessageEl.textContent = msg;
            centerMessageEl.style.display = "block";
        }
    }

    // Обработка фаз модальных окон
    function handleModals() {
        if (!gameState) return;

        // Фаза ставок (Bidding)
        const humanHasBid =
            gameState.bids &&
            (gameState.bids[0] !== undefined && gameState.bids[0] !== null ||
             gameState.bids["0"] !== undefined && gameState.bids["0"] !== null);
        if (gameState.phase === "bidding" && gameState.is_human_turn && !humanHasBid) {
            const partnerBid = gameState.bids ? (gameState.bids[2] ?? gameState.bids["2"]) : null;
            if (partnerBid !== undefined && partnerBid !== null) {
                const partnerBidStr = partnerBid === 0 ? "Nil (0)" : partnerBid;
                bidPartnerInfo.textContent = `Заявка вашего партнёра (Игрок 2): ${partnerBidStr}`;
            } else {
                bidPartnerInfo.textContent = "Ваш партнёр (Игрок 2) ещё не делал заявку в этом раунде.";
            }

            const nilPts = gameState.scoring_rules ? gameState.scoring_rules.nil_points : 50;
            const nilSmall = bidModal.querySelector(".btn-bid.nil-btn small");
            if (nilSmall) {
                nilSmall.textContent = `+${nilPts} / -${nilPts}`;
            }

            bidModal.classList.add("show");
        } else {
            bidModal.classList.remove("show");
        }

        // Фаза окончания раунда (Round End)
        if (gameState.phase === "round_end") {
            renderRoundSummary(gameState.last_round_score);
            roundSummaryModal.classList.add("show");
        } else {
            roundSummaryModal.classList.remove("show");
        }

        // Фаза окончания игры (Game Over)
        if (gameState.phase === "game_over") {
            renderGameOver();
            gameOverModal.classList.add("show");
        } else {
            gameOverModal.classList.remove("show");
        }
    }

    function renderRoundSummary(scoreData) {
        if (!scoreData) {
            roundSummaryContent.innerHTML = "<p>Раунд завершён!</p>";
            return;
        }

        const t0 = scoreData.team_0;
        const t1 = scoreData.team_1;

        roundSummaryContent.innerHTML = `
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>Команда</th>
                        <th>Контракт</th>
                        <th>Взято</th>
                        <th>Мешки</th>
                        <th>За раунд</th>
                        <th>Итоговый счёт</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="my-team-row">
                        <td>${t0.name}</td>
                        <td>${t0.contract_bid}</td>
                        <td>${t0.tricks_won} (${t0.contract_made ? "Выполнен" : "Провал"})</td>
                        <td>+${t0.overtricks} (всего ${t0.bags})</td>
                        <td style="color:${t0.round_net >= 0 ? '#34d399' : '#f87171'}">${t0.round_net > 0 ? "+" : ""}${t0.round_net}</td>
                        <td><strong>${t0.total_score}</strong></td>
                    </tr>
                    <tr>
                        <td>${t1.name}</td>
                        <td>${t1.contract_bid}</td>
                        <td>${t1.tricks_won} (${t1.contract_made ? "Выполнен" : "Провал"})</td>
                        <td>+${t1.overtricks} (всего ${t1.bags})</td>
                        <td style="color:${t1.round_net >= 0 ? '#34d399' : '#f87171'}">${t1.round_net > 0 ? "+" : ""}${t1.round_net}</td>
                        <td><strong>${t1.total_score}</strong></td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    function renderGameOver() {
        const winnerId = gameState.winner_team_id;
        const winnerName = winnerId === 0 ? "Ваша команда" : "Соперники";
        gameoverWinnerTitle.textContent = `Победитель: ${winnerName}!`;

        const t0 = (gameState.teams && gameState.teams["0"]) || {};
        const t1 = (gameState.teams && gameState.teams["1"]) || {};
        const currentStats = updateAndRenderStats() || { played: 0, won: 0, lost: 0 };

        gameoverContent.innerHTML = `
            <div style="text-align: center; margin: 16px 0;">
                <p style="font-size: 16px; margin-bottom: 12px;">Финальный счёт:</p>
                <div style="font-size: 24px; font-weight: bold; margin-bottom: 12px;">
                    <span style="color:#93c5fd;">Ваша команда: ${t0.total_score}</span>
                    <span style="margin: 0 10px;">vs</span>
                    <span style="color:#fca5a5;">Соперники: ${t1.total_score}</span>
                </div>
                <div class="gameover-stats-box">
                    <span>Сыграно: <strong>${currentStats.played}</strong></span>
                    <span>Побед: <strong style="color:#34d399;">${currentStats.won}</strong></span>
                    <span>Поражений: <strong style="color:#f87171;">${currentStats.lost}</strong></span>
                </div>
                <p style="color:#9ca3af; font-size: 13px; margin-top: 10px;">Игра велась до ${gameState.target_score || 250} очков.</p>
            </div>
        `;
    }

    async function renderHistoryModal() {
        if (!historyContent) return;
        historyContent.innerHTML = '<p class="history-empty">Загрузка истории...</p>';

        try {
            const res = await fetch("/api/history");
            const data = await res.json();
            const history = data.history || [];

            if (history.length === 0) {
                historyContent.innerHTML = '<p class="history-empty">В текущей партии пока нет завершённых раундов.</p>';
                return;
            }

            let html = "";
            history.forEach((round) => {
                const s0 = round.score.team_0;
                const s1 = round.score.team_1;
                html += `
                    <div class="history-round-item">
                        <div class="history-round-header">
                            <span>Раунд ${round.round_number} (Сдающий: ${round.dealer_name})</span>
                            <span>${s0.name} (${s0.round_net > 0 ? "+" : ""}${s0.round_net}) vs ${s1.name} (${s1.round_net > 0 ? "+" : ""}${s1.round_net})</span>
                        </div>
                        <div style="font-size: 12px; color: #cbd5e1; margin-bottom: 6px;">
                            Заявки: ${round.dealer_name}: ${round.bids[round.dealer_id] ?? '—'}
                        </div>
                        <div class="history-tricks-grid">
                `;

                if (Array.isArray(round.tricks)) {
                    round.tricks.forEach((tr) => {
                        html += `
                            <div class="history-trick-chip" title="Взятка ${tr.trick_number}: ${tr.winner_name} победил картой ${tr.winning_card}">
                                <span>#${tr.trick_number}:</span>
                                <strong>${tr.winner_name}</strong>
                                <span>(${tr.winning_card})</span>
                            </div>
                        `;
                    });
                }

                html += `
                        </div>
                    </div>
                `;
            });

            historyContent.innerHTML = html;
        } catch (e) {
            historyContent.innerHTML = '<p class="history-empty">Не удалось загрузить историю партии.</p>';
        }
    }

    function closeAllAuxModals() {
        if (newGameModal) newGameModal.classList.remove("show");
        if (rulesModal) rulesModal.classList.remove("show");
        if (historyModal) historyModal.classList.remove("show");
    }

    function closeAllModals() {
        bidModal.classList.remove("show");
        roundSummaryModal.classList.remove("show");
        gameOverModal.classList.remove("show");
        closeAllAuxModals();
    }

    // =========================================================================
    // ОБРАБОТЧИКИ СОБЫТИЙ (EVENT LISTENERS)
    // =========================================================================

    // Кнопка звука
    if (btnSoundToggle) {
        updateSoundIcon();
        btnSoundToggle.addEventListener("click", () => {
            soundEnabled = !soundEnabled;
            localStorage.setItem("spades_sound_enabled", soundEnabled ? "true" : "false");
            updateSoundIcon();
            if (soundEnabled) playSound("deal");
        });
    }

    // Кнопка правил
    if (btnRules && rulesModal) {
        btnRules.addEventListener("click", () => {
            closeAllAuxModals();
            rulesModal.classList.add("show");
        });
    }

    if (btnCloseRules) {
        btnCloseRules.addEventListener("click", () => rulesModal.classList.remove("show"));
    }
    if (btnOkRules) {
        btnOkRules.addEventListener("click", () => rulesModal.classList.remove("show"));
    }

    // Кнопка истории
    if (btnHistory && historyModal) {
        btnHistory.addEventListener("click", () => {
            closeAllAuxModals();
            renderHistoryModal();
            historyModal.classList.add("show");
        });
    }

    if (btnCloseHistory) {
        btnCloseHistory.addEventListener("click", () => historyModal.classList.remove("show"));
    }
    if (btnCloseHistoryFooter) {
        btnCloseHistoryFooter.addEventListener("click", () => historyModal.classList.remove("show"));
    }

    // Кнопка "Новая игра" в шапке открывает модалку настроек
    if (btnNewGame && newGameModal) {
        btnNewGame.addEventListener("click", () => {
            closeAllAuxModals();
            newGameModal.classList.add("show");
        });
    }

    if (btnCloseNewGame) {
        btnCloseNewGame.addEventListener("click", () => newGameModal.classList.remove("show"));
    }
    if (btnCancelNewGame) {
        btnCancelNewGame.addEventListener("click", () => newGameModal.classList.remove("show"));
    }

    // Переключение радиокнопок режима игры
    if (radioStandard && radioShort) {
        radioStandard.addEventListener("click", () => {
            radioStandard.classList.add("active");
            radioShort.classList.remove("active");
            radioStandard.querySelector("input").checked = true;
        });

        radioShort.addEventListener("click", () => {
            radioShort.classList.add("active");
            radioStandard.classList.remove("active");
            radioShort.querySelector("input").checked = true;
        });
    }

    // Скорость анимации
    if (selectAnimSpeed) {
        selectAnimSpeed.value = currentSpeed;
        selectAnimSpeed.addEventListener("change", (e) => {
            currentSpeed = e.target.value;
            localStorage.setItem("spades_anim_speed", currentSpeed);
        });
    }

    // Подтверждение запуска новой игры
    if (btnConfirmNewGame) {
        btnConfirmNewGame.addEventListener("click", () => {
            const name = (inputPlayerName && inputPlayerName.value.trim()) || "Игрок 1 (Вы)";
            const mode = (radioStandard && radioStandard.querySelector("input").checked) ? "standard" : "short";
            const target = mode === "standard" ? 500 : 250;
            sendNewGame({
                player_name: name,
                scoring_mode: mode,
                target_score: target,
            });
        });
    }

    // Кнопки ставок в модалке
    document.querySelectorAll(".btn-bid").forEach((btn) => {
        btn.addEventListener("click", () => {
            const val = parseInt(btn.getAttribute("data-bid"), 10);
            sendBid(val);
        });
    });

    // Следующий раунд
    if (btnNextRound) {
        btnNextRound.addEventListener("click", () => {
            sendNextRound();
        });
    }

    // Сыграть снова после окончания игры
    if (btnRestartGame) {
        btnRestartGame.addEventListener("click", () => {
            if (newGameModal) {
                gameOverModal.classList.remove("show");
                newGameModal.classList.add("show");
            } else {
                sendNewGame();
            }
        });
    }

    // Закрытие модальных окон при клике на полупрозрачный фон
    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) {
                if (backdrop.id === "rules-modal" || backdrop.id === "history-modal" || backdrop.id === "new-game-modal") {
                    backdrop.classList.remove("show");
                }
            }
        });
    });

    // Горячие клавиши
    window.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") {
            return;
        }

        if (e.code === "Space") {
            if (roundSummaryModal && roundSummaryModal.classList.contains("show")) {
                e.preventDefault();
                sendNextRound();
                return;
            }
            if (gameOverModal && gameOverModal.classList.contains("show")) {
                e.preventDefault();
                if (newGameModal) {
                    gameOverModal.classList.remove("show");
                    newGameModal.classList.add("show");
                } else {
                    sendNewGame();
                }
                return;
            }
        }

        if (e.key === "Escape") {
            closeAllAuxModals();
            return;
        }

        const key = e.key.toLowerCase();
        const matchedCard = document.querySelector(`.card.fan-card.playable[data-hotkey="${key}"]`);
        if (matchedCard && matchedCard._playableCard) {
            matchedCard.click();
        }
    });

    // Запуск при старте
    fetchState();
});
