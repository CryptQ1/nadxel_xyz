import * as THREE from 'three';

declare global {
  interface Window {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    bounds: number;
    stack: THREE.Mesh[];
    fallingBlocks: THREE.Mesh[];
    currentBlock: THREE.Mesh | null;
    previousBlock: THREE.Mesh | null;
    score: number;
    gameOver: boolean;
    gameStarted: boolean;
    clickCooldown: boolean;
    animationId: number | null;
  }
}