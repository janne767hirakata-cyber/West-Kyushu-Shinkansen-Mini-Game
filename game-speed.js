/* ===================================================
   game-speed.js - ATC速度あてゲーム
   運転台画面風UIでATC信号の速度制限を当てる
   =================================================== */
const SpeedGame = (() => {
    let currentQuestion = 0;
    let score = 0;
    let questions = [];
    let answered = false;

    /* --- 問題プール --- */
    const questionPool = [
        {
            scenario: '🏔️ 前方に駅があります。まもなく停車します。',
            atcDisplay: '30',
            correct: '30km/h',
            choices: ['260km/h', '120km/h', '70km/h', '30km/h'],
            explanation: '駅に近づくと、ATC信号は30km/hの制限速度を表示します。運転士は確認ボタンを押して安全に停車します。'
        },
        {
            scenario: '🚄 全区間にわたり線路に異常はありません。最高速度で走行中！',
            atcDisplay: '260',
            correct: '260km/h',
            choices: ['260km/h', '230km/h', '120km/h', '70km/h'],
            explanation: '西九州新幹線「かもめ」の最高速度は260km/hです。ATCが全速OKの信号を出しています。'
        },
        {
            scenario: '⚠️ 前方の列車が停車しています。減速が必要です。',
            atcDisplay: '0',
            correct: '0km/h（停止）',
            choices: ['120km/h', '70km/h', '30km/h', '0km/h（停止）'],
            explanation: '前方に列車がいる場合、ATCは停止（0km/h）を指示します。追突を防ぐ大事な仕組みです。'
        },
        {
            scenario: '🔀 まもなく分岐器（ポイント）を通過します。',
            atcDisplay: '70',
            correct: '70km/h',
            choices: ['260km/h', '170km/h', '70km/h', '30km/h'],
            explanation: '分岐器（ポイント）のある区間では速度制限があります。安全に通過するために減速します。'
        },
        {
            scenario: '🌧️ 大雨で速度規制がかかっています。',
            atcDisplay: '170',
            correct: '170km/h',
            choices: ['260km/h', '170km/h', '120km/h', '30km/h'],
            explanation: '天候による速度規制では、ATCが自動的に制限速度を下げます。KMS（防災情報システム）が連動しています。'
        },
        {
            scenario: '🏗️ 線路の保守作業区間に近づいています。',
            atcDisplay: '120',
            correct: '120km/h',
            choices: ['260km/h', '170km/h', '120km/h', '70km/h'],
            explanation: '保守作業区間では速度制限がかかります。作業員の安全を守るための大切なルールです。'
        },
        {
            scenario: '🚉 まもなく次の駅を通過します。（停車しません）',
            atcDisplay: '230',
            correct: '230km/h',
            choices: ['260km/h', '230km/h', '170km/h', '120km/h'],
            explanation: '通過駅では最高速度より少し遅い速度制限がかかることがあります。ホーム上の安全のためです。'
        },
        {
            scenario: '🏔️ トンネルの入口に近づいています。',
            atcDisplay: '260',
            correct: '260km/h',
            choices: ['260km/h', '230km/h', '170km/h', '120km/h'],
            explanation: '新幹線のトンネルは高速で通過できるよう設計されています。ATCがあれば安全です！'
        },
        {
            scenario: '🌬️ 強風警報が出ています。風速規制がかかりました。',
            atcDisplay: '120',
            correct: '120km/h',
            choices: ['260km/h', '170km/h', '120km/h', '70km/h'],
            explanation: '強風時はKMSが風速を計測し、自動的に速度制限を行います。安全第一です！'
        },
        {
            scenario: '🚄 出発進行！駅を発車したばかりです。',
            atcDisplay: '70',
            correct: '70km/h',
            choices: ['260km/h', '170km/h', '70km/h', '30km/h'],
            explanation: '駅を出発した直後は、まだ速度が上がっていない区間です。ATCの許容速度が段階的に上がっていきます。'
        },
        {
            scenario: '⛰️ 急カーブの区間を走行中です。',
            atcDisplay: '170',
            correct: '170km/h',
            choices: ['260km/h', '230km/h', '170km/h', '120km/h'],
            explanation: 'カーブでは遠心力がかかるため、速度制限があります。乗客の快適性と安全のためです。'
        },
        {
            scenario: '🔧 信号設備の臨時点検区間です。徐行運転してください。',
            atcDisplay: '30',
            correct: '30km/h',
            choices: ['120km/h', '70km/h', '30km/h', '0km/h（停止）'],
            explanation: '信号通信設備の緊急点検時は厳しい速度制限がかかります。信号通信の技術者が安全を確認します。'
        }
    ];

    /* --- Initialize --- */
    function init() {
        score = 0;
        currentQuestion = 0;
        answered = false;
        // Shuffle and pick 10 questions
        questions = shuffleArray([...questionPool]).slice(0, 10);
        updateHUD();
        showQuestion();
    }

    function destroy() {
        // cleanup
    }

    /* --- Show Question --- */
    function showQuestion() {
        if (currentQuestion >= questions.length) {
            App.showClear('speed', score, questions.length);
            return;
        }

        answered = false;
        const q = questions[currentQuestion];

        // Update display
        document.getElementById('atc-value').textContent = q.atcDisplay;
        document.getElementById('speed-scenario-text').textContent = q.scenario;

        // Scenery speed animation
        const scenery = document.getElementById('speed-scenery');
        const speed = parseInt(q.atcDisplay) || 0;
        const duration = speed > 0 ? Math.max(0.5, 8 - (speed / 40)) : 0;
        scenery.style.animationDuration = duration > 0 ? duration + 's' : '0s';
        scenery.style.animationPlayState = speed > 0 ? 'running' : 'paused';

        // Choices
        const choicesEl = document.getElementById('speed-choices');
        choicesEl.innerHTML = '';
        const shuffled = shuffleArray([...q.choices]);
        shuffled.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'speed-choice-btn';
            btn.textContent = choice;
            btn.onclick = () => selectAnswer(choice, btn);
            choicesEl.appendChild(btn);
        });

        updateHUD();
    }

    /* --- Answer Selection --- */
    function selectAnswer(choice, btn) {
        if (answered) return;
        answered = true;

        const q = questions[currentQuestion];
        const isCorrect = choice === q.correct;

        if (isCorrect) {
            btn.classList.add('correct');
            score++;
            Effects.soundCorrect();
            Effects.addBurst(
                btn.getBoundingClientRect().left + btn.offsetWidth / 2,
                btn.getBoundingClientRect().top + btn.offsetHeight / 2,
                15
            );
        } else {
            btn.classList.add('wrong');
            Effects.soundWrong();
            // Highlight correct answer
            const buttons = document.querySelectorAll('.speed-choice-btn');
            buttons.forEach(b => {
                if (b.textContent === q.correct) b.classList.add('correct');
            });
        }

        updateHUD();

        setTimeout(() => {
            currentQuestion++;
            showQuestion();
        }, 1500);
    }

    /* --- HUD Update --- */
    function updateHUD() {
        document.getElementById('speed-progress').textContent =
            `${currentQuestion + 1} / ${questions.length}`;
        document.getElementById('speed-score').textContent = `${score}点`;
    }

    /* --- Utility --- */
    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    return { init, destroy };
})();
