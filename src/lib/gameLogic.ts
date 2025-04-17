// src/lib/gameLogic.ts
import * as THREE from 'three';

export class Block {
  width: number;
  depth: number;
  height: number;
  speed: THREE.Vector3;
  geometry: THREE.BoxGeometry;
  material: THREE.MeshPhongMaterial;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  isFalling: boolean;
  acceleration?: number;
  rotationSpeed?: THREE.Vector3;
  bounceCount?: number;

  constructor(
    x: number,
    y: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    speedX: number,
    speedY: number,
    isFalling = false
  ) {
    this.width = width;
    this.depth = depth;
    this.height = height;
    const baseSpeed = Math.min(0.02 + (window.stack.length * 0.003125), 0.08);
    this.speed = new THREE.Vector3(
      isFalling ? (Math.random() - 0.5) * 0.2 : speedX * baseSpeed,
      isFalling ? (Math.random() - 0.5) * 0.2 : speedY * baseSpeed,
      isFalling ? -0.15 : 0
    );
    this.geometry = new THREE.BoxGeometry(width, depth, height);
    this.material = new THREE.MeshPhongMaterial({
      color: 0x00ff00,
      specular: 0x555555,
      shininess: 30,
      emissive: 0x00ff00,
      emissiveIntensity: 0.2,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(x, y, z);
    console.log('Block created at:', { x, y, z, width, depth, height, isFalling });
    window.scene.add(this.mesh);

    const edges = new THREE.EdgesGeometry(this.geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 }));
    line.position.copy(this.mesh.position);
    window.scene.add(line);
    this.edges = line;

    this.isFalling = isFalling;
    if (isFalling) {
      this.acceleration = -0.0075;
      this.rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 0.075,
        (Math.random() - 0.5) * 0.075,
        (Math.random() - 0.5) * 0.075
      );
      this.bounceCount = 0;
    }
  }

  move() {
    this.mesh.position.add(this.speed);
    this.edges.position.copy(this.mesh.position);

    if (this.isFalling) {
      this.mesh.rotation.x += this.rotationSpeed!.x;
      this.mesh.rotation.y += this.rotationSpeed!.y;
      this.mesh.rotation.z += this.rotationSpeed!.z;
      this.edges.rotation.copy(this.mesh.rotation);

      this.speed.z += this.acceleration!;
      if (this.mesh.position.z < 0 && this.bounceCount! < 3) {
        this.speed.z = Math.abs(this.speed.z) * 0.6;
        this.speed.x += (Math.random() - 0.5) * 0.15;
        this.speed.y += (Math.random() - 0.5) * 0.15;
        this.bounceCount!++;
        this.rotationSpeed!.multiplyScalar(0.9);
      }

      if (this.mesh.position.z < -15 || (this.bounceCount! >= 3 && Math.abs(this.speed.z) < 0.005)) {
        window.scene.remove(this.mesh);
        window.scene.remove(this.edges);
        this.isFalling = false;
        console.log('Falling block removed at z:', this.mesh.position.z);
      }
    } else {
      if (this.speed.x !== 0) {
        if (this.mesh.position.x + this.width / 2 > window.bounds)
          this.speed.x = -Math.abs(this.speed.x);
        else if (this.mesh.position.x - this.width / 2 < -window.bounds)
          this.speed.x = Math.abs(this.speed.x);
      }
      if (this.speed.y !== 0) {
        if (this.mesh.position.y + this.depth / 2 > window.bounds)
          this.speed.y = -Math.abs(this.speed.y);
        else if (this.mesh.position.y - this.depth / 2 < -window.bounds)
          this.speed.y = Math.abs(this.speed.y);
      }
    }
  }

  stop() {
    this.speed.set(0, 0, 0);
  }
}

export function createInitialBlock() {
  const block = new Block(0, 0, 0, 10, 10, 2, 0, 0);
  window.stack.push(block);
  window.previousBlock = block;
  console.log('Initial block added to scene');
}

export function spawnNewBlock() {
  if (!window.previousBlock) {
    console.error('No previous block, cannot spawn new block');
    return;
  }
  const prevCenterX = window.previousBlock.mesh.position.x;
  const prevCenterY = window.previousBlock.mesh.position.y;
  const direction = Math.random() < 0.5 ? 'x' : 'y';
  const speedValue = Math.random() < 0.5 ? -1 : 1;
  let x: number, y: number, speedX: number, speedY: number;

  if (direction === 'x') {
    x = speedValue > 0 ? -12.5 : 12.5;
    y = prevCenterY;
    speedX = speedValue;
    speedY = 0;
  } else {
    x = prevCenterX;
    y = speedValue > 0 ? -12.5 : 12.5;
    speedX = 0;
    speedY = speedValue;
  }

  let newBlockZ = window.previousBlock.mesh.position.z + window.previousBlock.height;
  window.currentBlock = new Block(
    x,
    y,
    newBlockZ,
    window.previousBlock.width,
    window.previousBlock.depth,
    window.previousBlock.height,
    speedX,
    speedY
  );
  window.stack.push(window.currentBlock);
  console.log('New block spawned at:', { x, y, z: newBlockZ, direction, speedX, speedY });

  if (window.stack.length >= 5) {
    const shiftDistance = window.currentBlock.height;
    window.stack.forEach((block: Block) => {
      block.mesh.position.z -= shiftDistance;
      block.edges.position.z -= shiftDistance;
    });
    window.fallingBlocks.forEach((block: Block) => {
      block.mesh.position.z -= shiftDistance;
      block.edges.position.z -= shiftDistance;
    });
    console.log('Stack shifted down by:', shiftDistance);
  }
}

