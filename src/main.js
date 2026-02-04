import { createScene } from './scene.js';
import { createCourse, getTerrainHeight, COURSE_CONFIG } from './course.js';
import { Ball } from './ball.js';
import { Club } from './club.js';
import { CameraController } from './camera.js';
import { InputController } from './input.js';

// ── UI要素 ──
const shotCountEl = document.querySelector('#shot-info p');
const clearMessage = document.getElementById('clear-message');
const clearShotsText = document.getElementById('clear-shots-text');
const nextHoleBtn = document.getElementById('next-hole-btn');

// ── シーン初期化 ──
const { scene, camera, renderer } = createScene();

// ── コース生成 ──
let courseSeed = 42;
let courseObjects = createCourse(scene, courseSeed);

// ── ボール・クラブ ──
const ball = new Ball(scene);
const club = new Club(scene);

// ── カメラ ──
const cameraCtrl = new CameraController(camera);
cameraCtrl.setTarget(ball.startPos);

// ── 入力 ──
let inputCtrl = null; // Ball・Club が loaded になってから初期化

// ── ショット카운タ ──
let shotCount = 0;

// ── 高さ取得用のキャッシュ済みヘルパー ──
function getHeight(x, z) {
  return getTerrainHeight(courseObjects.terrain, x, z);
}

// ── ホール完了処理 ──
function onHoleClear() {
  clearShotsText.textContent = `Shots: ${shotCount}`;
  clearMessage.style.display = 'block';
}

// ── 次のホール ──
function nextHole() {
  // 古いコースを削除
  scene.remove(courseObjects.terrain);
  scene.remove(courseObjects.holeMesh);
  scene.remove(courseObjects.pole);
  scene.remove(courseObjects.flag);
  courseObjects.walls.forEach(w => scene.remove(w));

  // 新しいコース生成（同じレイアウト）
  courseObjects = createCourse(scene, courseSeed);

  // ボールリセット
  ball.reset();
  shotCount = 0;
  shotCountEl.textContent = '0';
  clearMessage.style.display = 'none';

  // カメラリセット
  cameraCtrl.setTarget(ball.startPos);
}

nextHoleBtn.addEventListener('click', nextHole);

// ── ショット発火のインタセプト ──
// InputController の _fireShot で shot が発火されたことを検知するため、
// ball の shoot をラップする
const originalShoot = ball.shoot.bind(ball);
ball.shoot = function (dir, power) {
  originalShoot(dir, power);
  shotCount++;
  shotCountEl.textContent = String(shotCount);
};

// ── メインロード ──
async function init() {
  await ball.load();
  await club.load();

  // Input は Ball・Club loaded 後に初期化
  inputCtrl = new InputController(ball, club, cameraCtrl);

  // ── アニメーションループ ──
  let lastTime = performance.now();

  function loop() {
    requestAnimationFrame(loop);

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05); // 最大50ms cap
    lastTime = now;

    // 物理更新
    ball.update(dt, getHeight, courseObjects.walls);

    // 範囲外チェック → リセット
    if (ball.isOutOfBounds()) {
      ball.reset();
      // ショット数は減らさない（ペナルティとして +1 はすでに加わっている）
    }

    // ホール完了チェック
    if (ball.checkHole()) {
      onHoleClear();
    }

    // ボールが止まったらクラブを表示に戻す
    if (!ball.isMoving) {
      club.setVisible(true);
    }

    // カメラ追随
    if (ball.mesh) {
      cameraCtrl.setTarget(ball.mesh.position);
    }
    cameraCtrl.update();

    // 入力更新（パワーチャージ・クラブ位置）
    if (inputCtrl) inputCtrl.update(dt);

    // 描画
    renderer.render(scene, camera);
  }

  loop();
}

init();
