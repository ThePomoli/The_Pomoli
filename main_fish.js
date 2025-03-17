let fishArray = [];
const numFish = 20;
let fishTextures = [];
let leafImage;

// 載入魚的 GIF
function preload() {
    for (let i = 1; i <= 2; i++) {
        fishTextures.push(loadImage(`./img/${i}.gif`));
    }
    leafImage = loadImage('./img/leaf.png'); // 載入葉子圖片
}

function setup() {
    const container = document.querySelector('.wall');
    const canvas = createCanvas(window.innerWidth, window.innerHeight);
    container.appendChild(canvas.elt);

    // Set the 'willReadFrequently' attribute to true for the canvas
    canvas.elt.setAttribute('willReadFrequently', 'true');

    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '2';

    // 生成魚的位置，確保不在「手部區域」
    for (let i = 0; i < numFish; i++) {
        let pos;
        let attempts = 0;
        do {
            pos = createVector(random(width), random(height));
            attempts++;
            if (attempts > 100) break;
        } while (isInHand(pos.x, pos.y));
        fishArray.push(new Fish(pos.x, pos.y));
    }
    function windowResized() {
        resizeCanvas(window.innerWidth, window.innerHeight);
    }
    windowResized(); // 初次執行
    
}

function draw() {
    // 如果有偵測到手，先計算各關鍵點的速度
    if (window.handKeypoints) {
        window.handKeypointsSpeed = window.handKeypoints.map((hand, handIndex) => {
            return hand.map((kp, kpIndex) => {
                if (window.prevHandKeypoints &&
                    window.prevHandKeypoints[handIndex] &&
                    window.prevHandKeypoints[handIndex][kpIndex]) {
                    return dist(kp.x, kp.y, window.prevHandKeypoints[handIndex][kpIndex].x, window.prevHandKeypoints[handIndex][kpIndex].y);
                }
                return Infinity; // 若沒有前一幀資料，預設為很大值
            });
        });
        // 更新前一幀的資料 (深拷貝)
        window.prevHandKeypoints = window.handKeypoints.map(hand => hand.map(kp => ({ x: kp.x, y: kp.y })));
    }

    clear(); // 清除前一幀繪圖
  
    if (window.handKeypoints) {
        const video = document.getElementById('input-video');
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
    
        for (let handIndex = 0; handIndex < window.handKeypoints.length; handIndex++) {
            let keypoints = window.handKeypoints[handIndex];
    
            for (let i = 0; i < keypoints.length; i++) {
                const kp = keypoints[i];
                const mapped = mapToCanvas(kp.x, kp.y, videoWidth, videoHeight); // 座標映射
    
                push();
                translate(mapped.x, mapped.y);
                let angle = 0;
                if (i > 0) {
                    const prev = keypoints[i - 1];
                    const mappedPrev = mapToCanvas(prev.x, prev.y, videoWidth, videoHeight);
                    angle = atan2(mapped.y - mappedPrev.y, mapped.x - mappedPrev.x);
                }
                rotate(angle);
                imageMode(CENTER);
                image(leafImage, 0, 0, 30, 30); // 葉子圖片
                pop();
            }
        }
    }
         

    // (2) 更新、碰撞檢查並繪製魚
    for (let fish of fishArray) {
        fish.update();
        fish.checkHandCollision();
    }
    for (let fish of fishArray) {
        fish.display();
    }
}


function isInHand(x, y) {
    if (!window.handKeypoints) return false;

    const handThreshold = 50; // 根據實際情況調整
    for (let hand of window.handKeypoints) {
        for (let kp of hand) {
            if (dist(x, y, kp.x, kp.y) < handThreshold) {
                return true;
            }
        }
    }
    return false;
}


// 魚的類別定義
class Fish {
    constructor(x, y) {
        this.position = createVector(x, y);
        this.baseSpeed = random(0.5, 0.8);
        this.speed = this.baseSpeed;
        this.maxEscapeSpeed = 5;
        this.angle = random(TWO_PI);
        this.targetAngle = this.angle;
        this.changeDirectionInterval = int(random(100, 300));
        this.centerAttractionTimer = 0;
        this.centerAttractionInterval = int(random(300, 600));
        this.texture = random(fishTextures);
        this.landed = false;       // 是否處於著陸狀態
        this.landingTarget = null; // 目標著陸位置
    }

