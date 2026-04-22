/* ===================================================
   game-signal.js - 信号パターン記憶ゲーム
   信号機の点灯パターンを記憶して再現する
   Simon Says 風ゲーム
   =================================================== */
const SignalGame = (() => {
    let level = 1;
    let score = 0;
    let pattern = [];
    let playerPattern = [];
    let isShowingPattern = false;
    let isPlayerTurn = false;
    let signalUnits = [];
    let showTimeout = null;
    let maxLevel = 8;

    /* Signal definitions */
    const signalDefs = [
        { id: 'red1', colors: ['red', 'yellow', 'green'], label: '場内信号' },
        { id: 'red2', colors: ['red', 'yellow', 'green'], label: '出発信号' },
        { id: 'red3', colors: ['red', 'yellow', 'green'], label: '閉塞信号' },
        { id: 'red4', colors: ['red', 'yellow', 'green'], label: '中継信号' }
    ];

    function init() {
        level = 1;
        score = 0;
        pattern = [];
        buildSignalUI();
        updateHUD();
        nextLevel();
    }

    function destroy() {
        if (showTimeout) clearTimeout(showTimeout);
        isShowingPattern = false;
        isPlayerTurn = false;
    }

    function buildSignalUI() {
        const container = document.getElementById('signal-lights');
        container.innerHTML = '';
        signalUnits = [];

        signalDefs.forEach((def, i) => {
            const unit = document.createElement('div');
            unit.className = 'signal-unit';
            unit.dataset.index = i;

            const post = document.createElement('div');
            post.className = 'signal-post';

            def.colors.forEach(color => {
                const light = document.createElement('div');
                light.className = `signal-light ${color}`;
                light.dataset.color = color;
                light.dataset.signal = i;
                post.appendChild(light);
            });

            const label = document.createElement('div');
            label.className = 'signal-label';
            label.textContent = def.label;

            unit.appendChild(post);
            unit.appendChild(label);
            unit.onclick = () => onSignalClick(i);
            container.appendChild(unit);

            signalUnits.push({
                element: unit,
                post: post,
                lights: post.querySelectorAll('.signal-light'),
                def: def
            });
        });
    }

    function updateHUD() {
        document.getElementById('signal-level').textContent = `レベル ${level}`;
        document.getElementById('signal-score').textContent = `${score}点`;
    }

    function nextLevel() {
        const patternLen = level + 2; // level 1 = 3 signals, level 2 = 4, etc.
        pattern = [];

        // Generate random pattern
        for (let i = 0; i < patternLen; i++) {
            pattern.push(Math.floor(Math.random() * signalDefs.length));
        }

        playerPattern = [];
        isPlayerTurn = false;

        setInstruction('パターンをおぼえてね！');
        setFeedback('');

        // Show pattern after short delay
        setTimeout(() => showPattern(), 1000);
    }

    function showPattern() {
        isShowingPattern = true;
        let idx = 0;

        function showNext() {
            // Turn off all signals first
            clearAllLights();

            if (idx >= pattern.length) {
                isShowingPattern = false;
                isPlayerTurn = true;
                setInstruction('同じ順番でタップしよう！');
                return;
            }

            const signalIdx = pattern[idx];
            // Light up a random color from that signal (cycle through)
            const colorIdx = idx % 3;
            const colors = ['green', 'yellow', 'red'];
            const lightColor = colors[colorIdx];

            lightUpSignal(signalIdx, lightColor);
            Effects.soundSignal(lightColor);

            idx++;
            showTimeout = setTimeout(() => {
                clearAllLights();
                showTimeout = setTimeout(showNext, 300);
            }, 600);
        }

        showNext();
    }

    function lightUpSignal(signalIdx, color) {
        const unit = signalUnits[signalIdx];
        if (!unit) return;

        unit.lights.forEach(light => {
            if (light.dataset.color === color) {
                light.classList.add('lit');
            }
        });

        // Scale effect
        unit.element.style.transform = 'scale(1.1)';
        setTimeout(() => {
            unit.element.style.transform = '';
        }, 300);
    }

    function clearAllLights() {
        signalUnits.forEach(unit => {
            unit.lights.forEach(light => {
                light.classList.remove('lit');
            });
        });
    }

    function onSignalClick(signalIdx) {
        if (!isPlayerTurn || isShowingPattern) return;

        const expected = pattern[playerPattern.length];
        playerPattern.push(signalIdx);

        const colorIdx = (playerPattern.length - 1) % 3;
        const colors = ['green', 'yellow', 'red'];
        const lightColor = colors[colorIdx];

        lightUpSignal(signalIdx, lightColor);
        Effects.soundSignal(lightColor);

        setTimeout(() => clearAllLights(), 400);

        if (signalIdx === expected) {
            // Correct!
            if (playerPattern.length === pattern.length) {
                // Level complete!
                isPlayerTurn = false;
                score += level * 100;
                updateHUD();
                setFeedback('⭕ パーフェクト！', 'correct');
                Effects.soundCorrect();
                Effects.addBurst(
                    window.innerWidth / 2,
                    window.innerHeight / 2,
                    25
                );

                if (level >= maxLevel) {
                    // Game complete
                    setTimeout(() => {
                        App.showClear('signal', score, maxLevel * 100 * (maxLevel + 1) / 2);
                    }, 1500);
                } else {
                    level++;
                    updateHUD();
                    setTimeout(() => {
                        Effects.soundLevelUp();
                        nextLevel();
                    }, 1500);
                }
            }
            // else, wait for more input
        } else {
            // Wrong!
            isPlayerTurn = false;
            setFeedback('❌ ざんねん！', 'wrong');
            Effects.soundWrong();

            // Show correct pattern briefly
            setTimeout(() => {
                // If made some progress, still give partial score
                if (level > 1) {
                    score += Math.floor(level * 50 * (playerPattern.length - 1) / pattern.length);
                }
                // Game over - show results
                App.showClear('signal', score, maxLevel * 100);
            }, 1500);
        }
    }

    function setInstruction(text) {
        document.getElementById('signal-instruction').textContent = text;
    }

    function setFeedback(text, type) {
        const el = document.getElementById('signal-feedback');
        el.textContent = text;
        el.className = 'signal-feedback';
        if (text) {
            el.classList.remove('hidden');
            if (type) el.classList.add(type);
        } else {
            el.classList.add('hidden');
        }
    }

    return { init, destroy };
})();
