
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/9.1.0/firebase-database.js";

// Firebase 設定與初始化
const firebaseConfig = {
    apiKey: "AIzaSyAqnklEsaSCiq4IwVh4FtD7Ubc5H2DUrnI",
    authDomain: "thepomoli.firebaseapp.com",
    databaseURL: "https://thepomoli-default-rtdb.firebaseio.com",
    projectId: "thepomoli",
    storageBucket: "thepomoli.firebasestorage.app",
    messagingSenderId: "59738069258",
    appId: "1:59738069258:web:958f4f61801e7ea18f02f3",
    measurementId: "G-P0BN7JD7X6"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

$(document).ready(function () {
    const isHidden = $('#playpage').css('display') === 'none';
    const status = isHidden ? 'hide' : 'show';
    set(ref(db, 'displayStatus'), status).catch(console.error);

    const video = $('#storypage video')[0];
    const audio = $('#storypage audio')[0];

    // 影片播放時同步播放音樂
    video.addEventListener('play', function () {
        audio.play().catch(err => {
            console.warn('audio 播放失敗：', err);
        });
    });

    // 影片播放結束時切換到 playpage
    video.addEventListener('ended', function () {
        $('#storypage').fadeOut(0, function () {
            $('#playpage').fadeIn(0, function () {

                // ✅ 設定 Firebase 狀態為 show
                set(ref(db, 'displayStatus'), 'show').catch(console.error);

                startPlayPageSequence();
            });
        });
    });

    function startPlayPageSequence() {
        const delayBetween = 800;
        const wallbgs = ['#wallbg2', '#wallbg3', '#wallbg4', '#wallbg5', "#wh1"];

        $.each(wallbgs, function (index, id) {
            setTimeout(function () {
                $(id).addClass('show');
            }, delayBetween * index);
        });

        const totalDelay = delayBetween * wallbgs.length + 400;
        setTimeout(function () {
            $('.container canvas').addClass('show');
            const bgm = document.getElementById('playpagebgmusic');
            bgm.play();

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaElementSource(bgm);
            const analyser = audioContext.createAnalyser();
            const gainNode = audioContext.createGain();
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 5);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
        }, totalDelay);
    }

    // 保險起見，嘗試播放影片
    video.play().catch(e => {
        console.warn('影片自動播放失敗：', e);
    });

    // ✅ 監控 playpage 是否被隱藏（你可在其他地方 fadeOut playpage 時手動觸發）
    const observer = new MutationObserver(() => {
        const isHidden = $('#playpage').css('display') === 'none';
        const status = isHidden ? 'hide' : 'show';
        set(ref(db, 'displayStatus'), status).catch(console.error);
    });

    // 監控 style 或 class 改變
    const targetNode = document.getElementById('playpage');
    observer.observe(targetNode, { attributes: true, attributeFilter: ['style', 'class'] });
});

window.addEventListener('beforeunload', () => {
    set(ref(db, 'displayStatus'), 'hide').catch(console.error);
});