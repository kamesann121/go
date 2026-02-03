import * as THREE from 'three';

export class InputController {
  constructor(ball, club, camera) {
    this.ball = ball;
    this.club = club;
    this.camera = camera;

    // エイム方向（水平面上）
    this.aimAngle = Math.PI; // デフォルト：ホール方向へ（-Z）

    // パワー
    this.power = 0;
    this.isCharging = false;
    this.chargingUp = true;   // パワーが増えていくか減っていくか

    // UI要素
    this.powerBar = document.getElementById('power-bar');
    this.powerLabel = document.getElementById('power-label');

    this._bindEvents();
  }

  _bindEvents() {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    // 右クリックのコンテキストメニューを無効
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // ショット用：右クリック の mousedown で charge 開始
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        // 右クリック → ショット charged
        if (!this.ball.isMoving) {
          this.isCharging = true;
          this.chargingUp = true;
          this.power = 0;
        }
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 2 && this.isCharging) {
        // 右クリック離す → ショット発火
        this._fireShot();
      }
    });

    // エイム調整：左クリックドラッグ（camera.js とコンフリクトしないようにする）
    // → カメラドラッグと分離するため、左クリック時にエイム角も変える
    canvas.addEventListener('mousemove', (e) => {
      if (this.ball.isMoving) return;
      // スクリーン中央からの角度でエイム方向を決める（カメラ基準）
      const rect = canvas.getBoundingClientRect();
      const cx = rect.width / 2;
      const cz = rect.height / 2;
      const mx = e.clientX - rect.left - cx;
      const mz = e.clientY - rect.top - cz;
      // カメラのtheta基準にエイム角を計算
      this.aimAngle = Math.atan2(mx, mz) + this.camera.spherical.theta + Math.PI;
    });
  }

  _fireShot() {
    this.isCharging = false;
    if (this.ball.isMoving) {
      this.power = 0;
      this._updatePowerUI();
      return;
    }

    // エイム方向を水平ベクトルに変換
    const dir = new THREE.Vector3(
      Math.sin(this.aimAngle),
      0,
      Math.cos(this.aimAngle)
    ).normalize();

    this.ball.shoot(dir, this.power);
    this.power = 0;
    this._updatePowerUI();

    // クラブを一瞬숨す（ショット中）
    this.club.setVisible(false);

    return true; // ショット成功
  }

  _updatePowerUI() {
    const pct = Math.round(this.power * 100);
    this.powerBar.style.width = pct + '%';
    this.powerLabel.textContent = `Power: ${pct}%`;
  }

  // 毎フレーム呼んでパワーチャージを更新し、クラブ位置も更新する
  update(dt) {
    // パワーチャージ
    if (this.isCharging && !this.ball.isMoving) {
      if (this.chargingUp) {
        this.power += dt * 0.8;
        if (this.power >= 1) {
          this.power = 1;
          this.chargingUp = false;
        }
      } else {
        this.power -= dt * 0.8;
        if (this.power <= 0) {
          this.power = 0;
          this.chargingUp = true;
        }
      }
      this._updatePowerUI();
    }

    // クラブとエイムラインの更新
    if (!this.ball.isMoving && this.ball.mesh) {
      this.club.setVisible(true);
      const dir = new THREE.Vector3(
        Math.sin(this.aimAngle),
        0,
        Math.cos(this.aimAngle)
      ).normalize();
      this.club.update(this.ball.mesh.position, dir);
    }
  }
}
