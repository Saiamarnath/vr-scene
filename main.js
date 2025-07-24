import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 3);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Controls
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

if (!/Mobi|Android/i.test(navigator.userAgent)) {
  document.addEventListener('click', () => controls.lock());
}

// Lighting
const light = new THREE.HemisphereLight(0xffffff, 0x444444);
scene.add(light);

// HDR Environment
new RGBELoader().load('env.hdr', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.background = texture;
});

// Load GLB
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
loader.load('scene-optimized.glb', (gltf) => {
  const model = gltf.scene;
  model.rotation.x = Math.PI;
  model.rotation.z = Math.PI;
  model.position.set(0, -13, 0);
  scene.add(model);
}, undefined, (error) => {
  console.error('Error loading GLB:', error);
});

// Movement
let autoMove = false;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let moveUp = false, moveDown = false;
let velocity = new THREE.Vector3();
const clock = new THREE.Clock();

// Keyboard controls
document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp': moveForward = true; break;
    case 'KeyS':
    case 'ArrowDown': moveBackward = true; break;
    case 'KeyA':
    case 'ArrowLeft': moveLeft = true; break;
    case 'KeyD':
    case 'ArrowRight': moveRight = true; break;
    case 'KeyE':
    case 'PageUp': moveUp = true; break;
    case 'KeyQ':
    case 'PageDown': moveDown = true; break;
  }
});
document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp': moveForward = false; break;
    case 'KeyS':
    case 'ArrowDown': moveBackward = false; break;
    case 'KeyA':
    case 'ArrowLeft': moveLeft = false; break;
    case 'KeyD':
    case 'ArrowRight': moveRight = false; break;
    case 'KeyE':
    case 'PageUp': moveUp = false; break;
    case 'KeyQ':
    case 'PageDown': moveDown = false; break;
  }
});

// Mobile joystick
let joystick = document.getElementById('joystick');
let drag = false;
let center = { x: 0, y: 0 };

joystick.addEventListener('touchstart', (e) => {
  drag = true;
  const rect = joystick.getBoundingClientRect();
  center = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}, false);

joystick.addEventListener('touchmove', (e) => {
  if (!drag) return;
  const touch = e.touches[0];
  const dx = touch.clientX - center.x;
  const dy = touch.clientY - center.y;

  moveForward = dy < -10;
  moveBackward = dy > 10;
  moveLeft = dx < -10;
  moveRight = dx > 10;
  moveUp = dy < -40 && Math.abs(dx) < 10;
  moveDown = dy > 40 && Math.abs(dx) < 10;
}, false);

joystick.addEventListener('touchend', () => {
  drag = false;
  moveForward = moveBackward = moveLeft = moveRight = moveUp = moveDown = false;
}, false);

// Buttons & Gaze setup
const buttonMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const startBtn = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.05), buttonMaterial);
const upBtn = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.05), buttonMaterial);
const downBtn = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.05), buttonMaterial);
startBtn.name = 'startStop'; upBtn.name = 'up'; downBtn.name = 'down';
scene.add(startBtn, upBtn, downBtn);

// Gaze setup
const raycaster = new THREE.Raycaster();
const gazeVector = new THREE.Vector2(0, 0);
let gazeTimer = 0;
const GAZE_HOLD_TIME = 2;
let intersectedButton = null;

// Add text labels
new FontLoader().load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
  const createLabel = (text, x, y, name) => {
    const geometry = new TextGeometry(text, { font, size: 0.05, height: 0.01 });
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name + '_label';
    mesh.position.set(x, y, -2.05);
    scene.add(mesh);
  };

  createLabel('Start/Stop', -0.5, 1.4, 'startStop');
  createLabel('Up', 0, 1.4, 'up');
  createLabel('Down', 0.5, 1.4, 'down');
});

// Reposition buttons in front of camera on VR entry
function positionButtonsInFrontOfCamera() {
  const xrCam = renderer.xr.getCamera(camera);
  const dir = new THREE.Vector3();
  xrCam.getWorldDirection(dir);
  const pos = new THREE.Vector3();
  xrCam.getWorldPosition(pos);
  const base = dir.multiplyScalar(2).add(pos);

  startBtn.position.copy(base).add(new THREE.Vector3(-0.5, 0, 0));
  upBtn.position.copy(base).add(new THREE.Vector3(0, 0, 0));
  downBtn.position.copy(base).add(new THREE.Vector3(0.5, 0, 0));
}

renderer.xr.addEventListener('sessionstart', () => {
  autoMove = false;
  positionButtonsInFrontOfCamera();
});

// Gaze action handler
function handleGazeAction(name) {
  if (name === 'startStop') {
    autoMove = !autoMove;
    startBtn.material.color.set(autoMove ? 0xff0000 : 0x00ff00);
  } else if (name === 'up') {
    moveUp = true;
    setTimeout(() => moveUp = false, 1000);
  } else if (name === 'down') {
    moveDown = true;
    setTimeout(() => moveDown = false, 1000);
  }
}

// Render loop
function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  const delta = clock.getDelta();
  velocity.set(0, 0, 0);

  if (moveForward || autoMove) velocity.z -= 2 * delta;
  if (moveBackward) velocity.z += 2 * delta;
  if (moveLeft) velocity.x -= 2 * delta;
  if (moveRight) velocity.x += 2 * delta;
  if (moveUp || (autoMove && moveUp)) velocity.y += 2 * delta;
  if (moveDown || (autoMove && moveDown)) velocity.y -= 2 * delta;

  const direction = new THREE.Vector3();
  controls.getDirection(direction);
  controls.getObject().position.addScaledVector(direction, velocity.z);

  const right = new THREE.Vector3();
  right.crossVectors(camera.up, direction).normalize();
  controls.getObject().position.addScaledVector(right, velocity.x);

  controls.getObject().position.y += velocity.y;

  // Gaze detection in VR
  if (renderer.xr.isPresenting) {
    const xrCam = renderer.xr.getCamera(camera);
    raycaster.setFromCamera(gazeVector, xrCam);
    const intersects = raycaster.intersectObjects([startBtn, upBtn, downBtn]);

    if (intersects.length > 0) {
      if (intersects[0].object !== intersectedButton) {
        intersectedButton = intersects[0].object;
        gazeTimer = 0;
      } else {
        gazeTimer += delta;
        if (gazeTimer >= GAZE_HOLD_TIME) {
          handleGazeAction(intersectedButton.name);
          gazeTimer = 0;
        }
      }
    } else {
      intersectedButton = null;
      gazeTimer = 0;
    }
  }

  renderer.render(scene, camera);
}

animate();
