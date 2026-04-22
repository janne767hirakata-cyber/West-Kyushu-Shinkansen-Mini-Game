/* ===================================================
   app.js - アプリケーション管理・画面遷移
   =================================================== */
const App = (() => {
    let currentScreen = 'screen-title';
    let currentGame = null;

    /* ゲーム → クリアメッセージ mapping */
    const clearMessages = {
        switch: {
            title: '🎉 クリアおめでとう！',
            message: '転てつ機（ポイント）は、列車が進む方向を切りかえるとても大事な設備です。\n\n信号通信の担当者は、転てつ機が正しく動くかどうか、定期的に点検・整備をしています。\n\n毎日の細かいチェックのおかげで、新幹線は安全に走ることができるんですよ！🔧'
        },

        quiz: {
            title: '🎉 ものしり博士！',
            message: '新幹線にはたくさんの技術が使われています。\n\n信号通信の仕事は、列車を安全に走らせるための「見えない力」です。\n\n信号設備・通信設備・ATCなど、たくさんの装置を24時間365日守り続けています！💪'
        },
        cable: {
            title: '🎉 配線名人！',
            message: '信号通信の設備には、たくさんのケーブルがつながっています。\n\n1本1本を正確につなぐことが、安全運行の基本です。\n\n信号通信の技術者は、ケーブルの敷設（しきせつ）や保守を丁寧に行い、新幹線を支えています！⚡'
        },
        patrol: {
            title: '🎉 パトロール上手！',
            message: '新幹線の線路や設備は、毎日しっかりチェックされています。\n\n信号通信の担当者は、巡回点検で設備の異常がないか目を光らせています。\n\n小さな異常も見逃さない技術と経験で、新幹線の安全を守っています！🔍'
        },
        signal: {
            title: '🎉 記憶力バツグン！',
            message: '信号機は赤・黄・緑の光で列車に大事な情報を伝えています。\n\n信号通信の技術者は、これらの信号機が正しく点灯するように毎日チェックしています。\n\n正確な信号があるからこそ、安全な輸送ができるんです！🚦'
        }
    };

    /* ゲームマップ */
    const gameModules = {
        switch: () => typeof SwitchGame !== 'undefined' && SwitchGame,
        quiz: () => typeof QuizGame !== 'undefined' && QuizGame,
        cable: () => typeof CableGame !== 'undefined' && CableGame,
        patrol: () => typeof PatrolGame !== 'undefined' && PatrolGame,
        signal: () => typeof SignalGame !== 'undefined' && SignalGame
    };

    /* --- Screen Transition --- */
    function showScreen(screenId) {
        const oldScreen = document.getElementById(currentScreen);
        const newScreen = document.getElementById(screenId);
        if (!newScreen) return;

        if (oldScreen) {
            oldScreen.classList.add('fade-out');
            setTimeout(() => {
                oldScreen.classList.remove('active', 'fade-out');
            }, 400);
        }

        setTimeout(() => {
            newScreen.classList.add('active', 'fade-in');
            setTimeout(() => newScreen.classList.remove('fade-in'), 500);
        }, oldScreen ? 200 : 0);

        currentScreen = screenId;
        Effects.soundClick();
    }

    /* --- Start Game --- */
    function startGame(gameId) {
        currentGame = gameId;
        showScreen('screen-game-' + gameId);
        const mod = gameModules[gameId]();
        if (gameId === 'quiz') {
            // Quiz has its own difficulty selector, just reset UI
            if (mod && mod.destroy) mod.destroy();
        } else if (mod && mod.init) {
            setTimeout(() => mod.init(), 300);
        }
    }

    /* --- Exit Game --- */
    function exitGame() {
        if (currentGame) {
            const mod = gameModules[currentGame]();
            if (mod && mod.destroy) mod.destroy();
        }
        currentGame = null;
        showScreen('screen-select');
    }

    /* --- Replay Game --- */
    function replayGame() {
        if (currentGame) {
            startGame(currentGame);
        }
    }

    /* --- Show Clear Screen --- */
    function showClear(gameId, score, maxScore) {
        currentGame = gameId; // preserve for replay
        const info = clearMessages[gameId] || clearMessages.quiz;

        document.getElementById('clear-title').textContent = info.title;
        document.getElementById('clear-score').textContent =
            score !== undefined ? `スコア: ${score} / ${maxScore}` : '';
        document.getElementById('clear-message').textContent = info.message;

        showScreen('screen-clear');

        // Stars animation
        const stars = document.querySelectorAll('.clear-star');
        stars.forEach(s => s.classList.remove('show'));
        const starCount = maxScore ? Math.ceil((score / maxScore) * 3) : 3;
        setTimeout(() => {
            for (let i = 0; i < Math.min(starCount, 3); i++) {
                stars[i].classList.add('show');
            }
        }, 300);

        // Confetti
        setTimeout(() => Effects.addConfetti(80), 500);
        Effects.soundClear();
    }

    /* --- Init --- */
    function init() {
        // Ensure first screen is visible
        document.getElementById('screen-title').classList.add('active');
        // Resume audio on first touch
        document.addEventListener('touchstart', () => {
            if (typeof AudioContext !== 'undefined') {
                // resume audio context on user gesture
            }
        }, { once: true });
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        showScreen,
        startGame,
        exitGame,
        replayGame,
        showClear,
        get currentGame() { return currentGame; }
    };
})();
