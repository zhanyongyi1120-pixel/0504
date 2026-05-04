let capture;
let faceMesh;
let faces = [];
let stars = [];
let maskLayer; // 遮罩圖層，確保挖洞後透出的是攝影機而非白色背景

function setup() {
  createCanvas(windowWidth, windowHeight);

  // 1. 建立虛擬圖層 (Graphics Layer) 用於繪製遮罩
  maskLayer = createGraphics(windowWidth, windowHeight);

  // 2. 攝影機設定：針對行動裝置優化前鏡頭
  const constraints = {
    video: {
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 }
    }
  };
  capture = createCapture(constraints);
  capture.hide(); 

  // 3. 初始化背景星空座標
  for (let i = 0; i < 300; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(1, 3),
      brightness: random(100, 255)
    });
  }

  // 4. 初始化 ml5 FaceMesh
  faceMesh = ml5.facemesh(capture, () => console.log("AR System Ready"));
  faceMesh.on('predict', results => faces = results);
}

function draw() {
  background(0); 

  // --- 步驟 A：計算自動縮放與對齊 ---
  let aspect = capture.width / capture.height;
  let imgWidth, imgHeight;
  if (width / height > aspect) {
    imgWidth = width;
    imgHeight = width / aspect;
  } else {
    imgHeight = height;
    imgWidth = height * aspect;
  }

  // --- 步驟 B：底層 - 繪製真實攝影機影像 ---
  push();
  translate(width / 2, height / 2);
  scale(-1, 1); // 鏡像處理
  imageMode(CENTER);
  image(capture, 0, 0, imgWidth, imgHeight);
  pop();

  if (faces.length > 0 && capture.width > 0) {
    let keypoints = faces[0].scaledMesh;

    // 定義特徵點位
    let silhouette = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
    let rightEye = [130, 247, 30, 29, 27, 28, 56, 190, 243, 112, 26, 22, 23, 24, 110, 25];
    let leftEye = [463, 341, 256, 252, 253, 254, 339, 255, 359, 467, 260, 259, 257, 258, 286, 414];
    let lips = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 61];

    // --- 步驟 C：製作挖洞遮罩 ---
    maskLayer.clear();
    maskLayer.background(0); // 黑色遮蔽背景
    
    // 繪製星星到遮罩圖層
    for (let s of stars) {
      maskLayer.fill(255, s.brightness);
      maskLayer.noStroke();
      maskLayer.circle(s.x, s.y, s.size);
    }

    // 關鍵：在黑色圖層挖出臉部的洞
    maskLayer.push();
    maskLayer.translate(maskLayer.width / 2, maskLayer.height / 2);
    maskLayer.scale(-1, 1);
    maskLayer.erase();
    maskLayer.beginShape();
    for (let i of silhouette) {
      let p = keypoints[i];
      let x = map(p[0], 0, capture.width, -imgWidth / 2, imgWidth / 2);
      let y = map(p[1], 0, capture.height, -imgHeight / 2, imgHeight / 2);
      maskLayer.vertex(x, y);
    }
    maskLayer.endShape(CLOSE);
    maskLayer.noErase();
    maskLayer.pop();

    // 把處理好的遮罩貼到畫布上
    imageMode(CORNER);
    image(maskLayer, 0, 0);

    // --- 步驟 D：頂層 - 疊加彩色霓虹線條 ---
    push();
    translate(width / 2, height / 2);
    scale(-1, 1);
    
    // 更改這裡的 color() 即可換色
    // 臉部輪廓：桃紅色 (255, 0, 255)
    drawNeonLine(keypoints, silhouette, imgWidth, imgHeight, color(255, 0, 255));
    
    // 五官線條：青藍色 (0, 255, 255)
    strokeWeight(2);
    drawSimpleLine(keypoints, rightEye, imgWidth, imgHeight, color(0, 255, 255));
    drawSimpleLine(keypoints, leftEye, imgWidth, imgHeight, color(0, 255, 255));
    drawSimpleLine(keypoints, lips, imgWidth, imgHeight, color(0, 255, 255));
    pop();

  } else {
    // 沒偵測到臉時，顯示全螢幕星空背景
    drawSpaceBackground();
  }
}

// 基礎星空繪製函式
function drawSpaceBackground() {
  fill(0);
  noStroke();
  rect(0, 0, width, height);
  for (let s of stars) {
    fill(255, s.brightness);
    circle(s.x, s.y, s.size);
  }
}

// 霓虹發光線條
function drawNeonLine(keypoints, indices, imgW, imgH, clr) {
  for (let i = 0; i < indices.length; i++) {
    let next = (i + 1) % indices.length;
    let p1 = keypoints[indices[i]], p2 = keypoints[indices[next]];
    let x1 = map(p1[0], 0, capture.width, -imgW / 2, imgW / 2);
    let y1 = map(p1[1], 0, capture.height, -imgH / 2, imgH / 2);
    let x2 = map(p2[0], 0, capture.width, -imgW / 2, imgW / 2);
    let y2 = map(p2[1], 0, capture.height, -imgH / 2, imgH / 2);

    strokeWeight(12); stroke(red(clr), green(clr), blue(clr), 60); line(x1, y1, x2, y2);
    strokeWeight(2);  stroke(255); line(x1, y1, x2, y2);
  }
}

// 基礎線條繪製
function drawSimpleLine(keypoints, indices, imgW, imgH, clr) {
  stroke(clr);
  noFill();
  for (let i = 0; i < indices.length; i++) {
    let next = (i + 1) % indices.length;
    let p1 = keypoints[indices[i]], p2 = keypoints[indices[next]];
    line(
      map(p1[0], 0, capture.width, -imgW / 2, imgW / 2),
      map(p1[1], 0, capture.height, -imgH / 2, imgH / 2),
      map(p2[0], 0, capture.width, -imgW / 2, imgW / 2),
      map(p2[1], 0, capture.height, -imgH / 2, imgH / 2)
    );
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  maskLayer.resizeCanvas(windowWidth, windowHeight);
}