import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- DOM Element References ---
const setupView = document.getElementById('setup-view');
const simulationView = document.getElementById('simulation-view');
const launchBtn = document.getElementById('launchBtn');
const backBtn = document.getElementById('backBtn');
// ... (all other input and status references are the same)
const pMaxDist = document.getElementById('p_max_dist'), pEccentricity = document.getElementById('p_eccentricity'), pInclination = document.getElementById('p_inclination'), pPeriod = document.getElementById('p_period'), pMinDistVal = document.getElementById('p_min_dist_val'), pEccVal = document.getElementById('p_ecc_val'), pIncVal = document.getElementById('p_inc_val');
const mMaxDist = document.getElementById('m_max_dist'), mEccentricity = document.getElementById('m_eccentricity'), mInclination = document.getElementById('m_inclination'), mPeriod = document.getElementById('m_period'), mMinDistVal = document.getElementById('m_min_dist_val'), mEccVal = document.getElementById('m_ecc_val'), mIncVal = document.getElementById('m_inc_val');
const mMaterial = document.getElementById('m_material'); 
const collisionStatus = document.getElementById('collision-status');
const simulationStatus = document.getElementById('simulation-status');
const container = document.getElementById('simulation-container');
const redirectBtn = document.getElementById('redirectBtn');

// --- Global Three.js Variables ---
let scene, camera, renderer, controls;
let planet, meteor, sun, planetOrbit, meteorOrbit;
let animationFrameId, isCollided, explosionParticles;

// --- Initialize the 3D Scene (called once) ---
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    
    container.appendChild(renderer.domElement);
    camera.position.set(0, 250, 500);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const sunLight = new THREE.PointLight(0xffffff, 3, 0, 0);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(sunLight, ambientLight);

    // --- Starfield ---
    const starVertices = [];
    for (let i = 0; i < 10000; i++) { starVertices.push((Math.random() - 0.5) * 4000, (Math.random() - 0.5) * 4000, (Math.random() - 0.5) * 4000); }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2 });
    scene.add(new THREE.Points(starGeometry, starMaterial));

    // Handle window resizing
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// --- Main Simulation Logic ---
function startSimulation() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    
    [planet, meteor, sun, planetOrbit, meteorOrbit, explosionParticles].forEach(obj => {
        if (obj) scene.remove(obj.mesh ? obj.mesh : obj);
    });

    isCollided = false;
    explosionParticles = null;
    simulationStatus.style.display = 'none';
    redirectBtn.style.display = 'none'; // <<< 2. HIDE BUTTON ON SIMULATION START

    const planetParams = calculateOrbitParams(pMaxDist.value, pEccentricity.value, pInclination.value, pPeriod.value);
    const meteorParams = calculateOrbitParams(mMaxDist.value, mEccentricity.value, mInclination.value, mPeriod.value);

    sun = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffdd00 }));
    scene.add(sun);
    planet = { ...planetParams, angle: 0, mesh: createBodyMesh(12, 'cornflowerblue') };
    planetOrbit = createOrbitPath(planet);
    scene.add(planet.mesh, planetOrbit);
    meteor = { ...meteorParams, angle: 0, mesh: createBodyMesh(6, {'Rock':'saddlebrown','Iron':'dimgray','Ice':'lightblue'}[document.getElementById('m_material').value])};
    meteorOrbit = createOrbitPath(meteor);
    scene.add(meteor.mesh, meteorOrbit);

    animate();
}

function animate() {
    if (!isCollided) {
        updateBodyPosition(planet);
        updateBodyPosition(meteor);
        if (planet.mesh.position.distanceTo(meteor.mesh.position) < 12 + 6) {
            isCollided = true;
            
            createExplosion(meteor.mesh.position);
            scene.remove(meteor.mesh); scene.remove(meteorOrbit);
            setTimeout(() => {
                cancelAnimationFrame(animationFrameId);
                // Update status and show the redirect button
                simulationStatus.textContent = "Collision Detected!";
                simulationStatus.style.display = 'block';
                redirectBtn.style.display = 'block'; // <<< 3. SHOW BUTTON ON COLLISION
            }, 10);
        }
    } else {
        updateBodyPosition(planet);
    }
    
    if (explosionParticles) {
        explosionParticles.children.forEach(p => { p.position.add(p.velocity); p.velocity.multiplyScalar(0.98); p.scale.multiplyScalar(0.98); });
        explosionParticles.children = explosionParticles.children.filter(p => p.scale.x > 0.05);
    }
    
    controls.update();
    renderer.render(scene, camera);
    animationFrameId = requestAnimationFrame(animate);
    
}

