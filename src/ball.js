import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { COURSE_CONFIG } from './course.js';

export class Ball {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.isMoving = false;

    // 物理パラメータ
    this.gravity = -25;
    this.friction = 0.995;       // 滑り摩擦
    this.rollFriction = 0.992;   // 転がり摩擦
    this.bounceDamping = 0.3;    // バウンス減衰
    this.radius = 0.2;

    // 初期位置
    this.startPos = new THREE.Vector3(
      COURSE_CONFIG.startOffset.x,
      1,
      COURSE_CONFIG.startOffset.z
    );
  }

  async load() {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        '/models/golfball.glb',
        (gltf) => {
          this.mesh = gltf.scene;
          this.mesh.scale.set(0.4, 0.4, 0.4); // サイズ調整
          this.mesh.position.copy(this.startPos);

          // 影を投げるように設定
          this.mesh.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          this.scene.add(this.mesh);
          resolve();
        },
        undefined,
        (err) => {
          console.warn('golfball.glb の読み込みに失敗。フォールバックボールを使用します。');
          this._createFallbackBall();
          resolve();
        }
      );
    });
  }

  // GLBが読み込めない場合のフォールバック
  _createFallbackBall() {
    const geo = new THREE.SphereGeometry(this.radius, 32, 32);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.position.copy(this.startPos);
    this.scene.add(this.mesh);
  }

  reset() {
    this.mesh.position.copy(this.startPos);
    this.velocity.set(0, 0, 0);
    this.isMoving = false;
  }

  // ショットを発射する
  shoot(direction, power) {
    if (this.isMoving) return;
    // directionは正規化済みのVector3、powerは 0~1
    const force = 60 * power; // 最大フォース
    this.velocity.set(
      direction.x * force,
      direction.y * force + 3, // 少し上に
      direction.z * force
    );
    this.isMoving = true;
  }

  // ホールに入ったか判定
  checkHole() {
    const hx = COURSE_CONFIG.holeOffset.x;
    const hz = COURSE_CONFIG.holeOffset.z;
    const dx = this.mesh.position.x - hx;
    const dz = this.mesh.position.z - hz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return dist < COURSE_CONFIG.holeRadius + this.radius * 0.5 && !this.isMoving;
  }

  // 範囲外に出たか判定
  isOutOfBounds() {
    const p = this.mesh.position;
    const half = COURSE_CONFIG.width / 2;
    return (
      p.x < -half || p.x > half ||
      p.z < -COURSE_CONFIG.depth / 2 || p.z > COURSE_CONFIG.depth / 2 ||
      p.y < -10
    );
  }

  // 物理シミュレーション更新
  update(dt, getHeight) {
    if (!this.isMoving) return;

    const pos = this.mesh.position;

    // 重力
    this.velocity.y += this.gravity * dt;

    // 位置更新
    pos.x += this.velocity.x * dt;
    pos.y += this.velocity.y * dt;
    pos.z += this.velocity.z * dt;

    // 地面との衝突
    const groundY = getHeight(pos.x, pos.z) + this.radius;

    if (pos.y <= groundY) {
      pos.y = groundY;

      // バウンス
      if (this.velocity.y < -1) {
        this.velocity.y *= -this.bounceDamping;
      } else {
        this.velocity.y = 0;
      }

      // 水平摩擦
      this.velocity.x *= this.rollFriction;
      this.velocity.z *= this.rollFriction;
    }

    // 転がりアニメーション（メッシュを回転させる）
    const speed = this.velocity.length();
    if (speed > 0.01) {
      const axis = new THREE.Vector3(-this.velocity.z, 0, this.velocity.x).normalize();
      const angle = (speed * dt) / this.radius;
      this.mesh.rotateOnWorldAxis(axis, angle);
    }

    // 停止判定
    if (speed < 0.15 && pos.y <= groundY + 0.05) {
      this.velocity.set(0, 0, 0);
      pos.y = groundY;
      this.isMoving = false;
    }
  }
}
