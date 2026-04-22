/* ===================================================
   game-quiz.js - 新幹線ものしりクイズ
   難易度: しょきゅう / ちゅうきゅう / じょうきゅう
   =================================================== */
const QuizGame = (() => {
    let currentQuestion = 0;
    let score = 0;
    let questions = [];
    let answered = false;
    let difficulty = 'beginner';

    /* =====================================================
       しょきゅう（初級）- 小さい子でもわかるかんたんな問題
       ===================================================== */
    const beginnerPool = [
        {
            q: '🚄 新幹線「かもめ」のからだの色は何色？',
            choices: ['赤', '白', '黒', '黄色'],
            answer: 1,
            explanation: '新幹線「かもめ」は白い車体に赤いラインが入ったかっこいいデザインです！',
            emoji: '🚄'
        },
        {
            q: '🚦 信号機の「赤」は何をいみする？',
            choices: ['すすめ', 'とまれ', 'はやくはしれ', 'バックしろ'],
            answer: 1,
            explanation: '赤は「とまれ」のいみです。新幹線も車も同じですね！安全のために大事なルールです。',
            emoji: '🔴'
        },
        {
            q: '🛤️ 新幹線は何の上を走る？',
            choices: ['道路', '線路（レール）', '空', '水の上'],
            answer: 1,
            explanation: '新幹線は線路（レール）の上を走ります。レールは鉄でできていて、とてもながいんです！',
            emoji: '🛤️'
        },
        {
            q: '🚦 信号機の「青（緑）」は何をいみする？',
            choices: ['とまれ', 'ねむれ', 'すすめ', 'もどれ'],
            answer: 2,
            explanation: '青（みどり）は「すすめ」のいみです。安全に進んでOKのサインです！',
            emoji: '🟢'
        },
        {
            q: '⚡ 新幹線は何の力で走る？',
            choices: ['ガソリン', '電気', '風', '人の力'],
            answer: 1,
            explanation: '新幹線は電気の力で走ります。パンタグラフという装置で上の電線から電気をもらっています。',
            emoji: '⚡'
        },
        {
            q: '🏃 新幹線はとても...？',
            choices: ['おそい', 'はやい', 'おもい', 'ちいさい'],
            answer: 1,
            explanation: '新幹線はとてもはやい！「かもめ」は時速260kmで走ります。車の3倍以上もはやいんです！',
            emoji: '💨'
        },
        {
            q: '🔀 線路を切りかえるきかいの名前は？',
            choices: ['エレベーター', '転てつ機（ポイント）', 'エスカレーター', 'ブランコ'],
            answer: 1,
            explanation: '転てつ機（てんてつき）は線路の方向を切りかえるきかいです。スイッチみたいなものですね！',
            emoji: '🔀'
        },
        {
            q: '🛤️ 新幹線の線路は何本ある？',
            choices: ['1本', '2本', '3本', '4本'],
            answer: 1,
            explanation: '新幹線の線路は2本のレールでできています。この2本のレールの上を車輪が走るんです！',
            emoji: '🛤️'
        },
        {
            q: '🚄 「かもめ」の名前はどんなとりの名前？',
            choices: ['すずめ', 'つばめ', 'かもめ（海の鳥）', 'にわとり'],
            answer: 2,
            explanation: 'かもめは海の近くを飛ぶ白い鳥です。白くてかっこいいところが新幹線とにていますね！',
            emoji: '🕊️'
        },
        {
            q: '👷 新幹線を安全に走らせるお仕事をするのは？',
            choices: ['お医者さん', '料理人', '鉄道の技術者', 'お花屋さん'],
            answer: 2,
            explanation: '鉄道の技術者さんたちが、毎日新幹線を点検して安全に走れるようにしてくれています！',
            emoji: '👷'
        },
        {
            q: '🌈 新幹線「かもめ」のラインの色は何色？',
            choices: ['青', '赤', '黄色', '紫'],
            answer: 1,
            explanation: '新幹線「かもめ」には赤いラインが入っています。JR九州のシンボルカラーです！',
            emoji: '❤️'
        },
        {
            q: '🔧 新幹線の点検はどのくらいのひんどでやる？',
            choices: ['1年に1回だけ', 'まいにち', '10年に1回', 'こわれたときだけ'],
            answer: 1,
            explanation: '新幹線は毎日点検しています！安全のためにとても大事なお仕事です。',
            emoji: '🔧'
        }
    ];

    /* =====================================================
       ちゅうきゅう（中級）- 少し知識が必要
       ===================================================== */
    const intermediatePool = [
        {
            q: '西九州新幹線「かもめ」の最高速度は何km/h？',
            choices: ['200km/h', '240km/h', '260km/h', '300km/h'],
            answer: 2,
            explanation: '西九州新幹線「かもめ」の最高速度は260km/hです！',
            emoji: '🚄'
        },
        {
            q: '転てつ機（ポイント）の役割は何でしょう？',
            choices: ['列車を止める', '列車が進む方向を変える', '速度を測る', '電気を送る'],
            answer: 1,
            explanation: '転てつ機は、レールの方向を切り替えて列車の進路を変える装置です。',
            emoji: '🔀'
        },
        {
            q: '新幹線の信号方式はどれ？',
            choices: ['色灯式信号', '腕木式信号', '車内信号式', '旗信号'],
            answer: 2,
            explanation: '新幹線は「車内信号式」で、運転台の画面に速度が表示されます。地上に信号機はありません！',
            emoji: '📺'
        },
        {
            q: '大村車両基地がある県はどこ？',
            choices: ['福岡県', '佐賀県', '長崎県', '熊本県'],
            answer: 2,
            explanation: '大村車両基地は長崎県大村市にあります。ここで新幹線の整備を行っています。',
            emoji: '🏭'
        },
        {
            q: '新幹線「かもめ」は何両編成？',
            choices: ['4両', '6両', '8両', '16両'],
            answer: 1,
            explanation: '西九州新幹線「かもめ」は6両編成です。東海道新幹線「のぞみ」は16両編成ですよ！',
            emoji: '🚃'
        },
        {
            q: '新幹線の線路幅（軌間）はどのくらい？',
            choices: ['1,067mm', '1,200mm', '1,435mm', '1,600mm'],
            answer: 2,
            explanation: '新幹線は1,435mm（標準軌）です。在来線の1,067mmより広いので安定して速く走れます。',
            emoji: '📏'
        },
        {
            q: '新幹線は何の力で走っている？',
            choices: ['ディーゼルエンジン', '電気', '蒸気', 'ジェットエンジン'],
            answer: 1,
            explanation: '新幹線は電気で走ります。架線（かせん）から電気をもらってモーターを回しています。',
            emoji: '⚡'
        },
        {
            q: '西九州新幹線の武雄温泉〜長崎間の距離は約何km？',
            choices: ['約30km', '約50km', '約66km', '約100km'],
            answer: 2,
            explanation: '武雄温泉から長崎まで約66kmです。最速で約23分で結んでいます！',
            emoji: '📏'
        },
        {
            q: '新幹線が最初に開業したのはいつ？',
            choices: ['1954年', '1964年', '1974年', '1984年'],
            answer: 1,
            explanation: '1964年10月1日、東京オリンピックに合わせて東海道新幹線が開業しました！',
            emoji: '📅'
        },
        {
            q: '新幹線の停電に備えた非常電源は？',
            choices: ['太陽光パネル', 'バッテリー（蓄電池）', '風力発電', '手回し発電機'],
            answer: 1,
            explanation: '信号通信設備にはバッテリーが備えられていて、停電時でも信号が動き続けます。',
            emoji: '🔋'
        },
        {
            q: '新幹線のレールの長さ（定尺レール）は1本何m？',
            choices: ['10m', '15m', '25m', '50m'],
            answer: 2,
            explanation: '定尺レールは25mですが、溶接して200m以上のロングレールにして乗り心地をよくしています。',
            emoji: '🛤️'
        },
        {
            q: '新幹線は開業以来、乗客の死亡事故は何件？',
            choices: ['0件', '1件', '5件', '10件以上'],
            answer: 0,
            explanation: '新幹線は開業以来、列車事故による乗客の死亡事故は0件です！安全技術の結晶です！',
            emoji: '🛡️'
        }
    ];

    /* =====================================================
       じょうきゅう（上級）- 専門知識クイズ
       ===================================================== */
    const advancedPool = [
        {
            q: 'ATCは何の略でしょう？',
            choices: ['Automatic Train Control', 'Advanced Train Computer', 'Auto Track Changer', 'All Train Command'],
            answer: 0,
            explanation: 'ATCは「Automatic Train Control（自動列車制御装置）」の略です。',
            emoji: '💻'
        },
        {
            q: '西九州新幹線で使われているATCシステムは？',
            choices: ['DS-ATC', 'KS-ATC', 'ATC-NS', 'D-ATC'],
            answer: 1,
            explanation: 'KS-ATC（九州新幹線用ATC）が使われています。Kは「Kyushu（九州）」のKです！',
            emoji: '📡'
        },
        {
            q: 'CICとは何のシステム？',
            choices: ['運転席のエアコン', '通信情報制御監視システム', '切符の販売', 'ドアの開閉'],
            answer: 1,
            explanation: 'CIC（通信情報制御監視システム）は信号設備や通信設備を一括監視・制御するシステムです。',
            emoji: '🖥️'
        },
        {
            q: '新幹線の線路で列車の位置を検知する仕組みは？',
            choices: ['GPS', '軌道回路', 'レーダー', 'カメラ'],
            answer: 1,
            explanation: '軌道回路はレールに電気を流して列車の位置を検知する仕組みです。信号通信の基本技術です！',
            emoji: '⚡'
        },
        {
            q: '風速や雨量を監視して自動的に速度制限するシステムは？',
            choices: ['GPS', 'KMS', 'Wi-Fi', 'LED'],
            answer: 1,
            explanation: 'KMS（防災情報・信通設備監視システム）が風速計・雨量計と連動し、自動で速度制限します。',
            emoji: '🌬️'
        },
        {
            q: '転てつ機の点検はどのように行われる？',
            choices: ['1年に1回だけ', '壊れたときだけ', '10年ごと', '毎日〜定期的に複数種類'],
            answer: 3,
            explanation: '転てつ機は毎日の目視点検のほか、定期的に電気試験や動作試験が行われています。',
            emoji: '🔧'
        },
        {
            q: '信号通信の仕事をする人を何という？',
            choices: ['運転士', '車掌', '信号通信技術者', '駅員'],
            answer: 2,
            explanation: '信号通信技術者は、信号・通信・ATC設備の点検や修理を行う専門の技術者です。',
            emoji: '👷'
        },
        {
            q: '西九州新幹線「かもめ」の車両形式は？',
            choices: ['N700S系', '800系', 'E7系', '500系'],
            answer: 0,
            explanation: 'N700Sをベースにした車両が使われています。最新技術が搭載された車両です！',
            emoji: '🚅'
        },
        {
            q: 'デジタルATCとアナログATCの大きな違いは？',
            choices: ['色が違う', 'ブレーキパターンの作り方', '使う言語', '車両の大きさ'],
            answer: 1,
            explanation: 'デジタルATCは前方の停止点までの最適なブレーキパターンを計算し、滑らかに減速できます。',
            emoji: '📊'
        },
        {
            q: 'ATC信号の「30km/h」現示で速度が30km/h以下になったとき必要な操作は？',
            choices: ['ドアを開ける', '確認ボタンを押す', '逆噴射する', '窓を開ける'],
            answer: 1,
            explanation: '30km/h現示で速度が下がったとき、運転士が確認ボタンを押さないと停止する仕組みです。',
            emoji: '🔘'
        },
        {
            q: '新幹線のパンタグラフの役割は？',
            choices: ['ブレーキ', '架線から電気を受け取る', '方向を変える', '空調'],
            answer: 1,
            explanation: 'パンタグラフは架線（上の電線）から電気を受け取る装置です。走りながら電気をもらいます。',
            emoji: '⚡'
        },
        {
            q: '新幹線の指令所で列車の運行を管理するシステムは？',
            choices: ['カーナビ', '新幹線指令システム', 'SNS', 'メール'],
            answer: 1,
            explanation: '新幹線指令システムで全列車の位置や運行状況を一元管理しています。',
            emoji: '🗺️'
        }
    ];

    /* 難易度設定 */
    const difficultyConfig = {
        beginner: { pool: beginnerPool, count: 8, label: 'しょきゅう 🌟' },
        intermediate: { pool: intermediatePool, count: 10, label: 'ちゅうきゅう 🔥' },
        advanced: { pool: advancedPool, count: 10, label: 'じょうきゅう 👑' }
    };

    /* --- Initialize --- */
    function init(diff) {
        difficulty = diff || 'beginner';
        const config = difficultyConfig[difficulty];

        score = 0;
        currentQuestion = 0;
        answered = false;
        questions = shuffleArray([...config.pool]).slice(0, config.count);

        // Hide difficulty select, show quiz body
        document.getElementById('quiz-difficulty-select').classList.add('hidden');
        document.getElementById('quiz-body').classList.remove('hidden');

        // Update HUD
        document.getElementById('quiz-progress').textContent = `${config.label}`;
        updateHUD();
        showQuestion();
        Effects.soundClick();
    }

    function destroy() {
        // Reset to show difficulty selector
        const diffSelect = document.getElementById('quiz-difficulty-select');
        const quizBody = document.getElementById('quiz-body');
        if (diffSelect) diffSelect.classList.remove('hidden');
        if (quizBody) quizBody.classList.add('hidden');
    }

    /* --- Show Question --- */
    function showQuestion() {
        if (currentQuestion >= questions.length) {
            App.showClear('quiz', score, questions.length);
            return;
        }

        answered = false;
        const q = questions[currentQuestion];

        document.getElementById('quiz-question-number').textContent = `Q${currentQuestion + 1}`;
        document.getElementById('quiz-question').textContent = q.q;
        document.getElementById('quiz-image').textContent = q.emoji || '';
        document.getElementById('quiz-explanation').classList.add('hidden');

        const choicesEl = document.getElementById('quiz-choices');
        choicesEl.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];
        q.choices.forEach((choice, i) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-choice-btn';
            btn.innerHTML = `<span class="choice-letter">${letters[i]}</span><span>${choice}</span>`;
            btn.onclick = () => selectAnswer(i, btn);
            choicesEl.appendChild(btn);
        });

        updateHUD();
    }

    /* --- Answer --- */
    function selectAnswer(index, btn) {
        if (answered) return;
        answered = true;

        const q = questions[currentQuestion];
        const isCorrect = index === q.answer;

        if (isCorrect) {
            btn.classList.add('correct');
            score++;
            Effects.soundCorrect();
            document.getElementById('quiz-result-icon').textContent = '⭕ せいかい！';
        } else {
            btn.classList.add('wrong');
            Effects.soundWrong();
            const buttons = document.querySelectorAll('#quiz-body .quiz-choice-btn');
            buttons[q.answer].classList.add('correct');
            document.getElementById('quiz-result-icon').textContent = '❌ ざんねん！';
        }

        document.getElementById('quiz-explanation-text').textContent = q.explanation;
        document.getElementById('quiz-explanation').classList.remove('hidden');
        updateHUD();
    }

    /* --- Next Question --- */
    function nextQuestion() {
        currentQuestion++;
        showQuestion();
    }

    /* --- HUD --- */
    function updateHUD() {
        const config = difficultyConfig[difficulty];
        document.getElementById('quiz-progress').textContent =
            `${config.label}  ${currentQuestion + 1} / ${questions.length}`;
        document.getElementById('quiz-score').textContent = `${score}点`;
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    return { init, destroy, nextQuestion };
})();
