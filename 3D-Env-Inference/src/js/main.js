// import 'bootstrap';
import * as THREE from 'three';
import {
    OrbitControls
} from 'three/examples/jsm/controls/OrbitControls';


let camera, scene, renderer;
let topRenderer, camera2
let cube, backWall, leftWall, rightWall, frontWall;
let moveForward = false,
    moveBackward = false,
    moveLeft = false,
    moveRight = false,
    rotateLeft = false,
    rotateRight = false;
let characterSpeed = 0.1;
let rotationSpeed = 0.05;
let previousCubePosition = new THREE.Vector3();
let tfliteModel;
let inferenceResult = '';
let labelElement;
let pixels;


async function loadModel() {
    tfliteModel = await tflite.loadTFLiteModel("http://localhost:1234/ObjectDetector.tflite");
    console.log('Tensor Flow Model Loaded');
}


function init() {
    loadModel();           
    // SCENE
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf2f2f2);

    // MAIN CAMERA
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 5;

    // TOP Camera
    camera2 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera2.position.set(0, 0, 0); // set the position of the camera to the top right corner of the scene

    //Lights

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(-10, 30, -10);
    light.castShadow = true;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 100;
    light.intensity = 1;
    light.shadow.mapSize.width = 1200;
    light.shadow.mapSize.height = 1200;
    scene.add(light);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);


    // OBJECTS
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF,
        metalness: 0.2,
        roughness: 0.8
    });
    
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.set(0, -0.5, 0);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    plane.castShadow = true;
    scene.add(plane);

    // CUBE/AI Textures/Material

    const cubeTextureEye = new THREE.TextureLoader().load("cubeTextureEye.png");
    const cubeTextureTop = new THREE.TextureLoader().load("cubeTextureTop.png");
    const cubeTextureFace = new THREE.TextureLoader().load("cubeTextureFace.png");
    var materialFront = new THREE.MeshBasicMaterial({ map: cubeTextureFace });
    var materialBack = new THREE.MeshBasicMaterial({ map: cubeTextureFace });
    var materialTop = new THREE.MeshBasicMaterial({ map: cubeTextureTop });
    var materialBottom = new THREE.MeshBasicMaterial({ map: cubeTextureFace });
    var materialLeft = new THREE.MeshBasicMaterial({ map: cubeTextureFace });
    var materialRight = new THREE.MeshBasicMaterial({ map: cubeTextureEye });
    
    // Create a mesh face material and assign the materials to the cube faces
    var cubeMaterial = [
        materialFront, materialBack, materialTop,
        materialBottom, materialLeft, materialRight
    ];

    // Cube
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);
    cube.add(camera2);
    
    // Object to count
    const sphereGeometry = new THREE.SphereGeometry(0.4, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    sphere.position.set(0, 1, -3);  // Adjust the position as needed l, r
    scene.add(sphere);


    // Walls :
    const wallGeometry = new THREE.BoxGeometry(10, 5, 0.01);

    // MATERIALS:

    const wallMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0.5        
    });

    backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(0, 2, -5);
    
    const leftWallGeometry = new THREE.BoxGeometry(0.01, 5, 10);
    leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-5, 2, 0);

    const rightWallGeometry = new THREE.BoxGeometry(0.01, 5, 10);
    rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(5, 2, 0);

    const frontWallGeometry = new THREE.BoxGeometry(10, 5, 0.01);
    frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(0, 2, 5);

    scene.add(backWall);
    scene.add(leftWall);
    scene.add(rightWall);
    scene.add(frontWall);

    //Renderer Main
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    //Renderer Top
    topRenderer = new THREE.WebGLRenderer({
        antialias: true        
    });
    topRenderer.setClearColor(0x000000, 0); // set the background color to transparent
    // topRenderer.setSize(window.innerWidth / 4, window.innerHeight / 4); // set the size of the viewport
    topRenderer.setSize(384,210);
    topRenderer.domElement.style.position = 'absolute'; // set the position of the viewport
    topRenderer.domElement.style.top = '10px'; // set the top position of the viewport
    topRenderer.domElement.style.right = '10px'; // set the right position of the viewport
    document.body.appendChild(topRenderer.domElement);

    // Add a style rule to the topRenderer's DOM element
    const style = document.createElement('style');
    style.textContent = `.outlined-viewport {outline: 2px solid black;}`;
    document.head.appendChild(style);

    // Add a class to the topRenderer's DOM element
    topRenderer.domElement.classList.add('outlined-viewport');

    // UI

    const container = document.createElement('div');
    container.id = 'container';
    container.appendChild(renderer.domElement);
    // Append the container to the document body
    document.body.appendChild(container);
    // Create the overlay element
    const overlay = document.createElement('div');
    overlay.id = 'overlay';

    // Position the overlay using CSS
    overlay.style.position = 'absolute';
    overlay.style.top = '20px';
    overlay.style.left = '20px';
    overlay.style.zIndex = '1';
    // Create the sidebar with Bootstrap buttons
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    
    // BUTTONS 
    
    const button1 = document.createElement('button');
    button1.className = 'btn btn-dark btn-sm';
    button1.textContent = 'INFER';
    sidebar.appendChild(button1);
    overlay.appendChild(sidebar);

    // Append the overlay to the container
    container.appendChild(overlay);

    // INFERENCE LABEL: 
    const lineBreak = document.createElement('br');    
    labelElement = document.createElement('span');
    const h5 = document.createElement('h5');
    // labelElement.className = 'badge text-bg-primary';
    labelElement.innerHTML = `${inferenceResult}`;
    h5.appendChild(labelElement);
    sidebar.appendChild(lineBreak);
    sidebar.appendChild(h5);
    button1.addEventListener("click", captureAndInfer);

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;

    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);    

}


