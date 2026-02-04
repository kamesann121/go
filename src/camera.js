import * as THREE from 'three';

export class CameraController {
  constructor(camera) {
    this.camera = camera;

    // 軌道パラメータ
    this.spherical = new THREE.Spherical(40, Math.PI / 3.5, 0);
    this.target = new THREE.Vector3(0, 0, 0);
    this.currentTarget = new THREE.Vector3(0, 0, 0);

    // マウス
    this.isDragging = false;
    this.prevMouse = { x: 0, y: 0 };

    // タッチ
    this.prevTouches = {};
    this.activeTouchCount = 0;
    this.prevPinchDist = null;

    this._bindMouseEvents();
    this._bindTouchEvents();
  }

  // ── マウス ──
  _bindMouseEvents() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    // 右クリックドラッグでカメラ回転
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) { // 右クリック
        this.isDragging = true;
        this.prevMouse.x = e.clientX;
        this.prevMouse.y = e.clientY;
      }
    });
    
    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this._applyOrbit(e.clientX - this.prevMouse.x, e.clientY - this.prevMouse.y);
      this.prevMouse.x = e.clientX;
      this.prevMouse.y = e.clientY;
    });
    
    canvas.addEventListener('mouseup', () => { this.isDragging = false; });
    canvas.addEventListener('mouseleave', () => { this.isDragging = false; });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._applyZoom(e.deltaY * 0.04);
    }, { passive: false });
    
    // 矢印キーでカメラ回転
    window.addEventListener('keydown', (e) => {
      const speed = 3;
      if (e.key === 'ArrowLeft') this.spherical.theta -= 0.05;
      if (e.key === 'ArrowRight') this.spherical.theta += 0.05;
      if (e.key === 'ArrowUp') this.spherical.phi = Math.max(0.2, this.spherical.phi - 0.05);
      if (e.key === 'ArrowDown') this.spherical.phi = Math.min(Math.PI / 2.2, this.spherical.phi + 0.05);
    });
  }

  // ── タッチ ──
  _bindTouchEvents() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        this.prevTouches[t.identifier] = { x: t.clientX, y: t.clientY };
        this.activeTouchCount++;
      }
      if (this.activeTouchCount >= 2) this.prevPinchDist = this._pinchDist();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();

      // 1指スワイプ → カメラ回転
      if (this.activeTouchCount === 1) {
        const t = e.changedTouches[0];
        const prev = this.prevTouches[t.identifier];
        if (prev) {
          this._applyOrbit(t.clientX - prev.x, t.clientY - prev.y);
        }
      }

      // 2指 → ピンチズーム
      if (this.activeTouchCount >= 2) {
        for (const t of e.changedTouches) {
          this.prevTouches[t.identifier] = { x: t.clientX, y: t.clientY };
        }
        const dist = this._pinchDist();
        if (this.prevPinchDist !== null) {
          this._applyZoom((this.prevPinchDist - dist) * 0.08);
        }
        this.prevPinchDist = dist;
        return;
      }

      // 1指の位置を更新
      for (const t of e.changedTouches) {
        this.prevTouches[t.identifier] = { x: t.clientX, y: t.clientY };
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        delete this.prevTouches[t.identifier];
        this.activeTouchCount = Math.max(0, this.activeTouchCount - 1);
      }
      if (this.activeTouchCount < 2) this.prevPinchDist = null;
    }, { passive: false });

    canvas.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.prevTouches = {};
      this.activeTouchCount = 0;
      this.prevPinchDist = null;
    }, { passive: false });
  }

  _applyOrbit(dx, dy) {
    this.spherical.theta -= dx * 0.005;
    this.spherical.phi = Math.max(0.2, Math.min(Math.PI / 2.2, this.spherical.phi + dy * 0.005));
  }

  _applyZoom(delta) {
    this.spherical.radius = Math.max(15, Math.min(80, this.spherical.radius + delta));
  }

  _pinchDist() {
    const ids = Object.keys(this.prevTouches);
    if (ids.length < 2) return 0;
    const a = this.prevTouches[ids[0]];
    const b = this.prevTouches[ids[1]];
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  setTarget(pos) { this.target.copy(pos); }

  update() {
    this.currentTarget.lerp(this.target, 0.06);
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.currentTarget).add(offset);
    this.camera.lookAt(this.currentTarget);
  }
}
