let fishArray = [];
const numFish = 20;
let fishTextures = [];
let leafImage;
let assetsLoaded = false;
const palmPolygonIndices = [0, 1, 2, 3, 5, 9, 13, 17, 0]; // 最後會自動封回 0


function preload() {
    let loadedCount = 0;
    const totalAssets = 30 + 1; // 30 魚 + 1 葉子

    for (let i = 1; i <= 30; i++) {
        loadImage(`./img/${i}.gif`,
            (img) => {
                fishTextures.push(img);
                loadedCount++;
                if (loadedCount === totalAssets) {
                    assetsLoaded = true;
                }
            },
            () => { console.warn(`魚圖載入失敗: ./img/${i}.gif`); }
        );
    }

    loadImage('./img/leaf.png',
        (img) => {
            leafImage = img;
            loadedCount++;
            if (loadedCount === totalAssets) {
                assetsLoaded = true;
            }
        },
        () => { console.warn("leaf.png 載入失敗"); }
    );
}



function setup() {
    const container = document.querySelector('#playpage .container');
    if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
        //console.warn('Container 未就緒，延遲 setup...');
        setTimeout(setup, 100); // 過100ms再試一次
        return;
    }

    const canvas = createCanvas(container.offsetWidth, container.offsetHeight);
    container.appendChild(canvas.elt);
    canvas.elt.setAttribute('willReadFrequently', 'true');

    // 生成魚的位置，確保不在「手部區域」
    for (let i = 0; i < numFish; i++) {
        let pos;
        let attempts = 0;
        do {
            pos = createVector(random(width), random(height * 0.7));
            attempts++;
            if (attempts > 100) break;
        } while (isInHand(pos.x, pos.y));
        fishArray.push(new Fish(pos.x, pos.y));
    }
    // 當視窗大小變動，重新調整 canvas 大小為 wall 的寬高
    function windowResized() {
        const container = document.querySelector('#playpage .container');
        resizeCanvas(container.offsetWidth, container.offsetHeight);
    }
    window.addEventListener('resize', windowResized);
}