async function captureAndInfer() {
    topRenderer.render(scene, camera2);

    // Wait for the rendering to complete
    await new Promise((resolve) => requestAnimationFrame(resolve));

    let imageData = topRenderer.domElement.toDataURL("image/png");
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');
    canvas.width = topRenderer.domElement.width;
    canvas.height = topRenderer.domElement.height;
    let image = new Image();
    image.src = imageData;

    // Wait for the image to load before performing inference
    await new Promise((resolve) => {
        image.onload = resolve;
    });

    context.drawImage(image, 0, 0);
    pixels = tf.browser.fromPixels(canvas);

    // Perform inference asynchronously
    try {
        let isInferenceSuccessful = await performInference(pixels);
        console.log('isInferenceSuccessful', isInferenceSuccessful);

        if (isInferenceSuccessful) {
            inferenceResult = 'OBJECT DETECTED';
            console.log('OBJECT DETECTED');
            labelElement.className = 'badge text-bg-success';
        } else {
            inferenceResult = 'NO OBJECT DETECTED';
            console.log('NO OBJECT DETECTED');
            labelElement.className = 'badge text-bg-danger';
        }

        labelElement.innerHTML = `${inferenceResult}`;
    } catch (error) {
        console.error('Error during inference:', error);
    }
}


async function performInference(pixels) {
    try {
        // Create Image
        console.log('Pixel values for dynamic image:', pixels.dataSync());
        let resizedTensor = tf.image.resizeBilinear(pixels, [150, 200]);
        let preprocessedTensor = tf.expandDims(resizedTensor, 0);

        // Run inference
        let predictions = tfliteModel.predict(preprocessedTensor);
        let outputData = predictions.dataSync();
        console.log(outputData);

        // Threshold for considering an object is detected
        let threshold = 0.5;
        let probability = outputData[0];
        console.log('Probabilities:', probability);

        // Clean up
        tf.dispose([resizedTensor, preprocessedTensor, predictions]);

        return probability < threshold;
    } catch (error) {
        console.error('Error during inference:', error);
        return false;
    }
}

function checkCollision() {
    // Create a bounding box for the cube
    const cubeBoundingBox = new THREE.Box3().setFromObject(cube);

    // Create a bounding box for the walls
    const backWallBoundingBox = new THREE.Box3().setFromObject(backWall);
    const leftWallBoundingBox = new THREE.Box3().setFromObject(leftWall);
    const rightWallBoundingBox = new THREE.Box3().setFromObject(rightWall);
    const frontWallBoundingBox = new THREE.Box3().setFromObject(frontWall);

    // Check for collision between the cube and the wall
    if (cubeBoundingBox.intersectsBox(backWallBoundingBox) ||
        cubeBoundingBox.intersectsBox(leftWallBoundingBox) ||
        cubeBoundingBox.intersectsBox(rightWallBoundingBox) ||
        cubeBoundingBox.intersectsBox(frontWallBoundingBox)) {
        // If there is a collision, move the cube back to its previous position
        cube.position.copy(previousCubePosition); //<<
    } else {
        // Update the previous cube position if there was no collision
        previousCubePosition.copy(cube.position);
    }


}

function animate() {
    checkCollision()
    requestAnimationFrame(animate);
    //  Rotate the cube
    if (rotateLeft) {
        cube.rotateY(rotationSpeed);
    }
    if (rotateRight) {
        cube.rotateY(-rotationSpeed);
    }

    // Move fron/back/left/right 
    if (moveForward && cube.position.z > -10 + characterSpeed) {
        cube.translateZ(-characterSpeed);
    }
    if (moveBackward && cube.position.z < 10 - characterSpeed) {
        cube.translateZ(characterSpeed);
    }
    if (moveLeft && cube.position.x > -10 + characterSpeed) {
        cube.translateX(-characterSpeed);
    }
    if (moveRight && cube.position.x < 10 - characterSpeed) {
        cube.translateX(characterSpeed);
    }



    renderer.render(scene, camera);
    topRenderer.render(scene, camera2);

}

function onKeyDown(event) {

    switch (event.code) {

        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;

        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;

        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;

        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;

        case 'KeyQ':
            rotateLeft = true;
            break;

        case 'KeyE':
            rotateRight = true;
            break;

    }

}

function onKeyUp(event) {

    switch (event.code) {

        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;

        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;

        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;

        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;

        case 'KeyQ':
            rotateLeft = false;
            break;

        case 'KeyE':
            rotateRight = false;
            break;

    }

}


window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}, false);


init();
animate();