    update() {
        // 如果處於著陸狀態，則逐漸向著陸目標移動
        if (this.landed && this.landingTarget) {
            this.position.x = lerp(this.position.x, this.landingTarget.x, 0.1);
            this.position.y = lerp(this.position.y, this.landingTarget.y, 0.1);
            return; // 不進行其他更新
        }
        // 正常的移動邏輯
        this.centerAttractionTimer++;
        if (this.centerAttractionTimer >= this.centerAttractionInterval) {
            let toCenter = p5.Vector.sub(createVector(width / 2, height / 2), this.position);
            this.targetAngle = toCenter.heading();
            this.centerAttractionTimer = 0;
        }
        if (frameCount % this.changeDirectionInterval === 0) {
            this.targetAngle = this.angle + random(-PI / 12, PI / 12);
            this.changeDirectionInterval = int(random(100, 300));
        }
        let boundary = 15;
        if (this.position.x > width - boundary || this.position.x < boundary ||
            this.position.y > height - boundary || this.position.y < boundary) {
            let toCenter = p5.Vector.sub(createVector(width / 2, height / 2), this.position);
            this.targetAngle = toCenter.heading();
            this.speed = this.baseSpeed;
        }
        this.angle = lerpAngle(this.angle, this.targetAngle, 0.01);
        let velocity = createVector(cos(this.angle), sin(this.angle)).mult(this.speed);
        this.position.add(velocity);
    }

    // 修改碰撞檢查，同時加入著陸行為
    checkHandCollision() {
        const collisionThreshold = 50;
        const lowSpeedThreshold = 2;
    
        if (window.handKeypoints && window.handKeypointsSpeed) {
            const video = document.getElementById('input-video');
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;
    
            for (let handIndex = 0; handIndex < window.handKeypoints.length; handIndex++) {
                const hand = window.handKeypoints[handIndex];
                const handSpeed = window.handKeypointsSpeed[handIndex];
                for (let kpIndex = 0; kpIndex < hand.length; kpIndex++) {
                    const kp = hand[kpIndex];
                    const speed = handSpeed[kpIndex];
                    const mapped = mapToCanvas(kp.x, kp.y, videoWidth, videoHeight); // 轉換成 Canvas 座標
    
                    let d = dist(this.position.x, this.position.y, mapped.x, mapped.y);
                    if (d < collisionThreshold) {
                        if (speed < lowSpeedThreshold) {
                            let offset = 30;
                            this.landingTarget = createVector(mapped.x, mapped.y - offset);
                            this.landed = true;
                            this.speed = 0;
                        } else {
                            this.landed = false;
                            let escapeAngle = atan2(this.position.y - mapped.y, this.position.x - mapped.x);
                            this.targetAngle = escapeAngle;
                            this.speed = this.maxEscapeSpeed;
                        }
                        return;
                    }
                }
            }
        }
        this.landed = false;
        this.speed = lerp(this.speed, this.baseSpeed, 0.05);
    }
    

    display() {
        push();
        translate(this.position.x, this.position.y);
        rotate(this.angle + HALF_PI);
        imageMode(CENTER);
        let offset = createVector(cos(this.angle) * 20, sin(this.angle) * 20);
        let headPosition = this.position.copy().add(offset);
        image(this.texture, headPosition.x - this.position.x, headPosition.y - this.position.y, window.innerWidth * 0.05, window.innerWidth * 0.05);
        pop();
    }
}

function lerpAngle(start, end, amt) {
    let diff = (end - start + PI) % TWO_PI - PI;
    return start + diff * amt;
}

// 映射 MediaPipe 座標到 Canvas 的函式
function mapToCanvas(x, y, videoWidth, videoHeight) {
    const canvasX = x / videoWidth * width;
    const canvasY = y / videoHeight * height;
    return { x: canvasX, y: canvasY };
}
