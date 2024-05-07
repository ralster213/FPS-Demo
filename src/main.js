//@ts-ignore
import * as THREE from "../libs/three.module.js";
import Ammo from "../libs/ammo.js";

//import * as BGU from 'three/examples/jsm/utils/BufferGeometryUtils';




const KEYS = {
  a: 65,
  s: 83,
  w: 87,
  d: 68,
  SPACE: 32
};

function clamp(x, a, b) {
  return Math.min(Math.max(x, a), b);
}

class InputController {
  constructor(target) {
    this.target_ = target || document;
    this.initialize_();
  }

  initialize_() {
    this.current_ = {
      jumpButton: false,
      leftButton: false,
      rightButton: false,
      mouseXDelta: 0,
      mouseYDelta: 0,
      mouseX: 0,
      mouseY: 0,
      //add mouse click mouseClick: 0
    };
    this.previous_ = null;
    this.keys_ = {};
    this.previousKeys_ = {};
    this.target_.addEventListener(
      "mousedown",
      (e) => this.onMouseDown_(e),
      false
    );
    this.target_.addEventListener(
      "mousemove",
      (e) => this.onMouseMove_(e),
      false
    );
    this.target_.addEventListener("mouseup", (e) => this.onMouseUp_(e), false);
    this.target_.addEventListener("keydown", (e) => this.onKeyDown_(e), false);
    this.target_.addEventListener("keyup", (e) => this.onKeyUp_(e), false);
    //add mouse click this.target_.addEventListener('mouseclick', (e) => this.onMouse) maybe
  }

  onMouseMove_(e) {
    this.current_.mouseX += e.movementX;
    this.current_.mouseY += e.movementY;

    if (this.previous_ === null) {
      this.previous_ = { ...this.current_ };
    }

    this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
    this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;
  }

  onMouseDown_(e) {
    this.onMouseMove_(e);

    switch (e.button) {
      case 0: {
        this.current_.leftButton = true;
        break;
      }
      case 2: {
        this.current_.rightButton = true;
        break;
      }
    }
  }

  onMouseUp_(e) {
    this.onMouseMove_(e);

    switch (e.button) {
      case 0: {
        this.current_.leftButton = false;
        break;
      }
      case 2: {
        this.current_.rightButton = false;
        break;
      }
    }
  }

  onKeyDown_(e) {
    this.keys_[e.keyCode] = true;
    if (e.keyCode === 32) { // Space key
      this.jumpButton_ = true;
    }
  }

  onKeyUp_(e) {
    this.keys_[e.keyCode] = false;
    if (e.keyCode === 32) { // Space key
      this.jumpButton_ = false;
  }
  }
  key(keyCode) {
    return !!this.keys_[keyCode];
  }

  isReady() {
    return this.previous_ !== null;
  }

  update(_) {
    if (this.previous_ !== null) {
      this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
      this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;

      this.previous_ = { ...this.current_ };
    }
  }
}

class FirstPersonCamera {
  constructor(camera, objects, Ammo) {
    this.camera_ = camera;
    this.input_ = new InputController();
    this.rotation_ = new THREE.Quaternion();
    this.translation_ = new THREE.Vector3(0, 0, 0);
    this.phi_ = 0;
    this.phiSpeed_ = 8;
    this.theta_ = 0;
    this.thetaSpeed_ = 5;
    this.headBobActive_ = false;
    this.headBobTimer_ = 0;
    this.objects_ = objects;
    this.cameraRigidBody_ = null;
    this.ammoClone = Ammo;
  }

  jump_(timeElapsedS, Ammo = this.ammoClone) {
    if (this.input_.jumpButton_ && this.camera_.position.y < 3) {
      console.log("jump! ")
      const jumpForce = 100; // Adjust the jump force as needed
      const jumpDirection = new Ammo.btVector3(0, jumpForce, 0);
      this.cameraRigidBody_.applyImpulse(jumpDirection, new Ammo.btVector3(0.01, 0.01, 0.01));
      this.input_.jumpButton_ = false; // Reset the jump button state
    }
  }



  update(timeElapsedS) {
    this.updateRotation_(timeElapsedS);
    this.updateCamera_(timeElapsedS);
    this.updateTranslation_(timeElapsedS);
    this.updateHeadBob_(timeElapsedS);
    this.input_.update(timeElapsedS);
    this.jump_(timeElapsedS);

  }

  updateCamera_(timeElapsedS) {
    if(this.cameraRigidBody_){
      const cameraPos = this.cameraRigidBody_.getWorldTransform().getOrigin();
      this.camera_.position.set(cameraPos.x(), cameraPos.y(), cameraPos.z());
    }
    this.camera_.quaternion.copy(this.rotation_);
    
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.rotation_);

