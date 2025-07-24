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

// Gaze-based auto movement
let gazeTimer = 0;
const GAZE_HOLD_TIME = 2; // seconds
let isMoving = false;
let moveStartTime = 0;
const MOVE_DURATION = 3; // seconds
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const gazeVector = new THREE.Vector2(0, 0);

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  const xrCamera = renderer.xr.getCamera(camera);

  // Gaze detection
  if (renderer.xr.isPresenting) {
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
  }

  renderer.render(scene, camera);
}

animate();
