import * as THREE from 'three';

// コース設定
export const COURSE_CONFIG = {
  width: 200,
  depth: 200,
  segments: 200,
  maxHeight: 4,
  greenRadius: 8,
  holeRadius: 0.25,
  startOffset: { x: 0, z: 85 },
  holeOffset: { x: 0, z: -80 },
};

export function createCourse(scene, seed = 42) {
  // ── ベースの平面（フラット） ──
  const baseGeo = new THREE.PlaneGeometry(
    COURSE_CONFIG.width,
    COURSE_CONFIG.depth,
    2, 2
  );
  baseGeo.rotateX(-Math.PI / 2);
  
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x4a7c3a,
    roughness: 0.95,
    metalness: 0.0,
  });
  
  const terrain = new THREE.Mesh(baseGeo, baseMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ── コースレイアウト（壁と通路）──
  // 壁のマテリアル
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x8B4513, // 茶色
    roughness: 0.7,
  });

  const walls = [];

  // スタート地点の囲い（U字型）
  walls.push(createWall(scene, -15, 85, 30, 2, wallMat)); // 左壁
  walls.push(createWall(scene, 15, 85, 30, 2, wallMat));  // 右壁
  walls.push(createWall(scene, 0, 70, 2, 30, wallMat));   // 前壁

  // 最初の通路（狭い）
  walls.push(createWall(scene, -10, 50, 40, 2, wallMat)); // 左壁
  walls.push(createWall(scene, 10, 50, 40, 2, wallMat));  // 右壁

  // L字カーブ（右に曲がる）
  walls.push(createWall(scene, 10, 30, 2, 20, wallMat));  // 右縦壁
  walls.push(createWall(scene, 25, 20, 30, 2, wallMat));  // 右横壁
  walls.push(createWall(scene, -10, 20, 2, 20, wallMat)); // 左縦壁

  // 中間の広場（バンパー配置）
  walls.push(createWall(scene, 40, 10, 2, 20, wallMat));
  walls.push(createWall(scene, -10, 10, 2, 20, wallMat));
  
  // 中央のバンパー（三角配置）
  walls.push(createWall(scene, 15, 5, 8, 2, wallMat));
  walls.push(createWall(scene, 15, -5, 8, 2, wallMat));

  // 最後の通路（ジグザグ）
  walls.push(createWall(scene, 40, -10, 2, 20, wallMat));
  walls.push(createWall(scene, 25, -20, 30, 2, wallMat));
  walls.push(createWall(scene, 10, -30, 2, 20, wallMat));
  walls.push(createWall(scene, -5, -40, 30, 2, wallMat));
  walls.push(createWall(scene, -20, -50, 2, 20, wallMat));

  // ゴール地点の囲い
  walls.push(createWall(scene, -15, -70, 20, 2, wallMat));
  walls.push(createWall(scene, 15, -70, 20, 2, wallMat));
  walls.push(createWall(scene, 0, -90, 2, 20, wallMat));

  // ── ゴールの穴 ──
  // 白いリング（カップの縁）
  const ringGeo = new THREE.RingGeometry(COURSE_CONFIG.holeRadius, COURSE_CONFIG.holeRadius + 0.05, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(COURSE_CONFIG.holeOffset.x, 0.02, COURSE_CONFIG.holeOffset.z);
  scene.add(ring);

  // 穴の内部（黒い円筒）
  const holeGeo = new THREE.CylinderGeometry(COURSE_CONFIG.holeRadius, COURSE_CONFIG.holeRadius * 0.9, 0.5, 32);
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
  const holeMesh = new THREE.Mesh(holeGeo, holeMat);
  holeMesh.position.set(COURSE_CONFIG.holeOffset.x, -0.25, COURSE_CONFIG.holeOffset.z);
  scene.add(holeMesh);

  // ── フラグポール ──
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 8, 8);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0xffff00 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(COURSE_CONFIG.holeOffset.x, 4, COURSE_CONFIG.holeOffset.z);
  pole.castShadow = true;
  scene.add(pole);

  // フラグ布
  const flagGeo = new THREE.PlaneGeometry(2.5, 1.5);
  const flagMat = new THREE.MeshLambertMaterial({ color: 0xff0000, side: THREE.DoubleSide });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(COURSE_CONFIG.holeOffset.x + 1.25, 7.2, COURSE_CONFIG.holeOffset.z);
  flag.rotation.y = Math.PI / 4;
  scene.add(flag);

  return { terrain, holeMesh, pole, flag, walls };
}

// 壁を作成するヘルパー関数
function createWall(scene, x, z, width, depth, material) {
  const height = 3;
  const wallGeo = new THREE.BoxGeometry(width, height, depth);
  const wall = new THREE.Mesh(wallGeo, material);
  wall.position.set(x, height / 2, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  
  // 物理用のバウンディングボックス（ボールの衝突判定に使う）
  wall.userData.isWall = true;
  wall.userData.box = new THREE.Box3().setFromObject(wall);
  
  scene.add(wall);
  return wall;
}

// 地形の高さを取得（フラットなので常に0を返す）
export function getTerrainHeight(terrain, x, z) {
  // 範囲外チェック
  const halfW = COURSE_CONFIG.width / 2;
  const halfD = COURSE_CONFIG.depth / 2;
  if (x < -halfW || x > halfW || z < -halfD || z > halfD) {
    return -10; // 範囲外は深い穴
  }
  return 0; // フラットな地面
}

// 壁との衝突判定
export function checkWallCollision(walls, ballPos, ballRadius, ballVelocity) {
  const ballBox = new THREE.Box3(
    new THREE.Vector3(ballPos.x - ballRadius, ballPos.y - ballRadius, ballPos.z - ballRadius),
    new THREE.Vector3(ballPos.x + ballRadius, ballPos.y + ballRadius, ballPos.z + ballRadius)
  );

  for (const wall of walls) {
    if (wall.userData.box.intersectsBox(ballBox)) {
      // 衝突した！跳ね返り方向を計算
      const wallCenter = new THREE.Vector3();
      wall.userData.box.getCenter(wallCenter);
      
      // ボールから壁の中心へのベクトル
      const normal = new THREE.Vector3().subVectors(ballPos, wallCenter);
      normal.y = 0; // 水平成分のみ
      normal.normalize();
      
      // 反射ベクトルを計算（入射角 = 反射角）
      const dot = ballVelocity.dot(normal);
      ballVelocity.x -= 2 * dot * normal.x;
      ballVelocity.z -= 2 * dot * normal.z;
      
      // エネルギー損失（跳ね返りで少し減速）
      ballVelocity.multiplyScalar(0.8);
      
      // ボールを壁の外に押し出す
      ballPos.add(normal.multiplyScalar(0.2));
      
      return true;
    }
  }
  return false;
}