    const dir = forward.clone();
    forward.multiplyScalar(100);
    forward.add(this.translation_);
  }

  updateHeadBob_(timeElapsedS) {
    if (this.headBobActive_) {
      const wavelength = Math.PI;
      const nextStep =
        1 + Math.floor(((this.headBobTimer_ + 0.000001) * 10) / wavelength);
      const nextStepTime = (nextStep * wavelength) / 10;
      this.headBobTimer_ = Math.min(
        this.headBobTimer_ + timeElapsedS,
        nextStepTime
      );

      if (this.headBobTimer_ == nextStepTime) {
        this.headBobActive_ = false;
      }
    }
  }

  updateTranslation_(timeElapsedS, Ammo = this.ammoClone) {
    const maxSpeed = 10; // Adjust the maximum speed as needed
    const acceleration = 1000; // Adjust the acceleration as needed
    const damping = 0.1; // Adjust the damping factor as needed
  
    const forwardVelocity =
      (this.input_.key(KEYS.w) ? 1 : 0) + (this.input_.key(KEYS.s) ? -1 : 0);
    const strafeVelocity =
      (this.input_.key(KEYS.a) ? 1 : 0) + (this.input_.key(KEYS.d) ? -1 : 0);
  
    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);
  
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(qx);
    forward.multiplyScalar(forwardVelocity * acceleration * timeElapsedS);
  
    const left = new THREE.Vector3(-1, 0, 0);
    left.applyQuaternion(qx);
    left.multiplyScalar(strafeVelocity * acceleration * timeElapsedS);
  
    const currentVelocity = this.cameraRigidBody_.getLinearVelocity();
    const desiredVelocity = new Ammo.btVector3(
      forward.x + left.x,
      currentVelocity.y(),
      forward.z + left.z
    );
  
    const velocityChange = new Ammo.btVector3(
      desiredVelocity.x() - currentVelocity.x(),
      desiredVelocity.y() - currentVelocity.y(),
      desiredVelocity.z() - currentVelocity.z()
    );
    velocityChange.op_mul(damping);

    //debugger;
   
    this.cameraRigidBody_.setLinearVelocity(
      new Ammo.btVector3(
        currentVelocity.x() + velocityChange.x(),
        currentVelocity.y() + velocityChange.y(),
        currentVelocity.z() + velocityChange.z()
      )
    );
  
    // ...
  
    if (forwardVelocity == 0 || strafeVelocity == 0) {
      this.headBobActive_ = true;
    }
  }

  updateRotation_(timeElapsedS) {
    const xh = this.input_.current_.mouseXDelta / window.innerWidth;
    const yh = this.input_.current_.mouseYDelta / window.innerHeight;

    this.phi_ += -xh * this.phiSpeed_;
    this.theta_ = clamp(
      this.theta_ + -yh * this.thetaSpeed_,
      -Math.PI / 3,
      Math.PI / 3
    );

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);
    const qz = new THREE.Quaternion();
    qz.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.theta_);

    const q = new THREE.Quaternion();
    q.multiply(qx);
    q.multiply(qz);

    this.rotation_.copy(q);
  }
}

class FirstPersonCameraDemo {
  constructor() {
    this.isAnimationRunning_ = false; // Flag to track if animation is running
    this.audioContext_ = null; // Audio context
    this.audioBuffer_ = null; // Audio buffer

    this.rigidBodies = [];

    this.initialize_();
  }

  async initialize_() {
    this.initializeRenderer_();
    
    this.initializeLights_();
    this.initializeScene_();
    
    this.initializePointerLock_();
    // Add the mouse click event listener
    this.initializeMouseClickListener_();
    this.initializeAmmo();
    this.audioContext_ = new (window.AudioContext)();
    await this.loadAudioFile_("resources/shotgunFire.m4a");

    this.previousRAF_ = null;
    this.raf_();
    this.onWindowResize_();
  }

  async loadAudioFile_(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer_ = await this.audioContext_.decodeAudioData(arrayBuffer);
  }

  initializeAmmo() {
    Ammo().then((Ammo) => {
      Ammo = Ammo;
      this.ammoClone = Ammo;
      this.createAmmo(Ammo);
      console.log("started ammo");
    });
  }

  createAmmo(Ammo = this.ammoClone) {
    this.tempTransform = new Ammo.btTransform();
    //this.redBallForce_ = new this.ammoClone.btVector3(1, 0, 1); // Adjust the force direction and magnitude as needed
    this.setupPhysicsWorld(Ammo);
    this.createPlane(Ammo);
    this.createBall(Ammo);
    this.createBall2(Ammo);
    this.createObjects();
    this.initializeDemo_(Ammo);
  }

  setupPhysicsWorld(Ammo = this.ammoClone) {
    let collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    let dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    let overlappingPairCache = new Ammo.btDbvtBroadphase();
    let solver = new Ammo.btSequentialImpulseConstraintSolver();

 
  //dispatcher.registerNearCallback(collisionCallback.bind(this));
    this.physicsWorld = new Ammo.btDiscreteDynamicsWorld(
      dispatcher,
      overlappingPairCache,
      solver,
      collisionConfiguration,

    );
    this.physicsWorld.setGravity(new Ammo.btVector3(0, -10, 0));
    console.log("physics world init");
  }

