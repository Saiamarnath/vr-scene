// main.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// Scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// PointerLockControls for desktop
const controls = new PointerLockControls(camera, document.body);
scene.add(controls.getObject());

if (!/Mobi|Android/i.test(navigator.userAgent)) {
  document.addEventListener('click', () => controls.lock());
}

// Lighting
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444));

// Environment
new RGBELoader().load('env.hdr', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.background = texture;
});

// Load model
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
loader.load('scene-optimized.glb', (gltf) => {
  const model = gltf.scene;
  model.rotation.x = Math.PI;
  model.rotation.z = Math.PI;
  model.position.set(0, -13, 0);
  scene.add(model);
}, undefined, (e) => console.error('GLB load error:', e));

// Clock
const clock = new THREE.Clock();

// Movement state
let isMoving = false;
let moveDirection = new THREE.Vector3();
let moveTarget = new THREE.Vector3();
let gazeTimer = 0;
const GAZE_HOLD_TIME = 2;
const MOVE_DISTANCE = 10;
const moveSpeed = 2;

// Add 3D gaze ring
const ringGeometry = new THREE.RingGeometry(0.1, 0.12, 32);
const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
const gazeRing = new THREE.Mesh(ringGeometry, ringMaterial);
gazeRing.visible = false;
scene.add(gazeRing);

// Keyboard controls for desktop
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, moveUp = false, moveDown = false;

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

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  const delta = clock.getDelta();
  const isVR = renderer.xr.isPresenting;
  const xrCamera = renderer.xr.getCamera(camera);
  const rig = xrCamera.parent || controls.getObject();

  if (isVR) {
    if (!isMoving) {
      gazeTimer += delta;
      gazeRing.visible = true;

      const dir = new THREE.Vector3();
      xrCamera.getWorldDirection(dir);
      dir.normalize();
      gazeRing.position.copy(xrCamera.position).add(dir.clone().multiplyScalar(0.5));
      gazeRing.lookAt(xrCamera.position);

      const scale = Math.min(gazeTimer / GAZE_HOLD_TIME, 1);
      gazeRing.scale.set(scale, scale, scale);

      if (gazeTimer >= GAZE_HOLD_TIME) {
        xrCamera.getWorldDirection(moveDirection);
        moveDirection.normalize();
        moveTarget.copy(rig.position).add(moveDirection.clone().multiplyScalar(MOVE_DISTANCE));
        isMoving = true;
        gazeTimer = 0;
        gazeRing.visible = false;
      }
    } else {
      const toTarget = moveTarget.clone().sub(rig.position);
      const step = moveDirection.clone().multiplyScalar(moveSpeed * delta);

      if (step.lengthSq() < toTarget.lengthSq()) {
        rig.position.add(step);
      } else {
        rig.position.copy(moveTarget);
        isMoving = false;
      }
    }
  } else {
    const velocity = new THREE.Vector3();
    if (moveForward) velocity.z -= 1;
    if (moveBackward) velocity.z += 1;
    if (moveLeft) velocity.x -= 1;
    if (moveRight) velocity.x += 1;
    if (moveUp) velocity.y += 1;
    if (moveDown) velocity.y -= 1;
    velocity.normalize().multiplyScalar(moveSpeed * delta);
    controls.getObject().position.add(velocity);
  }

  renderer.render(scene, camera);
}

animate();
