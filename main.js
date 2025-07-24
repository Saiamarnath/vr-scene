// main.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Lighting
const light = new THREE.HemisphereLight(0xffffff, 0x444444);
scene.add(light);

// HDRI
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
}, undefined, (e) => console.error('GLB Load Error:', e));

// Movement flags
let autoMove = false;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let moveUp = false, moveDown = false;
let velocity = new THREE.Vector3();
const clock = new THREE.Clock();

// Keyboard input
if (!/Mobi|Android/i.test(navigator.userAgent)) {
  document.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': moveForward = true; break;
      case 'KeyS': case 'ArrowDown': moveBackward = true; break;
      case 'KeyA': case 'ArrowLeft': moveLeft = true; break;
      case 'KeyD': case 'ArrowRight': moveRight = true; break;
      case 'KeyE': case 'PageUp': moveUp = true; break;
      case 'KeyQ': case 'PageDown': moveDown = true; break;
    }
  });

  document.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': moveForward = false; break;
      case 'KeyS': case 'ArrowDown': moveBackward = false; break;
      case 'KeyA': case 'ArrowLeft': moveLeft = false; break;
      case 'KeyD': case 'ArrowRight': moveRight = false; break;
      case 'KeyE': case 'PageUp': moveUp = false; break;
      case 'KeyQ': case 'PageDown': moveDown = false; break;
    }
  });
}

// Auto move on gaze control
let gazeTimer = 0;
let intersected = null;
const GAZE_TIME = 2;
const raycaster = new THREE.Raycaster();
const gazeVector = new THREE.Vector2(0, 0);

const buttonGroup = new THREE.Group();
scene.add(buttonGroup);

const createButton = (name, color, x) => {
  const geometry = new THREE.BoxGeometry(0.3, 0.1, 0.05);
  const material = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, 0, 0);
  mesh.name = name;
  buttonGroup.add(mesh);
};

createButton('startStop', 0x00ff00, -0.4);
createButton('up', 0x0000ff, 0);
createButton('down', 0xff00ff, 0.4);

function updateButtonPosition(xrCamera) {
  const dir = new THREE.Vector3();
  xrCamera.getWorldDirection(dir);
  const pos = new THREE.Vector3();
  xrCamera.getWorldPosition(pos);
  dir.multiplyScalar(1.5).add(pos);
  buttonGroup.position.copy(dir);
  buttonGroup.lookAt(pos);
}

function handleGazeAction(name) {
  if (name === 'startStop') autoMove = !autoMove;
  if (name === 'up') moveUp = true;
  if (name === 'down') moveDown = true;
  setTimeout(() => { moveUp = false; moveDown = false; }, 1500);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  const delta = clock.getDelta();
  velocity.set(0, 0, 0);
  const xrCamera = renderer.xr.getCamera(camera);

  // Keyboard move
  if (moveForward) velocity.z -= 2 * delta;
  if (moveBackward) velocity.z += 2 * delta;
  if (moveLeft) velocity.x -= 2 * delta;
  if (moveRight) velocity.x += 2 * delta;
  if (moveUp) velocity.y += 2 * delta;
  if (moveDown) velocity.y -= 2 * delta;

  // Auto move
  if (autoMove) {
    const dir = new THREE.Vector3();
    xrCamera.getWorldDirection(dir);
    dir.multiplyScalar(delta * 2);
    camera.position.add(dir);
  }

  camera.position.add(velocity);

  // Gaze interaction
  raycaster.setFromCamera(gazeVector, xrCamera);
  const intersects = raycaster.intersectObjects(buttonGroup.children);

  if (intersects.length > 0) {
    const target = intersects[0].object;
    if (intersected !== target) {
      intersected = target;
      gazeTimer = 0;
    } else {
      gazeTimer += delta;
      if (gazeTimer >= GAZE_TIME) {
        handleGazeAction(target.name);
        gazeTimer = 0;
      }
    }
  } else {
    intersected = null;
    gazeTimer = 0;
  }

  updateButtonPosition(xrCamera);
  renderer.render(scene, camera);
}

animate();