  createPlane(Ammo = this.ammoClone) {
    let pos = { x: 0, y: 0, z: 0 };
    let scale = { x: 100, y: 1, z: 100 };
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 0; // Set mass to 0 for a static object

    const mapLoader = new THREE.TextureLoader();
    const maxAnisotropy = this.threejs_.capabilities.getMaxAnisotropy();
    const grass = mapLoader.load("resources/grass01.jpg");

    grass.anisotropy = maxAnisotropy;
    grass.wrapS = THREE.RepeatWrapping;
    grass.wrapT = THREE.RepeatWrapping;
    grass.repeat.set(32, 32);
    //grass.outputColorSpace = THREE.colorSpace;

    // Three.js plane
    const blockPlane = new THREE.Mesh(
      new THREE.BoxGeometry(scale.x, scale.y, scale.z),
      new THREE.MeshStandardMaterial({ color: "grey", map: grass })
    );
    blockPlane.position.set(pos.x, pos.y, pos.z);
    blockPlane.receiveShadow = true;

    this.scene_.add(blockPlane);

    // Ammo.js collision shape
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    let motionState = new Ammo.btDefaultMotionState(transform);

    let shape = new Ammo.btBoxShape(
      new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
    );
    shape.setMargin(0.1);

    let localInertia = new Ammo.btVector3(0, 0, 0);
    shape.calculateLocalInertia(mass, localInertia);
    
    
    let rigidBodyInfo = new Ammo.btRigidBodyConstructionInfo( mass, motionState, shape, localInertia );
    let rigidBody = new Ammo.btRigidBody(rigidBodyInfo);

    //rigidBody.setRollingFriction(5)
    this.physicsWorld.addRigidBody(rigidBody);
  }

  createBall(Ammo = this.ammoClone) {
    let pos = { x: 0, y: 20, z: -20 },
      radius = 2,
      quat = { x: 0, y: 0, z: 0, w: 1 },
      mass = 3;

      
    // Ball in THREE.js
    let ballGeometry = new THREE.SphereGeometry(radius);
    let ballMaterial = new THREE.MeshPhongMaterial({ color: "red" });
    for(let i = -24; i < 40; i+=8){
      for (let j = -20; j < 40; j += 4) {
    let ball = new THREE.Mesh(ballGeometry, ballMaterial);

    ball.userData.geometry = ballGeometry; // Store the geometry
    ball.userData.material = ballMaterial; // Store the material

    ball.position.set(i, pos.y, j);

    ball.castShadow = true;
    ball.receiveShadow = true;

    this.scene_.add(ball);

    // Physics in Ammo.js
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(i, pos.y, j));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );

    let motionState = new Ammo.btDefaultMotionState(transform);

    let localInertia = new Ammo.btVector3(0, 0, 0);

    let shape = new Ammo.btSphereShape(radius);
    shape.setMargin(0.05);
    shape.calculateLocalInertia(mass, localInertia);

    let rigidBodyInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      shape,
      localInertia
    );
    let rigidBody = new Ammo.btRigidBody(rigidBodyInfo);
    const forcePosition = new Ammo.btVector3(rigidBody.position);

    //rigidBody.applyImpulse(this.redBallForce_, forcePosition);

    this.physicsWorld.addRigidBody(rigidBody);