// ... (All helper functions: updateBodyPosition, createBodyMesh, createOrbitPath, createExplosion, calculateOrbitParams remain the same)
function updateBodyPosition(body){body.angle+=body.speed;const e=body.eccentricity;const x=body.semiMajorAxis*(Math.cos(body.angle)-e);const y=body.semiMinorAxis*Math.sin(body.angle);const p=new THREE.Vector3(x,0,y);p.applyAxisAngle(new THREE.Vector3(1,0,0),body.inclination);body.mesh.position.copy(p);}
function createBodyMesh(r,c){const g=new THREE.SphereGeometry(r,32,16);const m=new THREE.MeshStandardMaterial({color:c,roughness:0.8});return new THREE.Mesh(g,m);}
function createOrbitPath(body){const p=[];const s=256;const e=body.eccentricity;for(let i=0;i<=s;i++){const a=(i/s)*2*Math.PI;const x=body.semiMajorAxis*(Math.cos(a)-e);const y=body.semiMinorAxis*Math.sin(a);const pt=new THREE.Vector3(x,0,y);pt.applyAxisAngle(new THREE.Vector3(1,0,0),body.inclination);p.push(pt);}const g=new THREE.BufferGeometry().setFromPoints(p);const m=new THREE.LineBasicMaterial({color:body.color||'white'});return new THREE.Line(g,m);}
function createExplosion(pos){explosionParticles=new THREE.Group();const pc=100;const pm=new THREE.MeshBasicMaterial({color:0xffa500});for(let i=0;i<pc;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(1,8,8),pm);p.position.copy(pos);p.velocity=new THREE.Vector3((Math.random()-.5)*2,(Math.random()-.5)*2,(Math.random()-.5)*2);explosionParticles.add(p);}scene.add(explosionParticles);}
function calculateOrbitParams(max,e,inc,per){e=parseFloat(e);const a=parseFloat(max)/(1+e);const b=a*Math.sqrt(1-e**2);const min=a*(1-e);return{eccentricity:e,semiMajorAxis:a,semiMinorAxis:b,minDistance:min,inclination:parseFloat(inc)*(Math.PI/180),speed:20/parseFloat(per)};}


// --- UI Event Listeners ---
launchBtn.addEventListener('click', () => {
    setupView.style.display = 'none';
    simulationView.style.display = 'block';
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    startSimulation();
});

backBtn.addEventListener('click', () => {
    setupView.style.display = 'flex';
    simulationView.style.display = 'none';
    cancelAnimationFrame(animationFrameId);
});

// <<< 4. ADD CLICK LISTENER FOR THE REDIRECT BUTTON
redirectBtn.addEventListener('click', () => {
    window.location.href = 'https://yuthika11.github.io/Planetary_impact/';
});


// Logic to auto-update min distance display
function updateMinDistanceDisplays(){
    let params = calculateOrbitParams(pMaxDist.value, pEccentricity.value, 0, 1);
    pMinDistVal.textContent = params.minDistance.toFixed(1);
    params = calculateOrbitParams(mMaxDist.value, mEccentricity.value, 0, 1);
    mMinDistVal.textContent = params.minDistance.toFixed(1);
}
[pMaxDist, pEccentricity, mMaxDist, mEccentricity].forEach(el => {
    el.addEventListener('input', updateMinDistanceDisplays);
});
pEccentricity.oninput = () => { pEccVal.textContent = pEccentricity.value; updateMinDistanceDisplays(); };
mEccentricity.oninput = () => { mEccVal.textContent = mEccentricity.value; updateMinDistanceDisplays(); };
pInclination.oninput = () => { pIncVal.textContent = pInclination.value; };
mInclination.oninput = () => { mIncVal.textContent = mInclination.value; };

// --- Initial Calls ---
init();
updateMinDistanceDisplays();
