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
    this.gravity = -20;
    this.friction = 0.98;
    this.rollFriction = 0.985;
    this.bounceDamping = 0.4;
    this.radius = 0.2;
    this.minVelocity = 0.05;

    // 初期位置
    this.startPos = new THREE.Vector3(
      COURSE_CONFIG.startOffset.x,
      1,
      COURSE_CONFIG.startOffset.z
    );
    
    // 実際の物理位置（mesh.position とは独立）
    this.physicsPosition = this.startPos.clone();
  }

  async load() {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        '/models/golfball.glb',
        (gltf) => {
          this.mesh = gltf.scene;
          this.mesh.scale.set(0.015, 0.015, 0.015);
          this.mesh.position.copy(this.startPos);

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
          console.warn('球体モデルの読み込みに失敗。フォールバックを使用します。');
          this._createFallbackBall();
          resolve();
        }
      );
    });
  }

  _createFallbackBall() {
    const geo = new THREE.SphereGeometry(this.radius, 32, 32);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.position.copy(this.startPos);
    this.scene.add(this.mesh);
  }

  reset() {
    this.physicsPosition.copy(this.startPos);
    this.mesh.position.copy(this.startPos);
    this.mesh.rotation.set(0, 0, 0);
    this.velocity.set(0, 0, 0);
    this.isMoving = false;
  }

  shoot(direction, power) {
    if (this.isMoving) return;
    const force = 60 * power;
    this.velocity.set(
      direction.x * force,
      direction.y * force + 3,
      direction.z * force
    );
    this.isMoving = true;
  }

  checkHole() {
    const hx = COURSE_CONFIG.holeOffset.x;
    const hz = COURSE_CONFIG.holeOffset.z;
    const dx = this.physicsPosition.x - hx;
    const dz = this.physicsPosition.z - hz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return dist < COURSE_CONFIG.holeRadius + this.radius * 0.5 && !this.isMoving;
  }

  isOutOfBounds() {
    const p = this.physicsPosition;
    const half = COURSE_CONFIG.width / 2;
    return (
      p.x < -half || p.x > half ||
      p.z < -COURSE_CONFIG.depth / 2 || p.z > COURSE_CONFIG.depth / 2 ||
      p.y < -10
    );
  }

  update(dt, getHeight, walls) {
    if (!this.isMoving) return;

    // 重力
    this.velocity.y += this.gravity * dt;

    // 位置更新（物理位置を使う）
    this.physicsPosition.x += this.velocity.x * dt;
    this.physicsPosition.y += this.velocity.y * dt;
    this.physicsPosition.z += this.velocity.z * dt;

    // 壁との衝突判定
    if (walls && walls.length > 0) {
      for (const wall of walls) {
        if (!wall.userData || !wall.userData.box) continue;
        
        const ballBox = new THREE.Box3(
          new THREE.Vector3(
            this.physicsPosition.x - this.radius,
            this.physicsPosition.y - this.radius,
            this.physicsPosition.z - this.radius
          ),
          new THREE.Vector3(
            this.physicsPosition.x + this.radius,
            this.physicsPosition.y + this.radius,
            this.physicsPosition.z + this.radius
          )
        );
        
        if (wall.userData.box.intersectsBox(ballBox)) {
          const wallCenter = new THREE.Vector3();
          wall.userData.box.getCenter(wallCenter);
          
          const normal = new THREE.Vector3().subVectors(this.physicsPosition, wallCenter);
          normal.y = 0;
          normal.normalize();
          
          const dot = this.velocity.dot(normal);
          this.velocity.x -= 2 * dot * normal.x;
          this.velocity.z -= 2 * dot * normal.z;
          this.velocity.multiplyScalar(0.75);
          
          this.physicsPosition.add(normal.multiplyScalar(0.3));
        }
      }
    }

    // 地面との衝突
    const groundY = getHeight(this.physicsPosition.x, this.physicsPosition.z) + this.radius;

    if (this.physicsPosition.y <= groundY) {
      this.physicsPosition.y = groundY;

      if (Math.abs(this.velocity.y) > 0.5) {
        this.velocity.y *= -this.bounceDamping;
      } else {
        this.velocity.y = 0;
      }

      this.velocity.x *= this.rollFriction;
      this.velocity.z *= this.rollFriction;
    } else {
      this.velocity.x *= this.friction;
      this.velocity.z *= this.friction;
    }

    // メッシュ位置を物理位置に同期
    this.mesh.position.copy(this.physicsPosition);

    // 転がりアニメーションは一旦オフ（回転が位置に影響する可能性があるため）
    // const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
    // if (speed > 0.01) {
    //   const axis = new THREE.Vector3(-this.velocity.z, 0, this.velocity.x).normalize();
    //   const angle = (speed * dt) / this.radius;
    //   this.mesh.rotateOnWorldAxis(axis, angle);
    // }

    // 停止判定
    const totalSpeed = this.velocity.length();
    if (totalSpeed < this.minVelocity && Math.abs(this.physicsPosition.y - groundY) < 0.01) {
      this.velocity.set(0, 0, 0);
      this.physicsPosition.y = groundY;
      this.mesh.position.copy(this.physicsPosition);
      this.isMoving = false;
    }
  }
}
