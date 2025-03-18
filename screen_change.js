$(document).ready(function () {
    const delayBetween = 800; // 每張圖顯示間隔（毫秒）
    const wallbgs = ['#wallbg1', '#wallbg2', '#wallbg3', '#wallbg4', '#wallbg5'];

    // 依序顯示 wallbg
    $.each(wallbgs, function (index, id) {
        setTimeout(function () {
            $(id).addClass('show');
        }, delayBetween * index);
    });

    // 等最後一張 wallbg 顯示完後，再顯示 canvas 並播放音樂
    const totalDelay = delayBetween * wallbgs.length + 500; // 可微調最後 canvas 延遲
    setTimeout(function () {
        $('.wall canvas').addClass('show');
        
        // 播放音樂並控制音量
        $('#finalplaypagebgnusic')[0].play();

        // 使用 Web Audio API 增加音量
        var audioElement = document.getElementById('finalplaypagebgnusic');
        var audioContext = new (window.AudioContext || window.webkitAudioContext)();
        var analyser = audioContext.createAnalyser();
        var source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        // 創建增長音量的效果
        var gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0, audioContext.currentTime); // 初始音量為0
        gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 5); // 5秒內增長至最大音量
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

    }, totalDelay);
});
