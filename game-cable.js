/* ===================================================
   game-cable.js - ケーブル接続パズル
   信号通信ケーブルをドラッグ＆ドロップで正しく接続
   =================================================== */
const CableGame = (() => {
    let canvas, ctx;
    let animId = null;
    let level = 1;
    let connectors = [];
    let cables = [];
    let dragging = null;
    let dragPos = { x: 0, y: 0 };
    let completedCount = 0;
    let messageTimer = null;
    let sparkles = [];

    /* Cable colors */
    const cableColors = [
        { main: '#FF4444', glow: 'rgba(255,68,68,0.4)', name: '赤' },
        { main: '#4488FF', glow: 'rgba(68,136,255,0.4)', name: '青' },
        { main: '#44DD44', glow: 'rgba(68,221,68,0.4)', name: '緑' },
        { main: '#FFAA00', glow: 'rgba(255,170,0,0.4)', name: '黄' },
        { main: '#DD44FF', glow: 'rgba(221,68,255,0.4)', name: '紫' },
        { main: '#00DDDD', glow: 'rgba(0,221,221,0.4)', name: '水色' },
        { main: '#FF8844', glow: 'rgba(255,136,68,0.4)', name: '橙' }
    ];

    /* Equipment icons */
    const equipmentLeft = [
        { label: '制御盤', icon: '🖥️' },
        { label: '継電器', icon: '⚡' },
        { label: '電源装置', icon: '🔋' },
        { label: 'ATC装置', icon: '📡' },
        { label: '監視装置', icon: '👁️' },
        { label: '通信装置', icon: '📞' },
        { label: '記録装置', icon: '💾' }
    ];

    const equipmentRight = [
        { label: '信号機', icon: '🚦' },
        { label: '転てつ機', icon: '🔀' },
        { label: '軌道回路', icon: '🛤️' },
        { label: '速度発電機', icon: '⚙️' },
        { label: 'カメラ', icon: '📷' },
        { label: 'アンテナ', icon: '📶' },
        { label: 'センサー', icon: '🌡️' }
    ];

    /* Level definitions */
    const levelDefs = [
        { cableCount: 3, showHints: true },
        { cableCount: 5, showHints: true },
        { cableCount: 7, showHints: false }
    ];

    function init() {
        canvas = document.getElementById('cable-canvas');
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        canvas.addEventListener('mousedown', onPointerDown);
        canvas.addEventListener('mousemove', onPointerMove);
        canvas.addEventListener('mouseup', onPointerUp);
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd, { passive: false });
        level = 1;
        loadLevel(level);
    }

    function destroy() {
        if (animId) cancelAnimationFrame(animId);
        animId = null;
        canvas.removeEventListener('mousedown', onPointerDown);
        canvas.removeEventListener('mousemove', onPointerMove);
        canvas.removeEventListener('mouseup', onPointerUp);
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('resize', resizeCanvas);
        if (messageTimer) clearTimeout(messageTimer);
    }

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const hud = canvas.parentElement.querySelector('.game-hud');
        const hudH = hud ? hud.offsetHeight : 52;
        canvas.width = rect.width;
        canvas.height = rect.height - hudH;
    }

    function loadLevel(lvl) {
        const def = levelDefs[Math.min(lvl - 1, levelDefs.length - 1)];
        completedCount = 0;
        sparkles = [];
        dragging = null;

        document.getElementById('cable-level').textContent = `レベル ${lvl}`;
        document.getElementById('cable-status').textContent = `0 / ${def.cableCount}`;

        // Create connectors
        connectors = [];
        cables = [];

        const margin = 0.12;
        const spacing = (1 - margin * 2) / (def.cableCount + 1);

        for (let i = 0; i < def.cableCount; i++) {
            const y = margin + spacing * (i + 1);
            const color = cableColors[i % cableColors.length];
            const leftEquip = equipmentLeft[i % equipmentLeft.length];
            const rightEquip = equipmentRight[i % equipmentRight.length];

            // Left connector (source)
            connectors.push({
                id: `L${i}`,
                side: 'left',
                x: 0.15,
                y: y,
                pairId: `R${i}`,
                color: color,
                equipment: leftEquip,
                connected: false
            });

            // Right connector (destination) - shuffled position
            connectors.push({
                id: `R${i}`,
                side: 'right',
                x: 0.85,
                y: y, // will be shuffled
                pairId: `L${i}`,
                color: color,
                equipment: rightEquip,
                connected: false,
                showHint: def.showHints
            });
        }

        // Shuffle right connector positions
        const rightConnectors = connectors.filter(c => c.side === 'right');
        const rightYs = rightConnectors.map(c => c.y);
        shuffleArray(rightYs);
        rightConnectors.forEach((c, i) => {
            c.y = rightYs[i];
        });

        showMessage(`レベル ${lvl}\nケーブルをつないで\n回路を完成させよう！`, null);

        if (animId) cancelAnimationFrame(animId);
        gameLoop();
    }

    /* --- Drawing --- */
    function draw() {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Background
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#0A1628');
        bg.addColorStop(1, '#0F2341');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Equipment panels
        drawPanel(0.02, 0.05, 0.22, 0.9, '制御室側', w, h);
        drawPanel(0.76, 0.05, 0.22, 0.9, '設備側', w, h);

        // Connected cables
        cables.forEach(cable => {
            drawCable(cable.from, cable.to, cable.color, true, w, h);
        });

        // Dragging cable
        if (dragging) {
            const fromConn = connectors.find(c => c.id === dragging);
            if (fromConn) {
                drawCable(
                    { x: fromConn.x, y: fromConn.y },
                    { x: dragPos.x / w, y: dragPos.y / h },
                    fromConn.color,
                    false, w, h
                );
            }
        }

        // Connectors
        connectors.forEach(c => {
            drawConnector(c, w, h);
        });

        // Sparkles
        drawSparkles(w, h);
    }

    function drawPanel(px, py, pw, ph, label, w, h) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(px * w, py * h, pw * w, ph * h, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `700 ${Math.min(14, w * 0.015)}px "M PLUS Rounded 1c"`;
        ctx.textAlign = 'center';
        ctx.fillText(label, (px + pw / 2) * w, (py + 0.03) * h);
    }

    function drawConnector(c, w, h) {
        const x = c.x * w;
        const y = c.y * h;
        const r = Math.min(22, w * 0.025);

        // Glow
        if (!c.connected) {
            ctx.beginPath();
            ctx.arc(x, y, r + 8, 0, Math.PI * 2);
            ctx.fillStyle = c.color.glow;
            ctx.fill();
        }

        // Port circle
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = c.connected ? c.color.main : '#1a1a2e';
        ctx.strokeStyle = c.connected ? '#fff' : c.color.main;
        ctx.lineWidth = 3;
        ctx.fill();
        ctx.stroke();

        // Inner dot
        if (!c.connected) {
            ctx.beginPath();
            ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = c.color.main;
            ctx.fill();
        }

        // Color hint label (for level 1-2)
        if (c.showHint && !c.connected) {
            ctx.fillStyle = c.color.main;
            ctx.font = `700 ${Math.min(11, w * 0.012)}px "M PLUS Rounded 1c"`;
            ctx.textAlign = 'center';
            ctx.fillText(c.color.name, x, y + r + 16);
        }

        // Equipment icon and label
        const iconX = c.side === 'left' ? x - r - 30 : x + r + 30;
        ctx.font = `${Math.min(28, w * 0.03)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(c.equipment.icon, iconX, y + 4);

        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = `700 ${Math.min(10, w * 0.011)}px "M PLUS Rounded 1c"`;
        ctx.fillText(c.equipment.label, iconX, y + 20);
    }

    function drawCable(from, to, color, connected, w, h) {
        const x1 = from.x * w;
        const y1 = from.y * h;
        const x2 = to.x * w;
        const y2 = to.y * h;

        // Cable glow
        ctx.strokeStyle = color.glow;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const cpx1 = x1 + (x2 - x1) * 0.3;
        const cpx2 = x1 + (x2 - x1) * 0.7;
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(cpx1, y1, cpx2, y2, x2, y2);
        ctx.stroke();

        // Cable line
        ctx.strokeStyle = color.main;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(cpx1, y1, cpx2, y2, x2, y2);
        ctx.stroke();

        // Electricity flow animation for connected cables
        if (connected) {
            const time = Date.now() / 1000;
            for (let i = 0; i < 5; i++) {
                const t = ((time * 0.5 + i * 0.2) % 1);
                const px = bezierPoint(x1, cpx1, cpx2, x2, t);
                const py = bezierPoint(y1, y1, y2, y2, t);
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.globalAlpha = 0.8;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
    }

    function bezierPoint(p0, p1, p2, p3, t) {
        const u = 1 - t;
        return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
    }

    function drawSparkles(w, h) {
        sparkles = sparkles.filter(s => {
            s.life -= 0.02;
            s.x += s.dx;
            s.y += s.dy;
            s.dy += 0.02;
            if (s.life <= 0) return false;

            ctx.beginPath();
            ctx.arc(s.x * w, s.y * h, s.r * s.life, 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            ctx.globalAlpha = s.life;
            ctx.fill();
            ctx.globalAlpha = 1;
            return true;
        });
    }

    /* --- Input Handling --- */
    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    function onPointerDown(e) {
        const pos = getPos(e);
        tryGrab(pos);
    }

    function onPointerMove(e) {
        if (dragging) {
            dragPos = getPos(e);
        }
    }

    function onPointerUp(e) {
        if (dragging) {
            const pos = getPos(e);
            tryConnect(pos);
            dragging = null;
        }
    }

    function onTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const pos = { x: touch.clientX - canvas.getBoundingClientRect().left, y: touch.clientY - canvas.getBoundingClientRect().top };
        tryGrab(pos);
        dragPos = pos;
    }

    function onTouchMove(e) {
        e.preventDefault();
        if (dragging) {
            const touch = e.touches[0];
            dragPos = { x: touch.clientX - canvas.getBoundingClientRect().left, y: touch.clientY - canvas.getBoundingClientRect().top };
        }
    }

    function onTouchEnd(e) {
        e.preventDefault();
        if (dragging) {
            tryConnect(dragPos);
            dragging = null;
        }
    }

    function tryGrab(pos) {
        const w = canvas.width;
        const h = canvas.height;
        const r = Math.min(30, w * 0.035);

        for (const c of connectors) {
            if (c.connected) continue;
            const dx = pos.x - c.x * w;
            const dy = pos.y - c.y * h;
            if (Math.sqrt(dx * dx + dy * dy) < r) {
                dragging = c.id;
                dragPos = pos;
                Effects.soundClick();
                break;
            }
        }
    }

    function tryConnect(pos) {
        const w = canvas.width;
        const h = canvas.height;
        const r = Math.min(35, w * 0.04);
        const fromConn = connectors.find(c => c.id === dragging);
        if (!fromConn) return;

        for (const c of connectors) {
            if (c.connected || c.side === fromConn.side) continue;
            const dx = pos.x - c.x * w;
            const dy = pos.y - c.y * h;
            if (Math.sqrt(dx * dx + dy * dy) < r) {
                // Check if correct pair
                if (c.id === fromConn.pairId) {
                    // Correct!
                    fromConn.connected = true;
                    c.connected = true;
                    cables.push({
                        from: { x: fromConn.x, y: fromConn.y },
                        to: { x: c.x, y: c.y },
                        color: fromConn.color
                    });
                    completedCount++;
                    Effects.soundCorrect();

                    // Sparkles at connection point
                    for (let i = 0; i < 15; i++) {
                        sparkles.push({
                            x: c.x, y: c.y,
                            dx: (Math.random() - 0.5) * 0.02,
                            dy: (Math.random() - 0.5) * 0.02,
                            r: Math.random() * 4 + 1,
                            life: 1,
                            color: fromConn.color.main
                        });
                    }

                    const def = levelDefs[Math.min(level - 1, levelDefs.length - 1)];
                    document.getElementById('cable-status').textContent = `${completedCount} / ${def.cableCount}`;

                    // Check level complete
                    if (completedCount >= def.cableCount) {
                        if (level < 3) {
                            showMessage('✅ 回路完成！\n次のレベルへ！', () => {
                                level++;
                                loadLevel(level);
                            });
                            Effects.soundLevelUp();
                        } else {
                            Effects.soundClear();
                            setTimeout(() => App.showClear('cable', 3, 3), 1500);
                        }
                    }
                } else {
                    // Wrong pair
                    Effects.soundWrong();
                }
                return;
            }
        }
    }

    function showMessage(text, callback) {
        const msgEl = document.getElementById('cable-message');
        msgEl.innerHTML = text.replace(/\n/g, '<br>');
        msgEl.classList.remove('hidden');
        if (messageTimer) clearTimeout(messageTimer);
        messageTimer = setTimeout(() => {
            msgEl.classList.add('hidden');
            if (callback) callback();
        }, 2000);
    }

    function gameLoop() {
        draw();
        animId = requestAnimationFrame(gameLoop);
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    return { init, destroy };
})();
