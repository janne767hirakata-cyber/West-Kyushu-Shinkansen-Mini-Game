/* ===================================================
   effects.js - パーティクル・サウンド・エフェクト
   =================================================== */
const Effects = (() => {
    let canvas, ctx;
    let particles = [];
    let bgParticles = [];
    let animId = null;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    /* --- Initialize --- */
    function init() {
        canvas = document.getElementById('particle-canvas');
        ctx = canvas.getContext('2d');
        resize();
        window.addEventListener('resize', resize);
        createBgParticles();
        loop();
    }

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    /* --- Background Particles (floating dots) --- */
    function createBgParticles() {
        bgParticles = [];
        const count = Math.floor((canvas.width * canvas.height) / 15000);
        for (let i = 0; i < count; i++) {
            bgParticles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 2 + 0.5,
                dx: (Math.random() - 0.5) * 0.3,
                dy: (Math.random() - 0.5) * 0.3,
                alpha: Math.random() * 0.4 + 0.1,
                color: ['#4FC3F7', '#FFD700', '#E8344E', '#00E676'][Math.floor(Math.random() * 4)]
            });
        }
    }

    function updateBgParticles() {
        bgParticles.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
        });
    }

    function drawBgParticles() {
        bgParticles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    /* --- Burst Particles (celebration, etc) --- */
    function addBurst(x, y, count = 30, colors = ['#FFD700', '#E8344E', '#4FC3F7', '#00E676', '#FF6D00']) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
            const speed = Math.random() * 6 + 2;
            particles.push({
                x, y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                r: Math.random() * 4 + 2,
                life: 1,
                decay: Math.random() * 0.015 + 0.01,
                color: colors[Math.floor(Math.random() * colors.length)],
                gravity: 0.05
            });
        }
    }

    function addConfetti(count = 60) {
        const cx = canvas.width / 2;
        const cy = canvas.height * 0.3;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 3;
            particles.push({
                x: cx + (Math.random() - 0.5) * 200,
                y: cy + (Math.random() - 0.5) * 100,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed - 3,
                r: Math.random() * 5 + 3,
                life: 1,
                decay: Math.random() * 0.008 + 0.005,
                color: ['#FFD700', '#E8344E', '#4FC3F7', '#00E676', '#FF6D00', '#E040FB'][Math.floor(Math.random() * 6)],
                gravity: 0.08,
                isRect: Math.random() > 0.5,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.2
            });
        }
    }

    function updateParticles() {
        particles = particles.filter(p => {
            p.x += p.dx;
            p.y += p.dy;
            p.dy += p.gravity || 0;
            p.dx *= 0.99;
            p.life -= p.decay;
            if (p.rotation !== undefined) p.rotation += p.rotSpeed;
            return p.life > 0;
        });
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            if (p.isRect) {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation || 0);
                ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });
    }

    /* --- Animation Loop --- */
    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateBgParticles();
        drawBgParticles();
        updateParticles();
        drawParticles();
        animId = requestAnimationFrame(loop);
    }

    /* --- Sound Effects --- */
    function playTone(freq, duration = 0.15, type = 'sine', volume = 0.15) {
        try {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(volume, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) { /* audio not available */ }
    }

    function soundCorrect() {
        playTone(523, 0.1, 'sine', 0.12);
        setTimeout(() => playTone(659, 0.1, 'sine', 0.12), 100);
        setTimeout(() => playTone(784, 0.15, 'sine', 0.12), 200);
    }

    function soundWrong() {
        playTone(200, 0.25, 'sawtooth', 0.08);
        setTimeout(() => playTone(180, 0.3, 'sawtooth', 0.06), 150);
    }

    function soundClick() {
        playTone(880, 0.06, 'sine', 0.08);
    }

    function soundSwitch() {
        playTone(150, 0.08, 'square', 0.1);
        setTimeout(() => playTone(300, 0.05, 'square', 0.08), 60);
    }

    function soundClear() {
        const notes = [523, 659, 784, 1047];
        notes.forEach((n, i) => {
            setTimeout(() => playTone(n, 0.2, 'sine', 0.12), i * 150);
        });
    }

    function soundSignal(color) {
        const freqs = { red: 330, yellow: 440, green: 554 };
        playTone(freqs[color] || 440, 0.3, 'sine', 0.1);
    }

    function soundLevelUp() {
        playTone(440, 0.1, 'sine', 0.1);
        setTimeout(() => playTone(554, 0.1, 'sine', 0.1), 100);
        setTimeout(() => playTone(659, 0.1, 'sine', 0.1), 200);
        setTimeout(() => playTone(880, 0.2, 'sine', 0.1), 300);
    }

    /* --- Public API --- */
    return {
        init,
        addBurst,
        addConfetti,
        soundCorrect,
        soundWrong,
        soundClick,
        soundSwitch,
        soundClear,
        soundSignal,
        soundLevelUp,
        get canvas() { return canvas; }
    };
})();

document.addEventListener('DOMContentLoaded', Effects.init);