    ball.userData.physicsBody = rigidBody;
    this.rigidBodies.push(ball);
  }
}
  }

  createBall2(Ammo = this.ammoClone) {
    let pos = { x: 0, y: 30, z: -25 },
      radius = 5,
      quat = { x: 0, y: 0, z: 0, w: 1 },
      mass = 10;

    // Ball in THREE.js
    let ballGeometry2 = new THREE.SphereGeometry(radius);
    let ballMaterial2 = new THREE.MeshPhongMaterial({ color: "orange" });
    let ball2 = new THREE.Mesh(ballGeometry2, ballMaterial2);

    ball2.position.set(pos.x, pos.y, pos.z);

    ball2.castShadow = true;
    ball2.receiveShadow = true;

    this.scene_.add(ball2);

    // Physics in Ammo.js
    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );

    let motionState = new Ammo.btDefaultMotionState(transform);

    let localInertia = new Ammo.btVector3(0, 0, 0);

    let shape = new Ammo.btSphereShape(radius);
    shape.setMargin(0.05);
    shape.calculateLocalInertia(mass, localInertia);

    let rigidBodyInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      shape,
      localInertia
    );
    let rigidBody = new Ammo.btRigidBody(rigidBodyInfo);

    this.physicsWorld.addRigidBody(rigidBody);
    ball2.userData.physicsBody = rigidBody;
    this.rigidBodies.push(ball2);
  }

  createPellets(Ammo = this.ammoClone) {
    let quat = { x: 0, y: 0, z: 0, w: 1 };
    let mass = 2.5;
    let sphereSize = 0.35; // Specify the size of the sphere
  
    const cameraPosition = this.camera_.position;
    const cameraDirection = new THREE.Vector3();
    this.camera_.getWorldDirection(cameraDirection);
  
    const horizontalDirection = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
    const verticalDirection = new THREE.Vector3(0, 1, 0);
    const perpDirection = horizontalDirection.clone().cross(verticalDirection).normalize();
  
    const numSpheres = 10;
    const spacing = 1;
  
    for (let i = 0; i < numSpheres; i++) {
      const offset = (i - Math.floor(numSpheres / 2)) * spacing;
      const pos = {
        x: cameraPosition.x + horizontalDirection.x * 2 + perpDirection.x * offset,
        y: cameraPosition.y,
        z: cameraPosition.z + horizontalDirection.z * 2 + perpDirection.z * offset
      };
  
      // sphere in THREE.js
      let sphereGeometry = new THREE.SphereGeometry(sphereSize);
      let sphereMaterial = new THREE.MeshPhongMaterial({ color: "green" });
      let sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(pos.x, pos.y, pos.z);
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      sphere.userData.isSphere = true; // Set the isSphere flag

      this.scene_.add(sphere);
  
      // Physics in Ammo.js
      let transform = new Ammo.btTransform();
      transform.setIdentity();
      transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
      transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
  
      let motionState = new Ammo.btDefaultMotionState(transform);
      let localInertia = new Ammo.btVector3(0, 0, 0);
  
      let shape = new Ammo.btSphereShape(sphereSize);
      shape.setMargin(0.05);
      shape.calculateLocalInertia(mass, localInertia);
  
      let rigidBodyInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
      let rigidBody = new Ammo.btRigidBody(rigidBodyInfo);
      //rigidBody.setRollingFriction(1000)
      // Apply the impulse force to the sphere in the camera's direction
      let impulse = new Ammo.btVector3(cameraDirection.x, cameraDirection.y, cameraDirection.z);
      const fireForce = 100;
      impulse.op_mul(fireForce);
      rigidBody.setLinearVelocity(impulse);
  
      this.physicsWorld.addRigidBody(rigidBody);
      sphere.userData.physicsBody = rigidBody;
      this.rigidBodies.push(sphere);
    }
  }

  


  createWall1(Ammo = this.ammoClone) {
    const pos = { x: 0, y: -40, z: -50 };
    const scale = { x: 100, y: 100, z: 4 };
    const quat = { x: 0, y: 0, z: 0, w: 1 };
    const mass = 0;

    const wall1 = new THREE.Mesh(
      new THREE.BoxGeometry(scale.x, scale.y, scale.z),
      this.loadMaterial_("concrete3-", 4)
    );
    wall1.position.set(pos.x, pos.y, pos.z);
    wall1.castShadow = true;
    wall1.receiveShadow = true;
    this.scene_.add(wall1);

    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    const motionState = new Ammo.btDefaultMotionState(transform);

    const localInertia = new Ammo.btVector3(0, 0, 0);
    const shape = new Ammo.btBoxShape(
      new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
    );
    shape.setMargin(0.05);
    shape.calculateLocalInertia(mass, localInertia);

    const rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      shape,
      localInertia
    );
    const wall1RigidBody = new Ammo.btRigidBody(rbInfo);
    this.physicsWorld.addRigidBody(wall1RigidBody);

    wall1.userData.physicsBody = wall1RigidBody;
    this.rigidBodies.push(wall1);
  }

  createWall2(Ammo = this.ammoClone) {
    const pos = { x: 0, y: -40, z: 50 };
    const scale = { x: 100, y: 100, z: 4 };
    const quat = { x: 0, y: 0, z: 0, w: 1 };
    const mass = 0;

    const wall1 = new THREE.Mesh(
      new THREE.BoxGeometry(scale.x, scale.y, scale.z),
      this.loadMaterial_("concrete3-", 4)
    );
    wall1.position.set(pos.x, pos.y, pos.z);
    wall1.castShadow = true;
    wall1.receiveShadow = true;
    this.scene_.add(wall1);

    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    const motionState = new Ammo.btDefaultMotionState(transform);

    const localInertia = new Ammo.btVector3(0, 0, 0);
    const shape = new Ammo.btBoxShape(
      new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
    );
    shape.setMargin(0.05);
    shape.calculateLocalInertia(mass, localInertia);

    const rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      shape,
      localInertia
    );
    const wall1RigidBody = new Ammo.btRigidBody(rbInfo);
    this.physicsWorld.addRigidBody(wall1RigidBody);

    wall1.userData.physicsBody = wall1RigidBody;
    this.rigidBodies.push(wall1);
  }

  createWall3(Ammo = this.ammoClone) {
    const pos = { x: 50, y: -40, z: 0 };
    const scale = { x: 4, y: 100, z: 100 };
    const quat = { x: 0, y: 0, z: 0, w: 1 };
    const mass = 0;

    const wall1 = new THREE.Mesh(
      new THREE.BoxGeometry(scale.x, scale.y, scale.z),
      this.loadMaterial_("concrete3-", 4)
    );
    wall1.position.set(pos.x, pos.y, pos.z);
    wall1.castShadow = true;
    wall1.receiveShadow = true;
    this.scene_.add(wall1);

    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    const motionState = new Ammo.btDefaultMotionState(transform);

    const localInertia = new Ammo.btVector3(0, 0, 0);
    const shape = new Ammo.btBoxShape(
      new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
    );
    shape.setMargin(0.05);
    shape.calculateLocalInertia(mass, localInertia);

    const rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      shape,
      localInertia
    );
    const wall1RigidBody = new Ammo.btRigidBody(rbInfo);
    this.physicsWorld.addRigidBody(wall1RigidBody);

    wall1.userData.physicsBody = wall1RigidBody;
    this.rigidBodies.push(wall1);
  }

  createWall4(Ammo = this.ammoClone) {
    const pos = { x: -50, y: -40, z: 0 };
    const scale = { x: 4, y: 100, z: 100 };
    const quat = { x: 0, y: 0, z: 0, w: 1 };
    const mass = 0;

    const wall1 = new THREE.Mesh(
      new THREE.BoxGeometry(scale.x, scale.y, scale.z),
      this.loadMaterial_("concrete3-", 4)
    );
    wall1.position.set(pos.x, pos.y, pos.z);
    wall1.castShadow = true;
    wall1.receiveShadow = true;
    this.scene_.add(wall1);

    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
    transform.setRotation(
      new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w)
    );
    const motionState = new Ammo.btDefaultMotionState(transform);

    const localInertia = new Ammo.btVector3(0, 0, 0);
    const shape = new Ammo.btBoxShape(
      new Ammo.btVector3(scale.x * 0.5, scale.y * 0.5, scale.z * 0.5)
    );
    shape.setMargin(0.05);
    shape.calculateLocalInertia(mass, localInertia);

    const rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      shape,
      localInertia
    );
    const wall1RigidBody = new Ammo.btRigidBody(rbInfo);
    this.physicsWorld.addRigidBody(wall1RigidBody);

    wall1.userData.physicsBody = wall1RigidBody;
    this.rigidBodies.push(wall1);
  }

  createObjects() {
    const pos1 = { x: 0, y: -40, z: -50 };
    this.createWall1();
    this.createWall2();
    this.createWall3();
    //this.createWall4();

    const meshes = [
      this.rigidBodies[this.rigidBodies.length - 4],
      this.rigidBodies[this.rigidBodies.length - 3],
      this.rigidBodies[this.rigidBodies.length - 2],
      this.rigidBodies[this.rigidBodies.length - 1],
    ];

    this.objects_ = [];
    for (let i = 0; i < meshes.length; ++i) {
      const b = new THREE.Box3();
      b.setFromObject(meshes[i]);
      this.objects_.push(b);
    }
  }

  updatePhysics(timeElapsedS, Ammo = this.ammoClone) {
    this.physicsWorld.stepSimulation(timeElapsedS, 10);
  
    for (let i = 0; i < this.rigidBodies.length; i++) {
      let threeObject = this.rigidBodies[i];
      let ammoObject = threeObject.userData.physicsBody;
      let motionState = ammoObject.getMotionState();
  
      if (motionState) {
        motionState.getWorldTransform(this.tempTransform);
        let pos = this.tempTransform.getOrigin();
        let quat = this.tempTransform.getRotation();
        threeObject.position.set(pos.x(), pos.y(), pos.z());
        threeObject.quaternion.set(quat.x(), quat.y(), quat.z(), quat.w());
  
        if(threeObject.material.color.equals(new THREE.Color("red"))){
          const cameraPosition = this.camera_.position;
          const ballPosition = new THREE.Vector3(pos.x(), pos.y(), pos.z());
          const direction = new THREE.Vector3().subVectors(cameraPosition, ballPosition).normalize();
          const forceDirection = new Ammo.btVector3(direction.x, direction.y, direction.z);
          const forceMagnitude = 20; // Adjust the force magnitude as needed
          forceDirection.op_mul(forceMagnitude);
          const forcePosition = new Ammo.btVector3(pos.x(), pos.y(), pos.z());
          ammoObject.applyForce(forceDirection, forcePosition);

        }
      }
    }
  }

  playSound_() {
    const source = this.audioContext_.createBufferSource();
    source.buffer = this.audioBuffer_;
    source.connect(this.audioContext_.destination);
    source.start();
  }

  /**
   * handle the mouse being clicked (fire)
   */
  initializeMouseClickListener_() {
    // Function to be executed when the mouse is clicked
    const onMouseClick = (event) => {
      // Check if animation is not running
      if (!this.isAnimationRunning_) {
        // Access the clicked coordinates
        const clickX = this.camera_.position.x;
        const clickY = this.camera_.position.y;

        // Trigger the firing animation
        this.startFiringAnimation_();
        this.createPellets();
        // Do something with the click event
        console.log(`Mouse clicked at coordinates: (${clickX}, ${clickY})`);
      }
    };

    // Add the event listener to the desired element or the entire document
    document.addEventListener("click", onMouseClick);
  }
  /**
   * fire the gun/do animation
   */
  startFiringAnimation_() {
    // Create a new object to represent the firing animation
    this.isAnimationRunning_ = true;
    this.playSound_();

    this.uiScene_.remove(this.sprite2_);
    const firingAnimation = new THREE.Object3D();

    // Create an array to store the sprite textures
    const spriteTextures = [];

    // Load the sprite textures
    const loader = new THREE.TextureLoader();
    for (let i = 1; i < 5; i++) {
      const texture = loader.load(`resources/shotgun_sprites/shotgun${i}.png`);
      spriteTextures.push(texture);
    }

    // Create a sprite material with the first texture
    const spriteMaterial = new THREE.SpriteMaterial({
      map: spriteTextures[0],
      //transparent: true,
    });

    // Create a sprite and position it in front of the camera
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(1, 1 * this.camera_.aspect, 1);
    sprite.position.set(-0.02, -1, -1);

    // Add the sprite to the firing animation object
    firingAnimation.add(sprite);

    // Add the firing animation to the camera
    this.uiScene_.add(firingAnimation);

    // Set the duration of each sprite frame (in milliseconds)
    const frameDuration = 200;

    // Cycle through the sprite textures
    let currentFrame = 0;
    const animationLoop = () => {
      setTimeout(() => {
        currentFrame++;
        if (currentFrame < spriteTextures.length) {
          spriteMaterial.map = spriteTextures[currentFrame];
          spriteMaterial.needsUpdate = true;
          animationLoop();
        } else {
          // Remove the firing animation after the last frame
          this.uiScene_.remove(firingAnimation);
          this.uiScene_.add(this.sprite2_);
          this.isAnimationRunning_ = false;
        }
      }, frameDuration);
    };

    // Start the animation loop
    animationLoop();
  }

  initializeDemo_(Ammo = this.ammoClone) {
      this.fpsCamera_ = new FirstPersonCamera(this.camera_, this.objects_, Ammo);
      let cameraShape = new Ammo.btSphereShape(2); // Adjust the shape and size as needed
      const cameraPos = new Ammo.btVector3(
        this.camera_.position.x,
        this.camera_.position.y+10,
        this.camera_.position.z+50
      );
      const cameraQuat = new Ammo.btQuaternion(0, 0, 0, 1);
  const cameraMass = 5; // Adjust the mass as needed
  const cameraLocalInertia = new Ammo.btVector3(0, 0, 0);
  cameraShape.calculateLocalInertia(cameraMass, cameraLocalInertia);

  const cameraRbInfo = new Ammo.btRigidBodyConstructionInfo(
    cameraMass,
    new Ammo.btDefaultMotionState(new Ammo.btTransform(cameraQuat, cameraPos)),
    cameraShape,
    cameraLocalInertia
  );
  this.fpsCamera_.cameraRigidBody_ = new Ammo.btRigidBody(cameraRbInfo);
  console.log(this.fpsCamera_?.cameraRigidBody_);
  this.physicsWorld.addRigidBody(this.fpsCamera_.cameraRigidBody_);

      console.log("started ammo2");
    
    // Create a rigidbody for the camera
    
    

  }

  initializeRenderer_() {
    this.threejs_ = new THREE.WebGLRenderer({
      antialias: false,
    });
    this.threejs_.shadowMap.enabled = true;
    this.threejs_.shadowMap.type = THREE.PCFSoftShadowMap;
    this.threejs_.setPixelRatio(window.devicePixelRatio);
    this.threejs_.setSize(window.innerWidth, window.innerHeight);
    this.threejs_.physicallyCorrectLights = true;
    //this.threejs_.outputEncoding = THREE.sRGBEncoding;

    document.body.appendChild(this.threejs_.domElement);

    window.addEventListener(
      "resize",
      () => {
        this.onWindowResize_();
      },
      false
    );

    //this.canvas.style.cursor = 'none';

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this.camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera_.position.set(0, 3, 0);

    this.scene_ = new THREE.Scene();

    this.uiCamera_ = new THREE.OrthographicCamera(
      -1,
      1,
      1 * aspect,
      -1 * aspect,
      1,
      1000
    );
    this.uiScene_ = new THREE.Scene();
  }
  initializePointerLock_() {
    const canvas = this.threejs_.domElement;
    canvas.requestPointerLock =
      canvas.requestPointerLock || canvas.mozRequestPointerLock;
    document.exitPointerLock =
      document.exitPointerLock || document.mozExitPointerLock;

    canvas.onclick = () => {
      canvas.requestPointerLock();
      //console.log("fire!")
    };

    document.addEventListener(
      "pointerlockchange",
      this.onPointerLockChange_.bind(this),
      false
    );
    document.addEventListener(
      "mozpointerlockchange",
      this.onPointerLockChange_.bind(this),
      false
    );
  }

  onPointerLockChange_() {
    if (
      document.pointerLockElement === this.threejs_.domElement ||
      document.mozPointerLockElement === this.threejs_.domElement
    ) {
      //console.log('Pointer locked');
    } else {
      //console.log('Pointer unlocked');
    }
  }
  // /*
  // Initialize World
  initializeScene_() {
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
      "./resources/skybox/posx.png",
      "./resources/skybox/negx.png",
      "./resources/skybox/posy.png",
      "./resources/skybox/negz.png",
      "./resources/skybox/posz.png",
      "./resources/skybox/negy.png",
    ]);

    //texture.encoding = THREE.sRGBEncoding;
    this.scene_.background = texture;

    

    // Checkerboard pattern for ground plane
    const mapLoader = new THREE.TextureLoader();
    const maxAnisotropy = this.threejs_.capabilities.getMaxAnisotropy();
    const grass = mapLoader.load("resources/grassNormal.png");
    grass.anisotropy = maxAnisotropy;
    grass.wrapS = THREE.RepeatWrapping;
    grass.wrapT = THREE.RepeatWrapping;
    grass.repeat.set(32, 32);
    //grass.encoding = THREE.sRGBEncoding;

    /*
    // Ground Plane
    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100, 10, 10),
        new THREE.MeshStandardMaterial({map: checkerboard}));
    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    this.scene_.add(plane);
      */

    /*
    // Box in middle of plane
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(4, 4, 4),
      this.loadMaterial_('vintage-tile1_', 0.2));
    box.position.set(10, 2, 0);
    box.castShadow = true;
    box.receiveShadow = true;
    this.scene_.add(box);
  */

    /*
    const concreteMaterial = this.loadMaterial_('concrete3-', 4);


    
    // Walls
    const wall1 = new THREE.Mesh(
      new THREE.BoxGeometry(100, 100, 4),
      concreteMaterial);
    wall1.position.set(0, -40, -50);
    wall1.castShadow = true;
    wall1.receiveShadow = true;
    this.scene_.add(wall1);

    const wall2 = new THREE.Mesh(
      new THREE.BoxGeometry(100, 100, 4),
      concreteMaterial);
    wall2.position.set(0, -40, 50);
    wall2.castShadow = true;
    wall2.receiveShadow = true;
    this.scene_.add(wall2);

    const wall3 = new THREE.Mesh(
      new THREE.BoxGeometry(4, 100, 100),
      concreteMaterial);
    wall3.position.set(50, -40, 0);
    wall3.castShadow = true;
    wall3.receiveShadow = true;
    this.scene_.add(wall3);

    const wall4 = new THREE.Mesh(
      new THREE.BoxGeometry(4, 100, 100),
      concreteMaterial);
    wall4.position.set(-50, -40, 0);
    wall4.castShadow = true;
    wall4.receiveShadow = true;
    this.scene_.add(wall4);

    // Create Box3 for each mesh in the scene so that we can
    // do some easy intersection tests.
    const meshes = [
      wall1, wall2, wall3, wall4]; // Deleted plane and box

    this.objects_ = [];

    for (let i = 0; i < meshes.length; ++i) {
      const b = new THREE.Box3();
      b.setFromObject(meshes[i]);
      this.objects_.push(b);
    }
*/

    // Crosshair
    const crosshair = mapLoader.load("resources/crosshair.png");
    crosshair.anisotropy = maxAnisotropy;

    this.sprite_ = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: crosshair,
        color: 0xffffff,
        fog: false,
        depthTest: false,
        depthWrite: false,
      })
    );
    this.sprite_.scale.set(0.15, 0.15 * this.camera_.aspect, 1);
    this.sprite_.position.set(0, 0, -10);

    this.uiScene_.add(this.sprite_);

    // Shotgun
    const shotgun = mapLoader.load("resources/shotgun_sprites/shotgun1.png");
    //shotgun.anisotropy = maxAnisotropy;

    this.sprite2_ = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: shotgun,
        color: 0xffffff,
        fog: false,
        depthTest: false,
        depthWrite: false,
      })
    );
    this.sprite2_.scale.set(1, 1 * this.camera_.aspect, 1);
    this.sprite2_.position.set(-0.02, -1, -1);

    this.uiScene_.add(this.sprite2_);
    const message = 'Use W, A, S, D to move. Click to shoot. Space to jump.\n Clear the balls out of the zone!';
    const messageSprite = renderMessage(message, 550, 40, 24, 'black');
    messageSprite.scale.set(3, 3 * this.camera_.aspect, 3);
    messageSprite.position.set(-0.5, -1, -1);
    this.uiScene_.add(messageSprite);
  }
  initializeLights_() {
    const distance = 100.0;
    const angle = Math.PI / 2.5;
    const penumbra = 1;
    const decay = 1;

    let light = new THREE.SpotLight(
      0xffffff,
      100.0,
      distance,
      angle,
      penumbra,
      decay
    );
    light.castShadow = true;
    light.shadow.bias = -0.00001;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 100;

    light.position.set(25, 25, 0);
    light.lookAt(0, 0, 0);
    this.scene_.add(light);

    const upColour = 0xffff80;
    const downColour = 0x808080;
    light = new THREE.HemisphereLight(upColour, downColour, 0.5);
    light.color.setHSL(0.6, 1, 0.6);
    light.groundColor.setHSL(0.095, 1, 0.75);
    light.position.set(0, 4, 0);
    this.scene_.add(light);
  }

  loadMaterial_(name, tiling) {
    const mapLoader = new THREE.TextureLoader();
    const maxAnisotropy = this.threejs_.capabilities.getMaxAnisotropy();

    const metalMap = mapLoader.load(
      "resources/freepbr/" + name + "metallic.png"
    );
    metalMap.anisotropy = maxAnisotropy;
    metalMap.wrapS = THREE.RepeatWrapping;
    metalMap.wrapT = THREE.RepeatWrapping;
    metalMap.repeat.set(tiling, tiling);

    const albedo = mapLoader.load("resources/freepbr/" + name + "albedo.png");
    albedo.anisotropy = maxAnisotropy;
    albedo.wrapS = THREE.RepeatWrapping;
    albedo.wrapT = THREE.RepeatWrapping;
    albedo.repeat.set(tiling, tiling);
    //albedo.encoding = THREE.sRGBEncoding;

    const normalMap = mapLoader.load(
      "resources/freepbr/" + name + "normal.png"
    );
    normalMap.anisotropy = maxAnisotropy;
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(tiling, tiling);

    const roughnessMap = mapLoader.load(
      "resources/freepbr/" + name + "roughness.png"
    );
    roughnessMap.anisotropy = maxAnisotropy;
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(tiling, tiling);

    const material = new THREE.MeshStandardMaterial({
      metalnessMap: metalMap,
      map: albedo,
      normalMap: normalMap,
      roughnessMap: roughnessMap,
    });

    return material;
  }

  onWindowResize_() {
    this.camera_.aspect = window.innerWidth / window.innerHeight;
    this.camera_.updateProjectionMatrix();

    this.uiCamera_.left = -this.camera_.aspect;
    this.uiCamera_.right = this.camera_.aspect;
    this.uiCamera_.updateProjectionMatrix();
    this.threejs_.setSize(window.innerWidth, window.innerHeight);
  }

  raf_() {
    requestAnimationFrame((t) => {
      if (this.previousRAF_ === null) {
        this.previousRAF_ = t;
      }

      this.step_(t - this.previousRAF_);
      this.threejs_.autoClear = true;
      this.threejs_.render(this.scene_, this.camera_);
      this.threejs_.autoClear = false;
      this.threejs_.render(this.uiScene_, this.uiCamera_);
      this.previousRAF_ = t;
      this.raf_();
    });
  }

  step_(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;

    if (this.physicsWorld) {
      this.updatePhysics(timeElapsedS);
    }
    this.fpsCamera_.update(timeElapsedS, Ammo);
  }
}

