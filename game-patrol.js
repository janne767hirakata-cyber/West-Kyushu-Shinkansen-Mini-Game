/* ===================================================
   game-patrol.js - 線路パトロール
   線路上の異常を見つけてタップで報告するゲーム
   =================================================== */
const PatrolGame = (() => {
    let canvas, ctx;
    let animId = null;
    let round = 1;
    let score = 0;
    let timer = 60;
    let timerInterval = null;
    let gameState = 'ready';
    let scrollOffset = 0;
    let anomalies = [];
    let foundIds = [];
    let penalties = 0;
    let messageTimer = null;
    let feedbackEffects = [];

    /* Anomaly types */
    const anomalyTypes = [
        { type: 'crack', label: 'レールのひび割れ', icon: '⚡', points: 100, color: '#FF4444' },
        { type: 'bolt', label: 'ボルトのゆるみ', icon: '🔩', points: 80, color: '#FFAA00' },
        { type: 'debris', label: '異物', icon: '🪨', points: 60, color: '#888' },
        { type: 'water', label: '水たまり（漏水）', icon: '💧', points: 90, color: '#4488FF' },
        { type: 'wire', label: 'ケーブル損傷', icon: '⚡', points: 120, color: '#FF8844' },
        { type: 'light', label: '信号灯切れ', icon: '💡', points: 110, color: '#FFDD00' },
        { type: 'rust', label: 'サビ', icon: '🟤', points: 70, color: '#8B4513' }
    ];

    function init() {
        canvas = document.getElementById('patrol-canvas');
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('touchstart', handleTouch, { passive: false });
        round = 1;
        score = 0;
        startRound();
    }

    function destroy() {
        if (animId) cancelAnimationFrame(animId);
        animId = null;
        if (timerInterval) clearInterval(timerInterval);
        canvas.removeEventListener('click', handleClick);
        canvas.removeEventListener('touchstart', handleTouch);
        window.removeEventListener('resize', resizeCanvas);
        if (messageTimer) clearTimeout(messageTimer);
        gameState = 'ready';
    }

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const hud = canvas.parentElement.querySelector('.game-hud');
        const hudH = hud ? hud.offsetHeight : 52;
        canvas.width = rect.width;
        canvas.height = rect.height - hudH;
    }

    function startRound() {
        timer = 60;
        foundIds = [];
        penalties = 0;
        feedbackEffects = [];
        scrollOffset = 0;
        gameState = 'playing';

        document.getElementById('patrol-round').textContent = `ラウンド ${round} / 3`;
        document.getElementById('patrol-score').textContent = `${score}点`;
        updateTimer();

        // Generate anomalies for this round
        generateAnomalies();

        // Start timer
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timer--;
            updateTimer();
            if (timer <= 0) {
                endRound();
            }
        }, 1000);

        showMessage(`ラウンド ${round}\n異常をタップして報告しよう！`, null);

        if (animId) cancelAnimationFrame(animId);
        gameLoop();
    }

    function generateAnomalies() {
        anomalies = [];
        const count = 5 + round * 2; // 7, 9, 11
        const w = canvas.width;
        const totalLength = canvas.height * 4; // 4 screens of scrolling

        for (let i = 0; i < count; i++) {
            const aType = anomalyTypes[Math.floor(Math.random() * anomalyTypes.length)];
            anomalies.push({
                id: i,
                type: aType.type,
                label: aType.label,
                icon: aType.icon,
                points: aType.points,
                color: aType.color,
                x: 0.2 + Math.random() * 0.6,
                y: 0.3 + (i / count) * 3.2, // spread over scroll area
                size: 0.04 + Math.random() * 0.02,
                found: false,
                pulse: Math.random() * Math.PI * 2
            });
        }
    }

    function endRound() {
        if (timerInterval) clearInterval(timerInterval);
        gameState = 'ended';

        if (round < 3) {
            showMessage(`ラウンド ${round} 終了！\n発見: ${foundIds.length} / ${anomalies.length}`, () => {
                round++;
                startRound();
            });
        } else {
            const maxScore = anomalies.length * 100 * 3;
            Effects.soundClear();
            setTimeout(() => App.showClear('patrol', score, maxScore), 1500);
        }
    }

    function updateTimer() {
        const timerEl = document.getElementById('patrol-timer');
        timerEl.textContent = timer;
        timerEl.className = 'hud-timer';
        if (timer <= 10) timerEl.classList.add('danger');
        else if (timer <= 20) timerEl.classList.add('warning');
    }

    /* --- Drawing --- */
    function draw() {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Auto-scroll
        if (gameState === 'playing') {
            scrollOffset += 0.5;
        }

        // Background - sky and ground
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.3);
        skyGrad.addColorStop(0, '#1a3a5c');
        skyGrad.addColorStop(1, '#2a5a3c');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h * 0.3);

        // Ground/ballast
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, h * 0.3, w, h * 0.7);

        // Ballast texture
        ctx.fillStyle = '#3a3a3a';
        for (let x = 0; x < w; x += 8) {
            for (let y = h * 0.3; y < h; y += 8) {
                if (Math.random() > 0.7) {
                    ctx.fillRect(x, y - (scrollOffset % 8), 4, 4);
                }
            }
        }

        // Draw rails
        drawRails(w, h);

        // Draw anomalies
        drawAnomalies(w, h);

        // Draw feedback effects
        drawFeedback(w, h);

        // Overlay gradient (depth effect)
        const fogGrad = ctx.createLinearGradient(0, 0, 0, h * 0.35);
        fogGrad.addColorStop(0, 'rgba(10,22,40,0.5)');
        fogGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, 0, w, h * 0.35);

        // Score popup for found anomalies
        document.getElementById('patrol-score').textContent = `${score}点`;
    }

    function drawRails(w, h) {
        const railWidth = w * 0.4;
        const leftRail = (w - railWidth) / 2;
        const rightRail = leftRail + railWidth;
        const sleeperSpacing = 30;

        // Sleepers
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 6;
        for (let y = h * 0.3; y < h; y += sleeperSpacing) {
            const adjustedY = y - (scrollOffset % sleeperSpacing);
            ctx.beginPath();
            ctx.moveTo(leftRail - 15, adjustedY);
            ctx.lineTo(rightRail + 15, adjustedY);
            ctx.stroke();
        }

        // Rails
        [leftRail, rightRail].forEach(rx => {
            // Rail shadow
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(rx + 2, h * 0.3);
            ctx.lineTo(rx + 2, h);
            ctx.stroke();

            // Rail
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(rx, h * 0.3);
            ctx.lineTo(rx, h);
            ctx.stroke();

            // Rail highlight
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(rx - 2, h * 0.3);
            ctx.lineTo(rx - 2, h);
            ctx.stroke();
        });
    }

    function drawAnomalies(w, h) {
        anomalies.forEach(a => {
            if (a.found) return;

            // Calculate position with scroll
            const drawY = a.y * h - scrollOffset;

            // Only draw if visible
            if (drawY < -50 || drawY > h + 50) return;

            const drawX = a.x * w;
            const size = a.size * w;

            // Subtle pulsing glow to make it findable
            a.pulse += 0.03;
            const pulseAlpha = 0.15 + Math.sin(a.pulse) * 0.1;

            // Anomaly indicator (subtle)
            ctx.save();
            ctx.beginPath();
            ctx.arc(drawX, drawY, size + 5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,100,100,${pulseAlpha})`;
            ctx.fill();

            // Anomaly visual
            ctx.font = `${size * 1.5}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(a.icon, drawX, drawY);
            ctx.restore();
        });
    }

    function drawFeedback(w, h) {
        feedbackEffects = feedbackEffects.filter(f => {
            f.life -= 0.015;
            if (f.life <= 0) return false;

            ctx.save();
            ctx.globalAlpha = f.life;
            ctx.font = `900 ${f.size}px "M PLUS Rounded 1c"`;
            ctx.textAlign = 'center';
            ctx.fillStyle = f.color;
            ctx.fillText(f.text, f.x, f.y - (1 - f.life) * 60);
            ctx.restore();
            return true;
        });
    }

    /* --- Input --- */
    function handleClick(e) {
        if (gameState !== 'playing') return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        checkTap(x, y);
    }

    function handleTouch(e) {
        e.preventDefault();
        if (gameState !== 'playing') return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        checkTap(x, y);
    }

    function checkTap(tapX, tapY) {
        const w = canvas.width;
        const h = canvas.height;
        let found = false;

        anomalies.forEach(a => {
            if (a.found) return;

            const drawY = a.y * h - scrollOffset;
            const drawX = a.x * w;
            const hitRadius = a.size * w + 20;

            const dx = tapX - drawX;
            const dy = tapY - drawY;
            if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
                // Found!
                a.found = true;
                foundIds.push(a.id);
                score += a.points;
                found = true;
                Effects.soundCorrect();
                Effects.addBurst(tapX, tapY, 15, [a.color, '#FFD700']);

                feedbackEffects.push({
                    x: tapX, y: tapY,
                    text: `+${a.points} ${a.label}`,
                    color: '#00E676',
                    size: Math.min(18, w * 0.022),
                    life: 1
                });
            }
        });

        if (!found) {
            penalties++;
            if (penalties <= 3) {
                score = Math.max(0, score - 20);
                Effects.soundWrong();
                feedbackEffects.push({
                    x: tapX, y: tapY,
                    text: '-20 異常なし',
                    color: '#FF4444',
                    size: Math.min(16, w * 0.02),
                    life: 1
                });
            }
        }
    }

    function showMessage(text, callback) {
        const msgEl = document.getElementById('patrol-message');
        msgEl.innerHTML = text.replace(/\n/g, '<br>');
        msgEl.classList.remove('hidden');
        if (messageTimer) clearTimeout(messageTimer);
        messageTimer = setTimeout(() => {
            msgEl.classList.add('hidden');
            if (callback) callback();
        }, 2500);
    }

    function gameLoop() {
        draw();
        animId = requestAnimationFrame(gameLoop);
    }

    return { init, destroy };
})();
