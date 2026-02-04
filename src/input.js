import * as THREE from 'three';

export class InputController {
  constructor(ball, club, camera) {
    this.ball = ball;
    this.club = club;
    this.camera = camera;

    // エイム方向（カメラ基準の前方向）
    this.aimDirection = new THREE.Vector3(0, 0, -1);

    // パワー
    this.power = 0;
    this.isCharging = false;
    this.chargingUp = true;

    // 視点固定フラグ
    this.isViewLocked = false;

    // タッチ用
    this._activeTouches = {};
    this._touchCount = 0;
    this.chargeStartId = null;

    // UI
    this.powerBar   = document.getElementById('power-bar');
    this.powerLabel = document.getElementById('power-label');

    this._bindKeyboardEvents();
    this._bindMouseEvents();
    this._bindTouchEvents();
  }

  // ── キーボード操作 ──
  _bindKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      
      if (key === 'a') {
        this.isViewLocked = !this.isViewLocked;
        console.log(`視点固定: ${this.isViewLocked ? 'ON' : 'OFF'}`);
      }
      
      if (key === 's' && !this.ball.isMoving && !this.isCharging) {
        this.isCharging = true;
        this.chargingUp = true;
        this.power = 0;
      }
      
      if (key === 'd' && this.isCharging) {
        this._fireShot();
      }
    });
  }

  // ── マウス操作 ──
  _bindMouseEvents() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // マウス移動で「カメラが見ている方向」を基準にエイム方向を更新
    canvas.addEventListener('mousemove', (e) => {
      if (this.ball.isMoving || this.isViewLocked) return;
      
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width * 2 - 1;
      const mz = -((e.clientY - rect.top) / rect.height * 2 - 1);
      
      // カメラの向きベクトル
      const camDir = new THREE.Vector3();
      this.camera.camera.getWorldDirection(camDir);
      camDir.y = 0; // 水平成分のみ
      camDir.normalize();
      
      // カメラの右ベクトル
      const camRight = new THREE.Vector3();
      camRight.crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();
      
      // マウス位置に応じてエイム方向を調整
      this.aimDirection.copy(camDir)
        .add(camRight.multiplyScalar(mx * 0.5));
      this.aimDirection.y = 0;
      this.aimDirection.normalize();
    });
  }

  // ── タッチ操作 ──
  _bindTouchEvents() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        this._activeTouches[t.identifier] = { x: t.clientX, y: t.clientY };
        this._touchCount++;
      }

      if (this._touchCount >= 2 && !this.ball.isMoving && !this.isCharging) {
        this.isCharging  = true;
        this.chargingUp  = true;
        this.power = 0;
        this.chargeStartId = e.changedTouches[e.changedTouches.length - 1].identifier;
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        this._activeTouches[t.identifier] = { x: t.clientX, y: t.clientY };
      }
      
      if (this._touchCount === 1 && !this.ball.isMoving && !this.isViewLocked) {
        const t = e.changedTouches[0];
        const rect = canvas.getBoundingClientRect();
        const mx = (t.clientX - rect.left) / rect.width * 2 - 1;
        const mz = -((t.clientY - rect.top) / rect.height * 2 - 1);
        
        const camDir = new THREE.Vector3();
        this.camera.camera.getWorldDirection(camDir);
        camDir.y = 0;
        camDir.normalize();
        
        const camRight = new THREE.Vector3();
        camRight.crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();
        
        this.aimDirection.copy(camDir)
          .add(camRight.multiplyScalar(mx * 0.5));
        this.aimDirection.y = 0;
        this.aimDirection.normalize();
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        delete this._activeTouches[t.identifier];
        this._touchCount = Math.max(0, this._touchCount - 1);

        if (this.isCharging && t.identifier === this.chargeStartId) {
          this._fireShot();
          this.chargeStartId = null;
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this._activeTouches = {};
      this._touchCount = 0;
      if (this.isCharging) {
        this.isCharging = false;
        this.power = 0;
        this._updatePowerUI();
      }
    }, { passive: false });
  }

  // ── ショット発火 ──
  _fireShot() {
    this.isCharging = false;
    if (this.ball.isMoving) {
      this.power = 0;
      this._updatePowerUI();
      return;
    }

    // エイム方向をそのまま使う（正規化済み）
    this.ball.shoot(this.aimDirection.clone(), this.power);
    this.power = 0;
    this._updatePowerUI();
    this.club.setVisible(false);
  }

  _updatePowerUI() {
    const pct = Math.round(this.power * 100);
    this.powerBar.style.width = pct + '%';
    this.powerLabel.textContent = `Power: ${pct}%`;
  }

  // ── 毎フレーム ──
  update(dt) {
    // パワーチャージ
    if (this.isCharging && !this.ball.isMoving) {
      if (this.chargingUp) {
        this.power += dt * 0.8;
        if (this.power >= 1) { this.power = 1; this.chargingUp = false; }
      } else {
        this.power -= dt * 0.8;
        if (this.power <= 0) { this.power = 0; this.chargingUp = true; }
      }
      this._updatePowerUI();
    }

    // クラブ＋エイムライン（常にカメラの前方向に向ける）
    if (!this.ball.isMoving && this.ball.mesh) {
      this.club.setVisible(true);
      
      // カメラが見ている方向を基準にクラブとエイムラインを配置
      const camDir = new THREE.Vector3();
      this.camera.camera.getWorldDirection(camDir);
      camDir.y = 0;
      camDir.normalize();
      
      this.club.update(this.ball.mesh.position, camDir);
    }
  }
}
