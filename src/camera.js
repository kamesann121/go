import * as THREE from 'three';

export class CameraController {
  constructor(camera) {
    this.camera = camera;

    // 現在の軌道パラメータ
    this.spherical = new THREE.Spherical(40, Math.PI / 3.5, 0); // radius, phi, theta
    this.target = new THREE.Vector3(0, 0, 0);       // 見る先のポイント
    this.currentTarget = new THREE.Vector3(0, 0, 0); // スムーズに補間中のポイント

    // ドラッグ状態
    this.isDragging = false;
    this.prevMouse = { x: 0, y: 0 };

    this._bindEvents();
  }

  _bindEvents() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('mousedown', (e) => {
      // 左クリック or 右クリック どちらでもドラッグ可
      this.isDragging = true;
      this.prevMouse.x = e.clientX;
      this.prevMouse.y = e.clientY;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouse.x;
      const dy = e.clientY - this.prevMouse.y;

      // theta（左右回転）
      this.spherical.theta -= dx * 0.005;
      // phi（上下回転）
      this.spherical.phi = Math.max(0.2, Math.min(Math.PI / 2.2, this.spherical.phi + dy * 0.005));

      this.prevMouse.x = e.clientX;
      this.prevMouse.y = e.clientY;
    });

    canvas.addEventListener('mouseup', () => { this.isDragging = false; });
    canvas.addEventListener('mouseleave', () => { this.isDragging = false; });

    // スクロールでズーム
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.spherical.radius = Math.max(15, Math.min(80, this.spherical.radius + e.deltaY * 0.04));
    }, { passive: false });
  }

  // 見る先をセットする（ボールの位置を毎フレーム渡す）
  setTarget(pos) {
    this.target.copy(pos);
  }

  update() {
    // target を滑らかに補間
    this.currentTarget.lerp(this.target, 0.06);

    // Spherical → Cartesian で実際のカメラ位置を計算
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.currentTarget).add(offset);
    this.camera.lookAt(this.currentTarget);
  }
}
