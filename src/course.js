import * as THREE from 'three';
import { SimplexNoise } from 'simplex-noise';

// コース設定
export const COURSE_CONFIG = {
  width: 200,
  depth: 200,
  segments: 200,
  maxHeight: 4,
  greenRadius: 8,       // グリーン半径
  holeRadius: 0.25,     // ホール半径
  startOffset: { x: 0, z: 80 },   // ボール開始位置
  holeOffset: { x: 0, z: -70 },   // ホール位置
};

export function createCourse(scene, seed = 42) {
  const simplex = new SimplexNoise(seed);

  // ── 地形ジオメトリ ──
  const geo = new THREE.PlaneGeometry(
    COURSE_CONFIG.width,
    COURSE_CONFIG.depth,
    COURSE_CONFIG.segments,
    COURSE_CONFIG.segments
  );
  geo.rotateX(-Math.PI / 2); // 水平にする

  const posArr = geo.attributes.position;
  const colorArr = [];

  for (let i = 0; i < posArr.count; i++) {
    let x = posArr.getX(i);
    let z = posArr.getZ(i);

    // グリーン領域の距離チェック
    const dx = x - COURSE_CONFIG.holeOffset.x;
    const dz = z - COURSE_CONFIG.holeOffset.z;
    const distToHole = Math.sqrt(dx * dx + dz * dz);

    // ボール開始位置の周りもフラット
    const sx = x - COURSE_CONFIG.startOffset.x;
    const sz = z - COURSE_CONFIG.startOffset.z;
    const distToStart = Math.sqrt(sx * sx + sz * sz);

    let y = 0;

    if (distToHole < COURSE_CONFIG.greenRadius || distToStart < 4) {
      // グリーン・スタート領域はフラット
      y = 0;
    } else {
      // ノイズで地形を生成
      const nx = x / 60;
      const nz = z / 60;
      y = simplex.noise2D(nx, nz) * COURSE_CONFIG.maxHeight;

      // グリーンの外側を滑らかにブレンド（エッジが急にならないように）
      const blendDist = 5;
      if (distToHole < COURSE_CONFIG.greenRadius + blendDist) {
        const t = (distToHole - COURSE_CONFIG.greenRadius) / blendDist;
        y *= t;
      }
      if (distToStart < 4 + blendDist) {
        const t = (distToStart - 4) / blendDist;
        y *= t;
      }
    }

    posArr.setY(i, y);

    // ── 頂点カラー（芝の色を高さで変える） ──
    let r, g, b;
    if (distToHole < COURSE_CONFIG.greenRadius) {
      // グリーン：濃い緑
      r = 0.12; g = 0.55; b = 0.15;
    } else if (y > 1.5) {
      // 高い場所：岩・砂地
      r = 0.55; g = 0.50; b = 0.38;
    } else if (y < -0.8) {
      // 低い場所：水
      r = 0.15; g = 0.35; b = 0.60;
    } else {
      // 通常の芝
      const t = (y + COURSE_CONFIG.maxHeight) / (COURSE_CONFIG.maxHeight * 2);
      r = 0.18 + t * 0.12;
      g = 0.50 + t * 0.12;
      b = 0.10 + t * 0.05;
    }
    colorArr.push(r, g, b);
  }

  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colorArr), 3));
  geo.computeVertexNormals();

  // ── マテリアル ──
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  });

  const terrain = new THREE.Mesh(geo, mat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ── ホールの穴（黒い円） ──
  const holeGeo = new THREE.CircleGeometry(COURSE_CONFIG.holeRadius, 32);
  holeGeo.rotateX(-Math.PI / 2);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const holeMesh = new THREE.Mesh(holeGeo, holeMat);
  holeMesh.position.set(
    COURSE_CONFIG.holeOffset.x,
    0.01,
    COURSE_CONFIG.holeOffset.z
  );
  scene.add(holeMesh);

  // ── フラグポール ──
  const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 3, 8);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(
    COURSE_CONFIG.holeOffset.x,
    1.5,
    COURSE_CONFIG.holeOffset.z
  );
  pole.castShadow = true;
  scene.add(pole);

  // フラグ布
  const flagGeo = new THREE.PlaneGeometry(1.2, 0.7);
  const flagMat = new THREE.MeshLambertMaterial({ color: 0xff3333, side: THREE.DoubleSide });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(
    COURSE_CONFIG.holeOffset.x + 0.6,
    2.85,
    COURSE_CONFIG.holeOffset.z
  );
  flag.rotation.y = Math.PI / 4;
  scene.add(flag);

  return { terrain, holeMesh, pole, flag };
}

// 地形の高さを特定の (x, z) で取得する関数
export function getTerrainHeight(terrain, x, z) {
  const pos = terrain.geometry.attributes.position;
  let closestDist = Infinity;
  let closestY = 0;

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    const dist = (vx - x) ** 2 + (vz - z) ** 2;
    if (dist < closestDist) {
      closestDist = dist;
      closestY = pos.getY(i);
    }
  }
  return closestY;
}
