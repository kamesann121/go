import * as THREE from 'three';

export function createScene() {
  // ── シーン ──
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // スキーブルー
  scene.fog = new THREE.FogExp2(0xc8e6f0, 0.008);

  // ── カメラ ──
  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );
  camera.position.set(0, 30, 50);
  camera.lookAt(0, 0, 0);

  // ── レンダラー ──
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // ── 光源 ──
  // アンビエント光
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  // 太陽光（平行光）
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.0);
  sun.position.set(50, 80, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 200;
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  scene.add(sun);

  // 補助光（柔らかい影になるように）
  const fill = new THREE.DirectionalLight(0xd0e8ff, 0.3);
  fill.position.set(-30, 20, -20);
  scene.add(fill);

  // ── リサイズハンドラ ──
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, sun };
}