let _APP = null;

window.addEventListener("DOMContentLoaded", () => {
  _APP = new FirstPersonCameraDemo();
});
// Collision detection callback function
function collisionCallback(event) {
  const contactPoint = event.get_m_contactPoint();
  const collisionPoint = new THREE.Vector3(contactPoint.x(), contactPoint.y(), contactPoint.z());

  const objA = event.get_m_collisionObjectA().getUserIndex();
  const objB = event.get_m_collisionObjectB().getUserIndex();

  // Check if either of the colliding objects is a sphere
  if (objA >= 0 && objA < this.rigidBodies.length && this.rigidBodies[objA].userData.isSphere ||
      objB >= 0 && objB < this.rigidBodies.length && this.rigidBodies[objB].userData.isSphere) {
    // Sphere collision detected, apply breakage effect
    const sphereIndex = objA >= 0 && objA < this.rigidBodies.length && this.rigidBodies[objA].userData.isSphere ? objA : objB;
    this.breakSphere(sphereIndex, collisionPoint);
  }
}
function renderMessage(message, x, y, fontSize, fontColor) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  context.font = `${fontSize}px Arial`;
  context.fillStyle = fontColor;
  context.fillText(message, x, y);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(canvas.width, canvas.height, 1);
  return sprite;
}
 