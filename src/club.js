import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Club {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.aimLine = null;        // 方向指示線
    this.aimDirection = new THREE.Vector3(0, 0, -1); // デフォルト方向
  }

  async load() {
    return new Promise((resolve) => {
      const loader = new GLTFLoader();
      loader.load(
        '/models/golf.glb',
        (gltf) => {
          this.mesh = gltf.scene;
          this.mesh.scale.set(0.1, 0.1, 0.1); // サイズ調整（5分の1に縮小）

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
          console.warn('golf.glb の読み込みに失敗。フォールバッククラブを使用します。');
          this._createFallbackClub();
          this._createAimLine();
          resolve();
        }
      );
    });
  }

  // GLBが読み込めない場合のフォールバック
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

  // 方向指示線（エイムライン）を作成
  _createAimLine() {
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    // 線のポイント配列で作る
    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -15),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    this.aimLine = new THREE.Line(geo, mat);
    this.scene.add(this.aimLine);
  }

  // クラブとエイムラインをボール周りに配置する
  update(ballPosition, aimDirection) {
    if (!this.mesh) return;

    this.aimDirection.copy(aimDirection).normalize();

    // クラブの位置：ボールの後ろに配置
    const clubOffset = this.aimDirection.clone().multiplyScalar(-1.2);
    this.mesh.position.set(
      ballPosition.x + clubOffset.x,
      ballPosition.y + 0.3,
      ballPosition.z + clubOffset.z
    );

    // クラブの向き（エイム方向へ）
    const angle = Math.atan2(this.aimDirection.x, this.aimDirection.z);
    this.mesh.rotation.set(0, angle, 0);

    // エイムライン更新
    if (this.aimLine) {
      this.aimLine.position.set(ballPosition.x, ballPosition.y + 0.05, ballPosition.z);
      this.aimLine.rotation.set(0, angle, 0);
    }
  }

  // ショット中はクラブとラインを숨す
  setVisible(v) {
    if (this.mesh) this.mesh.visible = v;
    if (this.aimLine) this.aimLine.visible = v;
  }
}
