import * as THREE from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

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

// Load GLB model
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

// Movement flags
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let moveUp = false, moveDown = false;

let velocity = new THREE.Vector3();
const clock = new THREE.Clock();

// Keyboard input
document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp':
      moveForward = true; break;
    case 'KeyS':
    case 'ArrowDown':
      moveBackward = true; break;
    case 'KeyA':
    case 'ArrowLeft':
      moveLeft = true; break;
    case 'KeyD':
    case 'ArrowRight':
      moveRight = true; break;
    case 'KeyE':
    case 'PageUp':
      moveUp = true; break;
    case 'KeyQ':
    case 'PageDown':
      moveDown = true; break;
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp':
      moveForward = false; break;
    case 'KeyS':
    case 'ArrowDown':
      moveBackward = false; break;
    case 'KeyA':
    case 'ArrowLeft':
      moveLeft = false; break;
    case 'KeyD':
    case 'ArrowRight':
      moveRight = false; break;
    case 'KeyE':
    case 'PageUp':
      moveUp = false; break;
    case 'KeyQ':
    case 'PageDown':
      moveDown = false; break;
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

  // Optional: vertical movement with strong diagonal swipe
  moveUp = dy < -40 && Math.abs(dx) < 10;
  moveDown = dy > 40 && Math.abs(dx) < 10;
}, false);

joystick.addEventListener('touchend', () => {
  drag = false;
  moveForward = moveBackward = moveLeft = moveRight = moveUp = moveDown = false;
}, false);

// Movement loop
function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  const delta = clock.getDelta();
  velocity.set(0, 0, 0);

  if (moveForward) velocity.z -= 2 * delta;
  if (moveBackward) velocity.z += 2 * delta;
  if (moveLeft) velocity.x -= 2 * delta;
  if (moveRight) velocity.x += 2 * delta;
  if (moveUp) velocity.y += 2 * delta;
  if (moveDown) velocity.y -= 2 * delta;

  const direction = new THREE.Vector3();
  controls.getDirection(direction);

  controls.getObject().position.addScaledVector(direction, velocity.z);

  const right = new THREE.Vector3();
  right.crossVectors(camera.up, direction).normalize();
  controls.getObject().position.addScaledVector(right, velocity.x);

  // Vertical movement
  controls.getObject().position.y += velocity.y;

  renderer.render(scene, camera);
}

// Touch buttons for up/down movement on mobile
document.getElementById('upBtn')?.addEventListener('touchstart', () => moveUp = true);
document.getElementById('upBtn')?.addEventListener('touchend', () => moveUp = false);
document.getElementById('downBtn')?.addEventListener('touchstart', () => moveDown = true);
document.getElementById('downBtn')?.addEventListener('touchend', () => moveDown = false);


animate();