function draw() {
    if (!assetsLoaded) return;
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

    clear();

    if (window.handKeypoints) {
        const video = document.getElementById('input-video');
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        for (let handIndex = 0; handIndex < window.handKeypoints.length; handIndex++) {
            let keypoints = window.handKeypoints[handIndex];

            // **計算手掌大小，作為遠近的參考**
            let palmWidth = dist(
                keypoints[0].x, keypoints[0].y,
                keypoints[9].x, keypoints[9].y
            ); // 以手腕(0)到中指根部(9)的距離作為尺度

            // 計算一個葉子縮放比例，根據手掌大小調整
            let scaleFactor = map(palmWidth, 50, 150, 0.5, 1.5, true);

            // **(1) 繪製手指與關節的葉子**
            for (let i = 0; i < keypoints.length; i++) {
                const kp = keypoints[i];
                const mapped = mapToCanvas(kp.x, kp.y, videoWidth, videoHeight);

                push();
                translate(mapped.x, mapped.y);
                imageMode(CENTER);
                let leafSize = random(28, 35) * scaleFactor;  // **根據遠近縮放**
                image(leafImage, 0, 0, leafSize, leafSize);
                pop();

                // 額外在關節之間插入一片葉子
                const extraLeafPairs = [
                    [8, 7], [7, 6], [6, 5],     // INDEX
                    [9, 10], [10, 11], [11, 12], // MIDDLE
                    [13, 14], [14, 15], [15, 16], // RING
                    [17, 18], [18, 19], [19, 20],  // PINKY
                    [0, 1], [1, 2], [2, 3], [3, 4]
                ];

                for (let [a, b] of extraLeafPairs) {
                    const kp1 = keypoints[a];
                    const kp2 = keypoints[b];
                    const mapped1 = mapToCanvas(kp1.x, kp1.y, videoWidth, videoHeight);
                    const mapped2 = mapToCanvas(kp2.x, kp2.y, videoWidth, videoHeight);

                    // 中點位置
                    const midX = (mapped1.x + mapped2.x) / 2;
                    const midY = (mapped1.y + mapped2.y) / 2;

                    // 葉子旋轉角度
                    const angle = atan2(mapped2.y - mapped1.y, mapped2.x - mapped1.x);

                    push();
                    translate(midX, midY);
                    rotate(angle);
                    imageMode(CENTER);
                    let leafSize = random(28, 35) * scaleFactor;
                    image(leafImage, 0, 0, leafSize, leafSize);
                    pop();
                }

            }
            for (let handIndex = 0; handIndex < window.handKeypoints.length; handIndex++) {
                const hand = window.handKeypoints[handIndex];
                const video = document.getElementById('input-video');
                const videoWidth = video.videoWidth;
                const videoHeight = video.videoHeight;

                let polygon = getPalmPolygonPoints(hand, videoWidth, videoHeight);

                // 自動封閉多邊形
                polygon.push(polygon[0]);

                let numRings = floor(map(scaleFactor, 0.5, 2.5, 3, 4)); // 根據遠近決定圈數
                let shrinkStep = 30 * scaleFactor;
                let shrinkAmounts = Array.from({ length: numRings }, (_, i) => i * shrinkStep);


                for (let ring = 0; ring < shrinkAmounts.length; ring++) {
                    let shrinked = shrinkPolygon(polygon.slice(0, -1), shrinkAmounts[ring]);
                    drawLeafAlongPolygon(shrinked, scaleFactor); // <== 加上 scaleFactor
                }

            }
        }
    }

    // 繪製魚
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
        this.maxEscapeSpeed = 10;
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
            this.position.y > height * 0.7 || this.position.y < boundary) {  // 限制 y 軸範圍
            let toCenter = p5.Vector.sub(createVector(width / 2, height / 2), this.position);
            this.targetAngle = toCenter.heading();
            this.speed = this.baseSpeed;
        }

        this.angle = lerpAngle(this.angle, this.targetAngle, 0.01);
        let velocity = createVector(cos(this.angle), sin(this.angle)).mult(this.speed);

        this.position.add(velocity);

        // **如果魚的 y 座標超過 height * 0.7，強制將它拉回**
        if (this.position.y > height * 0.7) {
            this.position.y = height * 0.7;
            this.targetAngle = -HALF_PI; // 讓魚朝上游
        }
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

function getPalmPolygonPoints(hand, videoWidth, videoHeight) {
    return palmPolygonIndices.map(index => {
        const kp = hand[index];
        return mapToCanvas(kp.x, kp.y, videoWidth, videoHeight);
    });
}

function drawLeafAlongPolygon(points, scaleFactor = 1) {
    for (let i = 0; i < points.length - 1; i++) {
        let p1 = points[i];
        let p2 = points[i + 1];
        let distance = dist(p1.x, p1.y, p2.x, p2.y);
        let count = int(distance / 15); // 每 15px 放一片葉子

        for (let j = 0; j <= count; j++) {
            let t = j / count;
            let x = lerp(p1.x, p2.x, t);
            let y = lerp(p1.y, p2.y, t);
            let angle = atan2(p2.y - p1.y, p2.x - p1.x);

            push();
            translate(x, y);
            rotate(angle);
            imageMode(CENTER);
            let leafSize = random(28, 35) * scaleFactor;
            image(leafImage, 0, 0, leafSize, leafSize);
            pop();
        }
    }
}

function shrinkPolygon(points, amount) {
    // 取得中心點
    let center = points.reduce((acc, p) => {
        return createVector(acc.x + p.x, acc.y + p.y);
    }, createVector(0, 0)).div(points.length);

    // 每個點往中心縮
    return points.map(p => {
        let dir = createVector(p.x - center.x, p.y - center.y);
        dir.setMag(dir.mag() - amount);
        return createVector(center.x + dir.x, center.y + dir.y);
    });
}
