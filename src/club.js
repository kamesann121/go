import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Club {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.aimLine = null;
    this.aimDirection = new THREE.Vector3(0, 0, -1);
  }

  async load() {
    return new Promise((resolve) => {
      const loader = new GLTFLoader();
      loader.load(
        '/models/golf.glb',
        (gltf) => {
          this.mesh = gltf.scene;
          this.mesh.scale.set(0.02, 0.02, 0.02);

          this.mesh.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
            }
          });

          this.scene.add(this.mesh);
          this._createAimLine();
          resolve();
        },
        undefined,
        () => {
          console.warn('棒状モデルの読み込みに失敗。フォールバックを使用します。');
          this._createFallbackClub();
          this._createAimLine();
          resolve();
        }
      );
    });
  }

  _createFallbackClub() {
    const group = new THREE.Group();

    // シャフト
    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8);
    const shaftMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 0.9;
    shaft.castShadow = true;
    group.add(shaft);

    // ヘッド
    const headGeo = new THREE.BoxGeometry(0.3, 0.15, 0.22);
    const headMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 0.05, -0.1);
    head.castShadow = true;
    group.add(head);

    this.mesh = group;
    this.scene.add(this.mesh);
  }

  _createAimLine() {
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -15),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    this.aimLine = new THREE.Line(geo, mat);
    this.scene.add(this.aimLine);
  }

  // クラブとエイムラインをボール周りに配置（エイム方向に完全一致）
  update(ballPosition, aimDirection) {
    if (!this.mesh) return;

    this.aimDirection.copy(aimDirection).normalize();

    // クラブの位置：ボールの後ろ＋少し上
    const clubOffset = this.aimDirection.clone().multiplyScalar(-1.2);
    this.mesh.position.set(
      ballPosition.x + clubOffset.x,
      ballPosition.y + 0.5,  // 地面から少し浮かせる
      ballPosition.z + clubOffset.z
    );

    // クラブの向き：エイム方向を向く
    // Y軸周りの角度を計算
    const angleY = Math.atan2(this.aimDirection.x, this.aimDirection.z);
    
    // クラブをリセットしてから正しい向きに
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.rotation.y = angleY;
    
    // 少し傾ける（ドライバーっぽく）
    this.mesh.rotation.x = -0.3; // 前傾

    // エイムライン更新
    if (this.aimLine) {
      this.aimLine.position.set(ballPosition.x, ballPosition.y + 0.05, ballPosition.z);
      this.aimLine.rotation.set(0, angleY, 0);
    }
  }

  setVisible(v) {
    if (this.mesh) this.mesh.visible = v;
    if (this.aimLine) this.aimLine.visible = v;
  }
}
