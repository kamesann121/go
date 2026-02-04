import * as THREE from 'three';

export class InputController {
  constructor(ball, club, camera) {
    this.ball = ball;
    this.club = club;
    this.camera = camera;

    // エイム方向
    this.aimAngle = Math.PI;

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

  // ── キーボード操作（デスクトップ）──
  _bindKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      
      // A → 視点固定トグル
      if (key === 'a') {
        this.isViewLocked = !this.isViewLocked;
        console.log(`視点固定: ${this.isViewLocked ? 'ON' : 'OFF'}`);
      }
      
      // S → チャージ開始
      if (key === 's' && !this.ball.isMoving && !this.isCharging) {
        this.isCharging = true;
        this.chargingUp = true;
        this.power = 0;
      }
      
      // D → ショット発火
      if (key === 'd' && this.isCharging) {
        this._fireShot();
      }
    });
  }

  // ── マウス操作（視点移動用）──
  _bindMouseEvents() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // マウス移動でエイム角を更新（視点固定されていない時のみ）
    canvas.addEventListener('mousemove', (e) => {
      if (this.ball.isMoving || this.isViewLocked) return;
      
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left - rect.width / 2;
      const mz = e.clientY - rect.top  - rect.height / 2;
      this.aimAngle = Math.atan2(mx, mz) + this.camera.spherical.theta + Math.PI;
    });
  }

  // ── タッチ操作（モバイル）──
  _bindTouchEvents() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        this._activeTouches[t.identifier] = { x: t.clientX, y: t.clientY };
        this._touchCount++;
      }

      // 2指 → チャージ開始
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
      
      // 1指 かつ 視点固定されていない → エイム更新
      if (this._touchCount === 1 && !this.ball.isMoving && !this.isViewLocked) {
        const t = e.changedTouches[0];
        const rect = canvas.getBoundingClientRect();
        const mx = t.clientX - rect.left  - rect.width / 2;
        const mz = t.clientY - rect.top   - rect.height / 2;
        this.aimAngle = Math.atan2(mx, mz) + this.camera.spherical.theta + Math.PI;
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        delete this._activeTouches[t.identifier];
        this._touchCount = Math.max(0, this._touchCount - 1);

        // チャージ中の指が離れた → ショット発火
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

    const dir = new THREE.Vector3(
      Math.sin(this.aimAngle),
      0,
      Math.cos(this.aimAngle)
    ).normalize();

    this.ball.shoot(dir, this.power);
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

    // クラブ＋エイムライン
    if (!this.ball.isMoving && this.ball.mesh) {
      this.club.setVisible(true);
      const dir = new THREE.Vector3(
        Math.sin(this.aimAngle), 0, Math.cos(this.aimAngle)
      ).normalize();
      this.club.update(this.ball.mesh.position, dir);
    }
  }
}
