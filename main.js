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

// Clock
const clock = new THREE.Clock();

// Desktop Controls (before entering VR)
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let moveUp = false, moveDown = false;
let velocity = new THREE.Vector3();

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

// Gaze-based auto movement (after entering VR on mobile)
let gazeTimer = 0;
const GAZE_HOLD_TIME = 2; // seconds
let isMoving = false;
let moveStartTime = 0;
const MOVE_DURATION = 3; // seconds
const raycaster = new THREE.Raycaster();
const gazeVector = new THREE.Vector2(0, 0);

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  const xrCamera = renderer.xr.getCamera(camera);

  if (renderer.xr.isPresenting) {
    // Gaze detection for mobile VR
    raycaster.setFromCamera(gazeVector, xrCamera);
    const dir = new THREE.Vector3();
    xrCamera.getWorldDirection(dir);

    if (!isMoving) {
      gazeTimer += delta;
      if (gazeTimer >= GAZE_HOLD_TIME) {
        isMoving = true;
        moveStartTime = elapsed;
        camera.userData.moveDirection = dir.clone();
        gazeTimer = 0;
      }
    } else {
      const moveElapsed = elapsed - moveStartTime;
      if (moveElapsed <= MOVE_DURATION) {
        const step = camera.userData.moveDirection.clone().multiplyScalar(delta * 2);
        camera.position.add(step);
      } else {
        isMoving = false;
      }
    }
  } else {
    // Desktop movement logic
    velocity.set(0, 0, 0);
    if (moveForward) velocity.z -= 2 * delta;
    if (moveBackward) velocity.z += 2 * delta;
    if (moveLeft) velocity.x -= 2 * delta;
    if (moveRight) velocity.x += 2 * delta;
    if (moveUp) velocity.y += 2 * delta;
    if (moveDown) velocity.y -= 2 * delta;

    camera.position.add(velocity);
  }

  renderer.render(scene, camera);
}

animate();
