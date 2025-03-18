// $(document).ready(function () {
//     // $(".loading").fadeOut(1050);
// });

async function setupHandTracking() {
    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    const detectorConfig = {
        runtime: 'mediapipe',
        modelType: 'full',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
        maxHands: 4  // 指定偵測最多 4 隻手
    };

    const detector = await handPoseDetection.createDetector(model, detectorConfig);
    async function detectHands() {
        const video = document.getElementById('input-video');
        const hands = await detector.estimateHands(video, { flipHorizontal: true });
        
        if (hands.length > 0) {
            // 儲存每一隻手的 keypoints
            window.handKeypoints = hands.map(hand => hand.keypoints);
        } else {
            window.handKeypoints = null;
        }
        
        requestAnimationFrame(detectHands);
    }
    
    detectHands();
}

document.addEventListener('DOMContentLoaded', async () => {
    const video = document.getElementById('input-video');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (err) {
        console.error('取得攝影機影像失敗:', err);
    }

    video.addEventListener('loadeddata', async () => {
        //console.log('攝影機影像成功載入');
        await setupHandTracking(); 
    });
});