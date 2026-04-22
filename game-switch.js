/* ===================================================
   game-switch.js - 転てつ機チャレンジ
   線路の転てつ機（ポイント）を切り替えて
   新幹線を正しい目的地に導くゲーム
   
   列車はウェイポイントベースのパスに沿い、
   転てつ機の方向に従って正確に分岐する
   =================================================== */
const SwitchGame = (() => {
    let canvas, ctx;
    let animId = null;
    let level = 1;
    let trains = [];
    let switches = [];
    let gameState = 'ready'; // ready, playing, won, lost
    let messageTimer = null;
    let currentLevelDef = null;

    /* --- Train types --- */
    const trainTypes = [
        { name: 'かもめ', bodyColor: '#FFFFFF', accent: '#E8344E' },
        { name: 'つばめ', bodyColor: '#444444', accent: '#FFD700' },
        { name: 'さくら', bodyColor: '#FFB7C5', accent: '#E8344E' }
    ];

    /* =====================================================
       Level definitions using a TREE structure.
       Each node is either:
         { type:'switch', id, x, y, children:[leftNode, rightNode] }
         { type:'dest', label, x, y }
       ===================================================== */
    const levels = [
        {   // Level 1: 1 switch, 1 train
            entry: { x: 0.5, y: -0.05 },
            tree: {
                type: 'switch', id: 0, x: 0.5, y: 0.45,
                children: [
                    { type: 'dest', label: '長崎駅', x: 0.25, y: 0.9 },
                    { type: 'dest', label: '車庫', x: 0.75, y: 0.9 }
                ]
            },
            trainCount: 1,
            trainDelay: 0
        },
        {   // Level 2: 2 switches, 2 trains
            entry: { x: 0.5, y: -0.05 },
            tree: {
                type: 'switch', id: 0, x: 0.5, y: 0.3,
                children: [
                    {
                        type: 'switch', id: 1, x: 0.3, y: 0.55,
                        children: [
                            { type: 'dest', label: '長崎駅', x: 0.15, y: 0.9 },
                            { type: 'dest', label: '車庫', x: 0.45, y: 0.9 }
                        ]
                    },
                    { type: 'dest', label: '武雄温泉', x: 0.78, y: 0.9 }
                ]
            },
            trainCount: 2,
            trainDelay: 2500
        },
        {   // Level 3: 3 switches, 3 trains
            entry: { x: 0.5, y: -0.05 },
            tree: {
                type: 'switch', id: 0, x: 0.5, y: 0.2,
                children: [
                    {
                        type: 'switch', id: 1, x: 0.3, y: 0.45,
                        children: [
                            { type: 'dest', label: '長崎駅', x: 0.12, y: 0.9 },
                            { type: 'dest', label: '車庫A', x: 0.37, y: 0.9 }
                        ]
                    },
                    {
                        type: 'switch', id: 2, x: 0.7, y: 0.45,
                        children: [
                            { type: 'dest', label: '車庫B', x: 0.63, y: 0.9 },
                            { type: 'dest', label: '武雄温泉', x: 0.88, y: 0.9 }
                        ]
                    }
                ]
            },
            trainCount: 3,
            trainDelay: 2200
        }
    ];

    /* =====================================================
       Path building: traverse the tree using current switch
       directions to produce an array of waypoints.
       ===================================================== */
    function buildPath(levelDef) {
        const waypoints = [{ x: levelDef.entry.x, y: levelDef.entry.y }];
        let node = levelDef.tree;
        while (node) {
            waypoints.push({ x: node.x, y: node.y, nodeType: node.type, label: node.label || '' });
            if (node.type === 'switch') {
                const sw = switches[node.id];
                const dir = sw ? sw.dir : 0;
                node = node.children[dir];
            } else {
                // destination reached
                node = null;
            }
        }
        return waypoints;
    }

    /* Given a path (array of waypoints) and a progress [0,1],
       return interpolated {x, y} position. */
    function getPositionOnPath(path, progress) {
        if (path.length < 2) return path[0] || { x: 0.5, y: 0 };

        // Compute total path length
        let totalLen = 0;
        const segLens = [];
        for (let i = 1; i < path.length; i++) {
            const dx = path[i].x - path[i - 1].x;
            const dy = path[i].y - path[i - 1].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            segLens.push(len);
            totalLen += len;
        }

        // Find which segment the progress falls on
        let targetDist = progress * totalLen;
        let accumulated = 0;
        for (let i = 0; i < segLens.length; i++) {
            if (accumulated + segLens[i] >= targetDist) {
                const segProgress = (targetDist - accumulated) / segLens[i];
                return {
                    x: path[i].x + (path[i + 1].x - path[i].x) * segProgress,
                    y: path[i].y + (path[i + 1].y - path[i].y) * segProgress
                };
            }
            accumulated += segLens[i];
        }
        // Reached end
        return { x: path[path.length - 1].x, y: path[path.length - 1].y };
    }

    /* Compute total length of a path */
    function pathLength(path) {
        let total = 0;
        for (let i = 1; i < path.length; i++) {
            const dx = path[i].x - path[i - 1].x;
            const dy = path[i].y - path[i - 1].y;
            total += Math.sqrt(dx * dx + dy * dy);
        }
        return total;
    }

    /* Which switch nodes has the train already passed?
       Returns an array of switch IDs. */
    function getPassedSwitchIds(path, progress) {
        const pos = getPositionOnPath(path, progress);
        const ids = [];
        // A switch is "passed" if the train's Y is beyond the switch Y
        for (let i = 1; i < path.length; i++) {
            if (path[i].nodeType === 'switch') {
                // Check if progress is past this waypoint
                const wpProgress = waypointProgress(path, i);
                if (progress >= wpProgress) {
                    ids.push(path[i]);
                }
            }
        }
        return ids;
    }

    /* Progress value at which the train reaches waypoint index i */
    function waypointProgress(path, waypointIdx) {
        let totalLen = 0;
        const segLens = [];
        for (let i = 1; i < path.length; i++) {
            const dx = path[i].x - path[i - 1].x;
            const dy = path[i].y - path[i - 1].y;
            segLens.push(Math.sqrt(dx * dx + dy * dy));
            totalLen += segLens[segLens.length - 1];
        }
        let dist = 0;
        for (let i = 0; i < waypointIdx && i < segLens.length; i++) {
            dist += segLens[i];
        }
        return totalLen > 0 ? dist / totalLen : 0;
    }

    /* =====================================================
       Collect all tracks and destinations from the tree
       for rendering purposes.
       ===================================================== */
    function collectEdges(node, parent) {
        const edges = [];
        if (parent) {
            edges.push({ from: { x: parent.x, y: parent.y }, to: { x: node.x, y: node.y } });
        }
        if (node.type === 'switch' && node.children) {
            node.children.forEach(child => {
                edges.push(...collectEdges(child, node));
            });
        }
        return edges;
    }

    function collectDestinations(node) {
        const dests = [];
        if (node.type === 'dest') {
            dests.push(node);
        }
        if (node.children) {
            node.children.forEach(child => {
                dests.push(...collectDestinations(child));
            });
        }
        return dests;
    }

    function collectSwitchNodes(node) {
        const sw = [];
        if (node.type === 'switch') {
            sw.push(node);
        }
        if (node.children) {
            node.children.forEach(child => {
                sw.push(...collectSwitchNodes(child));
            });
        }
        return sw;
    }

    /* =====================================================
       Initialize / Destroy
       ===================================================== */
    function init() {
        canvas = document.getElementById('switch-canvas');
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('touchstart', handleTouch, { passive: false });
        level = 1;
        loadLevel(level);
    }

    function destroy() {
        if (animId) cancelAnimationFrame(animId);
        animId = null;
        canvas.removeEventListener('click', handleClick);
        canvas.removeEventListener('touchstart', handleTouch);
        window.removeEventListener('resize', resizeCanvas);
        if (messageTimer) clearTimeout(messageTimer);
        gameState = 'ready';
    }

    function resizeCanvas() {
        const parent = canvas.parentElement;
        const rect = parent.getBoundingClientRect();
        const hud = parent.querySelector('.game-hud');
        const hudH = hud ? hud.offsetHeight : 52;
        canvas.width = rect.width;
        canvas.height = rect.height - hudH;
    }

    /* =====================================================
       Level Loading
       ===================================================== */
    function loadLevel(lvl) {
        currentLevelDef = levels[Math.min(lvl - 1, levels.length - 1)];

        // Initialize switch states
        const switchNodes = collectSwitchNodes(currentLevelDef.tree);
        switches = {};
        switchNodes.forEach(sn => {
            switches[sn.id] = { dir: 0 };
        });

        document.getElementById('switch-level').textContent = `レベル ${lvl}`;
        document.getElementById('switch-status').textContent = '';

        trains = [];
        gameState = 'ready';

        showMessage(`レベル ${lvl}\n転てつ機をタップして\n新幹線を導こう！`, () => {
            spawnTrains();
            gameState = 'playing';
        });

        if (animId) cancelAnimationFrame(animId);
        gameLoop();
    }

    function spawnTrains() {
        trains = [];
        for (let i = 0; i < currentLevelDef.trainCount; i++) {
            const tType = trainTypes[i % trainTypes.length];
            trains.push({
                typeIdx: i,
                name: tType.name,
                bodyColor: tType.bodyColor,
                accent: tType.accent,
                progress: 0,
                speed: 0.0018,
                path: buildPath(currentLevelDef),
                arrived: false,
                arrivalLabel: null,
                spawnDelay: i * currentLevelDef.trainDelay,
                spawned: false,
                spawnTime: Date.now() + i * currentLevelDef.trainDelay
            });
        }
    }

    /* =====================================================
       Game Update
       ===================================================== */
    function updateTrains() {
        if (gameState !== 'playing') return;
        const now = Date.now();

        trains.forEach(train => {
            if (train.arrived) return;
            if (now < train.spawnTime) return;
            train.spawned = true;

            // Rebuild path based on current switch states
            // Only rebuild if the train hasn't passed the switch yet
            train.path = buildPathForTrain(train);

            // Advance progress
            train.progress += train.speed;

            if (train.progress >= 1.0) {
                train.progress = 1.0;
                train.arrived = true;
                // Determine where we ended up
                const lastWP = train.path[train.path.length - 1];
                train.arrivalLabel = lastWP.label || 'unknown';

                const pos = getPositionOnPath(train.path, 1.0);
                Effects.addBurst(
                    pos.x * canvas.width,
                    pos.y * canvas.height,
                    20
                );
                Effects.soundCorrect();
            }
        });

        // Check win: all trains arrived
        const spawnedTrains = trains.filter(t => t.spawned);
        if (spawnedTrains.length === currentLevelDef.trainCount && spawnedTrains.every(t => t.arrived)) {
            gameState = 'won';
            if (level < 3) {
                showMessage('✅ クリア！\n次のレベルへ！', () => {
                    level++;
                    loadLevel(level);
                });
                Effects.soundLevelUp();
            } else {
                Effects.soundClear();
                setTimeout(() => App.showClear('switch', 3, 3), 1500);
            }
        }
    }

    /* Build path for a specific train, considering which switches
       it has already passed (those switches lock their direction). */
    function buildPathForTrain(train) {
        const waypoints = [{ x: currentLevelDef.entry.x, y: currentLevelDef.entry.y }];
        let node = currentLevelDef.tree;

        // Determine which switches this train has committed to
        // (i.e., the train's Y position is past the switch)
        const currentPos = getPositionOnPath(train.path, train.progress);

        while (node) {
            waypoints.push({ x: node.x, y: node.y, nodeType: node.type, label: node.label || '' });
            if (node.type === 'switch') {
                let dir;
                // If train has passed this switch, use committed direction
                if (train.commitedSwitches && train.commitedSwitches[node.id] !== undefined) {
                    dir = train.commitedSwitches[node.id];
                } else {
                    // Use current switch direction
                    dir = switches[node.id] ? switches[node.id].dir : 0;

                    // Check if train is past this switch's Y position
                    if (currentPos.y >= node.y - 0.01) {
                        // Commit this direction
                        if (!train.commitedSwitches) train.commitedSwitches = {};
                        train.commitedSwitches[node.id] = dir;
                    }
                }
                node = node.children[dir];
            } else {
                node = null;
            }
        }
        return waypoints;
    }

    /* =====================================================
       Drawing
       ===================================================== */
    function draw() {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, '#0A1628');
        gradient.addColorStop(1, '#132744');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Subtle grid
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.lineWidth = 1;
        for (let i = 0; i < w; i += 40) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
        }
        for (let i = 0; i < h; i += 40) {
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
        }

        // Draw entry track (top to first switch)
        const entry = currentLevelDef.entry;
        const firstSwitch = currentLevelDef.tree;
        drawTrackSegment(entry.x, 0, firstSwitch.x, firstSwitch.y, w, h);

        // Draw all track edges from tree
        const edges = collectEdges(currentLevelDef.tree, null);
        // We already drew entry→firstSwitch, now draw tree edges
        const treeEdges = collectEdges(currentLevelDef.tree, null);
        // collectEdges with parent=null won't have the root, so let's do it differently
        drawTreeTracks(currentLevelDef.tree, w, h);

        // Draw destinations
        const dests = collectDestinations(currentLevelDef.tree);
        dests.forEach(d => drawDestination(d.x, d.y, d.label, w, h));

        // Draw switches
        const switchNodes = collectSwitchNodes(currentLevelDef.tree);
        switchNodes.forEach(sn => {
            const dir = switches[sn.id] ? switches[sn.id].dir : 0;
            drawSwitch(sn.x, sn.y, sn.id, dir, w, h);
        });

        // Draw trains
        trains.forEach(train => {
            if (!train.spawned || (train.arrived && train.progress > 1)) return;
            const pos = getPositionOnPath(train.path, Math.min(train.progress, 1.0));
            drawTrain(pos.x, pos.y, train, w, h);
        });
    }

    function drawTreeTracks(node, w, h) {
        if (node.type === 'switch' && node.children) {
            node.children.forEach(child => {
                drawTrackSegment(node.x, node.y, child.x, child.y, w, h);
                drawTreeTracks(child, w, h);
            });
        }
    }

    function drawTrackSegment(x1, y1, x2, y2, w, h) {
        const px1 = x1 * w, py1 = y1 * h;
        const px2 = x2 * w, py2 = y2 * h;

        // Ballast
        ctx.strokeStyle = 'rgba(150,150,150,0.3)';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px1, py1);
        ctx.lineTo(px2, py2);
        ctx.stroke();

        // Sleepers
        const dx = px2 - px1;
        const dy = py2 - py1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.floor(dist / 18);
        const angle = Math.atan2(dy, dx) + Math.PI / 2;
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 3;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const cx = px1 + dx * t;
            const cy = py1 + dy * t;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * 9, cy + Math.sin(angle) * 9);
            ctx.lineTo(cx - Math.cos(angle) * 9, cy - Math.sin(angle) * 9);
            ctx.stroke();
        }

        // Rails (two parallel lines)
        const perpX = Math.cos(angle) * 3.5;
        const perpY = Math.sin(angle) * 3.5;
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        [-1, 1].forEach(side => {
            ctx.beginPath();
            ctx.moveTo(px1 + perpX * side, py1 + perpY * side);
            ctx.lineTo(px2 + perpX * side, py2 + perpY * side);
            ctx.stroke();
        });
    }

    function drawSwitch(x, y, id, dir, w, h) {
        const px = x * w;
        const py = y * h;

        ctx.save();
        ctx.translate(px, py);

        // Glow
        const glowGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 38);
        glowGrad.addColorStop(0, dir === 0 ? 'rgba(0,230,118,0.4)' : 'rgba(255,215,0,0.4)');
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 38, 0, Math.PI * 2);
        ctx.fill();

        // Base circle
        ctx.fillStyle = '#0A1628';
        ctx.strokeStyle = dir === 0 ? '#00E676' : '#FFD700';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Direction arrow
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        const arrowX = dir === 0 ? -10 : 10;
        ctx.lineTo(arrowX, 10);
        ctx.stroke();
        // Arrow tip
        ctx.beginPath();
        ctx.moveTo(arrowX, 10);
        ctx.lineTo(arrowX + (dir === 0 ? 5 : -5), 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(arrowX, 10);
        ctx.lineTo(arrowX + (dir === 0 ? -3 : 3), 3);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = '700 12px "M PLUS Rounded 1c"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`P${id + 1}`, 0, -30);

        // Direction label
        ctx.font = '600 9px "M PLUS Rounded 1c"';
        ctx.fillStyle = dir === 0 ? '#00E676' : '#FFD700';
        ctx.textBaseline = 'top';
        ctx.fillText(dir === 0 ? '← 左' : '右 →', 0, 28);

        ctx.restore();
    }

    function drawDestination(x, y, label, w, h) {
        const px = x * w;
        const py = y * h;
        const pw = 85;
        const ph = 32;

        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(px - pw / 2, py - ph / 2, pw, ph, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = '700 14px "M PLUS Rounded 1c"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, px, py);
    }

    function drawTrain(x, y, train, w, h) {
        const px = x * w;
        const py = y * h;

        ctx.save();
        ctx.translate(px, py);

        const tw = 28;
        const th = 48;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(3, 3, tw / 2, th / 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = train.bodyColor;
        ctx.beginPath();
        ctx.moveTo(0, th / 2);        // nose (bottom / direction of travel)
        ctx.lineTo(-tw / 2, 5);
        ctx.lineTo(-tw / 2, -th / 2 + 8);
        ctx.quadraticCurveTo(-tw / 2, -th / 2, 0, -th / 2);
        ctx.quadraticCurveTo(tw / 2, -th / 2, tw / 2, -th / 2 + 8);
        ctx.lineTo(tw / 2, 5);
        ctx.closePath();
        ctx.fill();

        // Outline
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Accent stripe
        ctx.fillStyle = train.accent;
        ctx.fillRect(-tw / 2, -3, tw, 5);

        // Windows
        ctx.fillStyle = 'rgba(79,195,247,0.85)';
        for (let wi = 0; wi < 3; wi++) {
            ctx.fillRect(-9, -th / 2 + 10 + wi * 12, 18, 5);
        }

        // Name
        ctx.fillStyle = train.accent;
        ctx.font = '900 11px "M PLUS Rounded 1c"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(train.name, 0, -th / 2 - 4);

        ctx.restore();
    }

    /* =====================================================
       Input
       ===================================================== */
    function handleClick(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / canvas.width;
        const y = (e.clientY - rect.top) / canvas.height;
        tryToggleSwitch(x, y);
    }

    function handleTouch(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = (touch.clientX - rect.left) / canvas.width;
        const y = (touch.clientY - rect.top) / canvas.height;
        tryToggleSwitch(x, y);
    }

    function tryToggleSwitch(tapX, tapY) {
        const switchNodes = collectSwitchNodes(currentLevelDef.tree);
        switchNodes.forEach(sn => {
            const dx = tapX - sn.x;
            const dy = tapY - sn.y;
            if (Math.sqrt(dx * dx + dy * dy) < 0.07) {
                const sw = switches[sn.id];
                sw.dir = sw.dir === 0 ? 1 : 0;
                Effects.soundSwitch();
                Effects.addBurst(
                    sn.x * canvas.width,
                    sn.y * canvas.height,
                    10, ['#FFD700', '#00E676']
                );
            }
        });
    }

    /* =====================================================
       Messages
       ===================================================== */
    function showMessage(text, callback) {
        const msgEl = document.getElementById('switch-message');
        msgEl.innerHTML = text.replace(/\n/g, '<br>');
        msgEl.classList.remove('hidden');
        if (messageTimer) clearTimeout(messageTimer);
        messageTimer = setTimeout(() => {
            msgEl.classList.add('hidden');
            if (callback) callback();
        }, 2200);
    }

    /* =====================================================
       Game Loop
       ===================================================== */
    function gameLoop() {
        updateTrains();
        draw();
        animId = requestAnimationFrame(gameLoop);
    }

    return { init, destroy };
})();