export function cutBlock(current: Block, previous: Block): Block | null {
  const currX = current.mesh.position.x - current.width / 2;
  const currY = current.mesh.position.y - current.depth / 2;
  const prevX = previous.mesh.position.x - previous.width / 2;
  const prevY = previous.mesh.position.y - previous.depth / 2;

  const leftX = Math.max(currX, prevX);
  const rightX = Math.min(currX + current.width, prevX + previous.width);
  const leftY = Math.max(currY, prevY);
  const rightY = Math.min(currY + current.depth, prevY + previous.depth);

  console.log('Cutting block:', { currX, currY, prevX, prevY, leftX, rightX, leftY, rightY });

  if (leftX < rightX && leftY < rightY) {
    const newWidth = rightX - leftX;
    const newDepth = rightY - leftY;
    const newHeight = current.height;
    const newBlockZ = previous.mesh.position.z + previous.height;

    window.scene.remove(current.mesh);
    window.scene.remove(current.edges);
    const newBlock = new Block(leftX + newWidth / 2, leftY + newDepth / 2, newBlockZ, newWidth, newDepth, newHeight, 0, 0);
    window.stack.push(newBlock);
    console.log('New block created after cut:', { newWidth, newDepth, newBlockZ });

    if (currX < prevX) {
      const fallingWidth = prevX - currX;
      const fallingBlock = new Block(
        currX + fallingWidth / 2,
        current.mesh.position.y,
        current.mesh.position.z,
        fallingWidth,
        current.depth,
        current.height,
        0,
        0,
        true
      );
      window.fallingBlocks.push(fallingBlock);
      console.log('Falling block (left) created:', { fallingWidth });
    }
    if (currX + current.width > prevX + previous.width) {
      const fallingWidth = currX + current.width - (prevX + previous.width);
      const fallingBlock = new Block(
        prevX + previous.width + fallingWidth / 2,
        current.mesh.position.y,
        current.mesh.position.z,
        fallingWidth,
        current.depth,
        current.height,
        0,
        0,
        true
      );
      window.fallingBlocks.push(fallingBlock);
      console.log('Falling block (right) created:', { fallingWidth });
    }
    if (currY < prevY) {
      const fallingDepth = prevY - currY;
      const fallingBlock = new Block(
        current.mesh.position.x,
        currY + fallingDepth / 2,
        current.mesh.position.z,
        current.width,
        fallingDepth,
        current.height,
        0,
        0,
        true
      );
      window.fallingBlocks.push(fallingBlock);
      console.log('Falling block (top) created:', { fallingDepth });
    }
    if (currY + current.depth > prevY + previous.depth) {
      const fallingDepth = currY + current.depth - (prevY + previous.depth);
      const fallingBlock = new Block(
        current.mesh.position.x,
        prevY + previous.depth + fallingDepth / 2,
        current.mesh.position.z,
        current.width,
        fallingDepth,
        current.height,
        0,
        0,
        true
      );
      window.fallingBlocks.push(fallingBlock);
      console.log('Falling block (bottom) created:', { fallingDepth });
    }

    return newBlock;
  }
  console.log('Block cut failed, no overlap');
  return null;
}

export function startGame() {
  stopAnimation(); // Dừng animation cũ trước khi bắt đầu
  const light = new THREE.DirectionalLight(0xffffff, 2);
  light.position.set(-5, -5, 10);
  window.scene.add(light);
  window.scene.add(new THREE.AmbientLight(0x606060));
  console.log('Lights added to scene');
  createInitialBlock();
  console.log('Initial block created');
  spawnNewBlock();
  console.log('New block spawned in startGame');
  window.gameStarted = true;
  window.renderer.render(window.scene, window.camera);
  animate();
}

export function resetGameData() {
  stopAnimation(); // Dừng animation khi reset
  while (window.scene.children.length > 0) {
    window.scene.remove(window.scene.children[0]);
  }
  window.stack = [];
  window.fallingBlocks = [];
  window.currentBlock = null;
  window.previousBlock = null;
  window.score = 0;
  window.gameOver = false;
  window.gameStarted = false;
  window.clickCooldown = false;
  window.scene.add(window.camera);
  console.log('Game data reset');
}

export function stopAnimation() {
  if (window.animationId) {
    cancelAnimationFrame(window.animationId);
    window.animationId = null;
    console.log('Animation stopped');
  }
}

export function animate() {
  if (window.gameOver) {
    window.renderer.render(window.scene, window.camera);
    return; // Không gọi requestAnimationFrame nếu game over
  }
  window.animationId = requestAnimationFrame(animate);
  window.stack.forEach((block: Block) => block.move());
  if (window.currentBlock) {
    window.currentBlock.move();
    console.log('Current block position:', window.currentBlock.mesh.position);
  } else {
    console.log('No current block to move');
  }
  window.fallingBlocks.forEach((block: Block, index: number) => {
    block.move();
    if (!block.isFalling) window.fallingBlocks.splice(index, 1);
  });
  window.renderer.render(window.scene, window.camera);
}