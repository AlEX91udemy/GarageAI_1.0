import fs from "fs";
import path from "path";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// Polyfill FileReader for Node.js environment
global.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      if (this.onloadend) this.onloadend();
      if (this.onload) this.onload();
    });
  }
};

const MODELS_DIR = path.join(process.cwd(), "public", "models");
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

function exportSceneToGlb(scene, filename) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (glb) => {
        const outPath = path.join(MODELS_DIR, filename);
        fs.writeFileSync(outPath, Buffer.from(glb));
        console.log(`Saved ${filename} (${(glb.byteLength / 1024).toFixed(1)} KB)`);
        resolve(outPath);
      },
      (err) => reject(err),
      { binary: true }
    );
  });
}

// ---------------------------------------------------------------------------
// Common Wheels & Details Builder
// ---------------------------------------------------------------------------
function createWheel(radius = 0.38, width = 0.24, spokeCount = 5, rimStyle = "star") {
  const wheelGroup = new THREE.Group();

  // Rubber tire
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
  const tireMat = new THREE.MeshStandardMaterial({
    name: "TireRubber",
    color: 0x18181b,
    roughness: 0.88,
    metalness: 0.1,
  });
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.rotation.x = Math.PI / 2;
  wheelGroup.add(tire);

  // Outer rim
  const rimRadius = radius * 0.74;
  const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, width * 1.02, 24);
  const rimMat = new THREE.MeshStandardMaterial({
    name: "AlloyRim",
    color: 0xd4d4d8,
    metalness: 0.92,
    roughness: 0.15,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI / 2;
  wheelGroup.add(rim);

  // Inner hub recess
  const innerRimGeo = new THREE.CylinderGeometry(rimRadius * 0.9, rimRadius * 0.9, width * 1.03, 24);
  const innerRimMat = new THREE.MeshStandardMaterial({
    name: "InnerRim",
    color: 0x27272a,
    metalness: 0.85,
    roughness: 0.4,
  });
  const innerRim = new THREE.Mesh(innerRimGeo, innerRimMat);
  innerRim.rotation.x = Math.PI / 2;
  wheelGroup.add(innerRim);

  // Spokes
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i * 2 * Math.PI) / spokeCount;
    const spokeGeo = new THREE.BoxGeometry(rimRadius * 0.86, 0.05, width * 0.08);
    const spoke = new THREE.Mesh(spokeGeo, rimMat);
    spoke.position.set(
      Math.cos(angle) * rimRadius * 0.42,
      Math.sin(angle) * rimRadius * 0.42,
      width * 0.48
    );
    spoke.rotation.z = angle;
    wheelGroup.add(spoke);
  }

  // Center cap
  const capGeo = new THREE.CylinderGeometry(0.1, 0.1, width * 1.06, 16);
  const capMat = new THREE.MeshStandardMaterial({
    name: "CenterCap",
    color: 0x09090b,
    metalness: 0.9,
    roughness: 0.2,
  });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.rotation.x = Math.PI / 2;
  wheelGroup.add(cap);

  // Brake disc inside
  const discGeo = new THREE.CylinderGeometry(rimRadius * 0.82, rimRadius * 0.82, 0.03, 20);
  const discMat = new THREE.MeshStandardMaterial({
    name: "BrakeDisc",
    color: 0x71717a,
    metalness: 0.95,
    roughness: 0.25,
  });
  const disc = new THREE.Mesh(discGeo, discMat);
  disc.rotation.x = Math.PI / 2;
  disc.position.z = -width * 0.05;
  wheelGroup.add(disc);

  // Brake Caliper
  const caliperGeo = new THREE.BoxGeometry(0.12, 0.16, 0.06);
  const caliperMat = new THREE.MeshStandardMaterial({
    name: "BrakeCaliper",
    color: 0xdc2626, // Red sport caliper
    roughness: 0.3,
    metalness: 0.5,
  });
  const caliper = new THREE.Mesh(caliperGeo, caliperMat);
  caliper.position.set(rimRadius * 0.55, rimRadius * 0.45, -width * 0.02);
  wheelGroup.add(caliper);

  return wheelGroup;
}

// ---------------------------------------------------------------------------
// 1. NISSAN X-TRAIL T31 MODEL BUILDER
// ---------------------------------------------------------------------------
function buildNissanXTrailT31() {
  const root = new THREE.Group();
  root.name = "Nissan_XTrail_T31";

  // Materials
  const paintMat = new THREE.MeshStandardMaterial({
    name: "CarBodyPaint",
    color: 0x991b1b, // Deep ruby red default
    metalness: 0.85,
    roughness: 0.18,
  });

  const blackTrimMat = new THREE.MeshStandardMaterial({
    name: "DarkTrim",
    color: 0x1c1917,
    roughness: 0.8,
    metalness: 0.1,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    name: "ChromeTrim",
    color: 0xf4f4f5,
    metalness: 0.96,
    roughness: 0.08,
  });

  const silverSkidMat = new THREE.MeshStandardMaterial({
    name: "SilverSkidPlate",
    color: 0xd1d5db,
    metalness: 0.7,
    roughness: 0.3,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    name: "GlassTinted",
    color: 0x0f172a,
    roughness: 0.05,
    metalness: 0.2,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    name: "HeadlightLens",
    color: 0xf8fafc,
    roughness: 0.1,
    metalness: 0.1,
    emissive: 0xffffff,
    emissiveIntensity: 0.6,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    name: "TaillightLens",
    color: 0xb91c1c,
    roughness: 0.1,
    metalness: 0.1,
    emissive: 0xef4444,
    emissiveIntensity: 0.5,
  });

  const spotlightMat = new THREE.MeshStandardMaterial({
    name: "SpotlightLens",
    color: 0xfef08a,
    emissive: 0xfef08a,
    emissiveIntensity: 0.8,
    roughness: 0.1,
  });

  const length = 4.63;
  const width = 2.05;
  const bodyHeight = 1.05;
  const groundClearance = 0.36;

  // 1. Main Lower Body Box (Solid boxy T31 styling)
  const chassisGeo = new THREE.BoxGeometry(width, bodyHeight, length * 0.95);
  const chassis = new THREE.Mesh(chassisGeo, paintMat);
  chassis.position.y = groundClearance + bodyHeight / 2;
  root.add(chassis);

  // 2. T31 Boxy Flared Wheel Arches (Plastic cladding over fenders)
  const archCladdingGeo = new THREE.BoxGeometry(width * 1.03, bodyHeight * 0.42, length * 0.28);
  const frontArch = new THREE.Mesh(archCladdingGeo, blackTrimMat);
  frontArch.position.set(0, groundClearance + bodyHeight * 0.32, length * 0.31);
  root.add(frontArch);

  const rearArch = new THREE.Mesh(archCladdingGeo, blackTrimMat);
  rearArch.position.set(0, groundClearance + bodyHeight * 0.32, -length * 0.31);
  root.add(rearArch);

  // Lower side protective plastic runners
  const runnerGeo = new THREE.BoxGeometry(width * 1.02, 0.14, length * 0.55);
  const runner = new THREE.Mesh(runnerGeo, blackTrimMat);
  runner.position.set(0, groundClearance + 0.08, 0);
  root.add(runner);

  // 3. T31 Distinctive High Cabin / Greenhouse
  const cabinLength = length * 0.62;
  const cabinWidth = width * 0.88;
  const roofHeight = 0.88;
  const cabinGeo = new THREE.BoxGeometry(cabinWidth, roofHeight, cabinLength);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, groundClearance + bodyHeight + roofHeight / 2 - 0.03, -0.15);
  root.add(cabin);

  // Roof painted sheet
  const roofGeo = new THREE.BoxGeometry(cabinWidth * 1.02, 0.08, cabinLength * 0.98);
  const roof = new THREE.Mesh(roofGeo, paintMat);
  roof.position.set(0, groundClearance + bodyHeight + roofHeight + 0.01, -0.15);
  root.add(roof);

  // 4. THE FAMOUS X-TRAIL T31 ROOF RAILS WITH SPOTLIGHTS!
  const railLength = cabinLength * 0.95;
  const railGeo = new THREE.BoxGeometry(0.12, 0.14, railLength);
  const railL = new THREE.Mesh(railGeo, silverSkidMat);
  railL.position.set(-cabinWidth * 0.46, groundClearance + bodyHeight + roofHeight + 0.1, -0.15);
  root.add(railL);

  const railR = new THREE.Mesh(railGeo, silverSkidMat);
  railR.position.set(cabinWidth * 0.46, groundClearance + bodyHeight + roofHeight + 0.1, -0.15);
  root.add(railR);

  // Front Spotlight Pods on Roof Rails (T31 Signature Feature!)
  const podGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.18, 16);
  const podL = new THREE.Mesh(podGeo, blackTrimMat);
  podL.rotation.x = Math.PI / 2;
  podL.position.set(-cabinWidth * 0.46, groundClearance + bodyHeight + roofHeight + 0.14, railLength * 0.46 - 0.15);
  root.add(podL);

  const spotLensL = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), spotlightMat);
  spotLensL.position.set(-cabinWidth * 0.46, groundClearance + bodyHeight + roofHeight + 0.14, railLength * 0.46 - 0.15 + 0.1);
  root.add(spotLensL);

  const podR = new THREE.Mesh(podGeo, blackTrimMat);
  podR.rotation.x = Math.PI / 2;
  podR.position.set(cabinWidth * 0.46, groundClearance + bodyHeight + roofHeight + 0.14, railLength * 0.46 - 0.15);
  root.add(podR);

  const spotLensR = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), spotlightMat);
  spotLensR.position.set(cabinWidth * 0.46, groundClearance + bodyHeight + roofHeight + 0.14, railLength * 0.46 - 0.15 + 0.1);
  root.add(spotLensR);

  // 5. Front Hood (Sloped boxy hood)
  const hoodLength = length * 0.35;
  const hoodGeo = new THREE.BoxGeometry(width * 0.94, 0.18, hoodLength);
  const hood = new THREE.Mesh(hoodGeo, paintMat);
  hood.position.set(0, groundClearance + bodyHeight - 0.02, length * 0.28);
  hood.rotation.x = 0.08;
  root.add(hood);

  // Front Grille: T31 rectangular grille with V-chrome
  const grilleGeo = new THREE.BoxGeometry(width * 0.65, 0.32, 0.12);
  const grille = new THREE.Mesh(grilleGeo, blackTrimMat);
  grille.position.set(0, groundClearance + bodyHeight * 0.62, length * 0.48);
  root.add(grille);

  const chromeVGeo = new THREE.BoxGeometry(width * 0.45, 0.08, 0.13);
  const chromeV = new THREE.Mesh(chromeVGeo, chromeMat);
  chromeV.position.set(0, groundClearance + bodyHeight * 0.62, length * 0.485);
  root.add(chromeV);

  // Front Headlights: Square blocky T31 headlights
  const hlGeo = new THREE.BoxGeometry(0.36, 0.26, 0.14);
  const hlL = new THREE.Mesh(hlGeo, headlightMat);
  hlL.position.set(-width * 0.38, groundClearance + bodyHeight * 0.66, length * 0.47);
  root.add(hlL);

  const hlR = new THREE.Mesh(hlGeo, headlightMat);
  hlR.position.set(width * 0.38, groundClearance + bodyHeight * 0.66, length * 0.47);
  root.add(hlR);

  // Lower Bumper & Skid plate
  const fSkidGeo = new THREE.BoxGeometry(width * 0.6, 0.18, 0.16);
  const fSkid = new THREE.Mesh(fSkidGeo, silverSkidMat);
  fSkid.position.set(0, groundClearance + 0.12, length * 0.475);
  root.add(fSkid);

  // 6. Rear Section: Vertical T31 Tail-Lamps
  const tlGeo = new THREE.BoxGeometry(0.14, roofHeight * 0.85, 0.12);
  const tlL = new THREE.Mesh(tlGeo, taillightMat);
  tlL.position.set(-cabinWidth * 0.48, groundClearance + bodyHeight + roofHeight * 0.42, -cabinLength * 0.5 - 0.14);
  root.add(tlL);

  const tlR = new THREE.Mesh(tlGeo, taillightMat);
  tlR.position.set(cabinWidth * 0.48, groundClearance + bodyHeight + roofHeight * 0.42, -cabinLength * 0.5 - 0.14);
  root.add(tlR);

  // Rear tailgate handle / license plate recess
  const rPlateGeo = new THREE.BoxGeometry(0.7, 0.18, 0.06);
  const rPlate = new THREE.Mesh(rPlateGeo, chromeMat);
  rPlate.position.set(0, groundClearance + bodyHeight * 0.55, -length * 0.475);
  root.add(rPlate);

  // 4 Wheels
  const wheelRadius = 0.38;
  const wheelWidth = 0.24;
  const wx = width * 0.48;
  const wz = length * 0.31;
  const wy = wheelRadius;

  const wFL = createWheel(wheelRadius, wheelWidth, 5);
  wFL.position.set(-wx, wy, wz);
  wFL.rotation.y = Math.PI;
  root.add(wFL);

  const wFR = createWheel(wheelRadius, wheelWidth, 5);
  wFR.position.set(wx, wy, wz);
  root.add(wFR);

  const wRL = createWheel(wheelRadius, wheelWidth, 5);
  wRL.position.set(-wx, wy, -wz);
  wRL.rotation.y = Math.PI;
  root.add(wRL);

  const wRR = createWheel(wheelRadius, wheelWidth, 5);
  wRR.position.set(wx, wy, -wz);
  root.add(wRR);

  return root;
}

// ---------------------------------------------------------------------------
// 2. BMW 3-SERIES E46 SEDAN MODEL BUILDER
// ---------------------------------------------------------------------------
function buildBmwE46Sedan() {
  const root = new THREE.Group();
  root.name = "BMW_3_E46_Sedan";

  const paintMat = new THREE.MeshStandardMaterial({
    name: "CarBodyPaint",
    color: 0x1e3a8a, // BMW Deep Blue / Topaz Blue
    metalness: 0.9,
    roughness: 0.16,
  });

  const blackTrimMat = new THREE.MeshStandardMaterial({
    name: "DarkTrim",
    color: 0x18181b,
    roughness: 0.7,
    metalness: 0.2,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    name: "ChromeTrim",
    color: 0xf1f5f9,
    metalness: 0.98,
    roughness: 0.06,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    name: "GlassTinted",
    color: 0x090d16,
    roughness: 0.04,
    metalness: 0.3,
  });

  const angelEyeMat = new THREE.MeshStandardMaterial({
    name: "HeadlightLens",
    color: 0xffffff,
    emissive: 0x93c5fd,
    emissiveIntensity: 1.2,
    roughness: 0.1,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    name: "TaillightLens",
    color: 0x991b1b,
    emissive: 0xdc2626,
    emissiveIntensity: 0.6,
    roughness: 0.1,
  });

  const length = 4.75;
  const width = 1.98;
  const bodyHeight = 0.78;
  const groundClearance = 0.22; // Lower sports stance

  // 1. Sleek Sports Sedan Chassis
  const chassisGeo = new THREE.BoxGeometry(width, bodyHeight, length * 0.96);
  const chassis = new THREE.Mesh(chassisGeo, paintMat);
  chassis.position.y = groundClearance + bodyHeight / 2;
  root.add(chassis);

  // 2. Low-slung Hood with iconic center power bulge
  const hoodLength = length * 0.38;
  const hoodGeo = new THREE.BoxGeometry(width * 0.92, 0.14, hoodLength);
  const hood = new THREE.Mesh(hoodGeo, paintMat);
  hood.position.set(0, groundClearance + bodyHeight - 0.02, length * 0.26);
  hood.rotation.x = 0.05;
  root.add(hood);

  // Power Bulge in center of hood
  const bulgeGeo = new THREE.BoxGeometry(width * 0.36, 0.04, hoodLength * 0.85);
  const bulge = new THREE.Mesh(bulgeGeo, paintMat);
  bulge.position.set(0, groundClearance + bodyHeight + 0.06, length * 0.26);
  bulge.rotation.x = 0.05;
  root.add(bulge);

  // 3. BMW Twin Kidney Grille!
  const kidneyWidth = 0.22;
  const kidneyHeight = 0.24;
  const kidneyGeo = new THREE.CylinderGeometry(kidneyWidth / 2, kidneyWidth / 2, 0.08, 16);

  // Left Kidney
  const kL = new THREE.Mesh(kidneyGeo, chromeMat);
  kL.position.set(-kidneyWidth * 0.65, groundClearance + bodyHeight * 0.6, length * 0.48);
  kL.rotation.x = Math.PI / 2;
  root.add(kL);

  const kLInner = new THREE.Mesh(new THREE.BoxGeometry(kidneyWidth * 0.8, kidneyHeight * 0.8, 0.09), blackTrimMat);
  kLInner.position.set(-kidneyWidth * 0.65, groundClearance + bodyHeight * 0.6, length * 0.48);
  root.add(kLInner);

  // Right Kidney
  const kR = new THREE.Mesh(kidneyGeo, chromeMat);
  kR.position.set(kidneyWidth * 0.65, groundClearance + bodyHeight * 0.6, length * 0.48);
  kR.rotation.x = Math.PI / 2;
  root.add(kR);

  const kRInner = new THREE.Mesh(new THREE.BoxGeometry(kidneyWidth * 0.8, kidneyHeight * 0.8, 0.09), blackTrimMat);
  kRInner.position.set(kidneyWidth * 0.65, groundClearance + bodyHeight * 0.6, length * 0.48);
  root.add(kRInner);

  // 4. Double Circular Angel Eye Headlights
  const aeRadius = 0.09;
  const aeGeo = new THREE.TorusGeometry(aeRadius, 0.018, 8, 20);

  [-width * 0.38, width * 0.38].forEach((sideX) => {
    // Outer and Inner angel ring
    [-0.12, 0.12].forEach((offset) => {
      const ring = new THREE.Mesh(aeGeo, angelEyeMat);
      ring.position.set(sideX + offset, groundClearance + bodyHeight * 0.62, length * 0.478);
      root.add(ring);
    });
  });

  // Headlight clear housing covers
  const hlCoverGeo = new THREE.BoxGeometry(0.48, 0.22, 0.06);
  const hlL = new THREE.Mesh(hlCoverGeo, angelEyeMat);
  hlL.position.set(-width * 0.38, groundClearance + bodyHeight * 0.62, length * 0.472);
  root.add(hlL);

  const hlR = new THREE.Mesh(hlCoverGeo, angelEyeMat);
  hlR.position.set(width * 0.38, groundClearance + bodyHeight * 0.62, length * 0.472);
  root.add(hlR);

  // 5. Sports Sedan Greenhouse with Hofmeister Kink C-Pillars
  const cabinLength = length * 0.52;
  const cabinWidth = width * 0.86;
  const roofHeight = 0.68;
  const cabinGeo = new THREE.BoxGeometry(cabinWidth, roofHeight, cabinLength);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, groundClearance + bodyHeight + roofHeight / 2 - 0.04, -0.22);
  root.add(cabin);

  // Roof
  const roofGeo = new THREE.BoxGeometry(cabinWidth * 1.02, 0.06, cabinLength * 0.94);
  const roof = new THREE.Mesh(roofGeo, paintMat);
  roof.position.set(0, groundClearance + bodyHeight + roofHeight - 0.01, -0.22);
  root.add(roof);

  // Shark Fin Antenna on Roof (E46 iconic feature)
  const finGeo = new THREE.ConeGeometry(0.05, 0.12, 4);
  const fin = new THREE.Mesh(finGeo, paintMat);
  fin.rotation.x = -0.4;
  fin.position.set(0, groundClearance + bodyHeight + roofHeight + 0.05, -cabinLength * 0.4 - 0.2);
  root.add(fin);

  // 6. Trunk / Rear Decklid with M-Tech Lip Spoiler
  const trunkLength = length * 0.22;
  const trunkGeo = new THREE.BoxGeometry(width * 0.9, 0.12, trunkLength);
  const trunk = new THREE.Mesh(trunkGeo, paintMat);
  trunk.position.set(0, groundClearance + bodyHeight * 0.92, -length * 0.38);
  root.add(trunk);

  // Lip Spoiler
  const lipGeo = new THREE.BoxGeometry(width * 0.78, 0.04, 0.08);
  const lip = new THREE.Mesh(lipGeo, paintMat);
  lip.position.set(0, groundClearance + bodyHeight * 0.96, -length * 0.48);
  root.add(lip);

  // L-Shaped E46 Taillights
  const tlGeo = new THREE.BoxGeometry(0.42, 0.2, 0.08);
  const tlL = new THREE.Mesh(tlGeo, taillightMat);
  tlL.position.set(-width * 0.36, groundClearance + bodyHeight * 0.65, -length * 0.48);
  root.add(tlL);

  const tlR = new THREE.Mesh(tlGeo, taillightMat);
  tlR.position.set(width * 0.36, groundClearance + bodyHeight * 0.65, -length * 0.48);
  root.add(tlR);

  // Twin Stainless Steel Exhaust Pipes (Left side)
  const pipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 16);
  [-0.05, 0.05].forEach((offsetX) => {
    const pipe = new THREE.Mesh(pipeGeo, chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(-width * 0.32 + offsetX, groundClearance + 0.12, -length * 0.49);
    root.add(pipe);
  });

  // Wheels (Low profile sport rims, 5 split spokes)
  const wheelRadius = 0.35;
  const wheelWidth = 0.24;
  const wx = width * 0.49;
  const wz = length * 0.32;
  const wy = wheelRadius;

  const wFL = createWheel(wheelRadius, wheelWidth, 5, "split");
  wFL.position.set(-wx, wy, wz);
  wFL.rotation.y = Math.PI;
  root.add(wFL);

  const wFR = createWheel(wheelRadius, wheelWidth, 5, "split");
  wFR.position.set(wx, wy, wz);
  root.add(wFR);

  const wRL = createWheel(wheelRadius, wheelWidth, 5, "split");
  wRL.position.set(-wx, wy, -wz);
  wRL.rotation.y = Math.PI;
  root.add(wRL);

  const wRR = createWheel(wheelRadius, wheelWidth, 5, "split");
  wRR.position.set(wx, wy, -wz);
  root.add(wRR);

  return root;
}

// ---------------------------------------------------------------------------
// 3. VOLKSWAGEN GOLF MK7 HATCHBACK MODEL BUILDER
// ---------------------------------------------------------------------------
function buildVwGolfMk7() {
  const root = new THREE.Group();
  root.name = "VW_Golf_Mk7_Hatchback";

  const paintMat = new THREE.MeshStandardMaterial({
    name: "CarBodyPaint",
    color: 0x15803d, // British Racing / Emerald Green
    metalness: 0.88,
    roughness: 0.16,
  });

  const blackTrimMat = new THREE.MeshStandardMaterial({
    name: "DarkTrim",
    color: 0x18181b,
    roughness: 0.75,
    metalness: 0.15,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    name: "ChromeTrim",
    color: 0xf4f4f5,
    metalness: 0.95,
    roughness: 0.08,
  });

  const redGtiLineMat = new THREE.MeshStandardMaterial({
    name: "GtiRedAccent",
    color: 0xef4444,
    metalness: 0.5,
    roughness: 0.2,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    name: "GlassTinted",
    color: 0x090d16,
    roughness: 0.05,
    metalness: 0.2,
  });

  const ledHeadlightMat = new THREE.MeshStandardMaterial({
    name: "HeadlightLens",
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 1.0,
    roughness: 0.1,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    name: "TaillightLens",
    color: 0x991b1b,
    emissive: 0xef4444,
    emissiveIntensity: 0.7,
    roughness: 0.1,
  });

  const length = 4.26; // Compact hatchback length
  const width = 1.96;
  const bodyHeight = 0.85;
  const groundClearance = 0.24;

  // 1. Compact 2-Box Hatchback Chassis
  const chassisGeo = new THREE.BoxGeometry(width, bodyHeight, length * 0.96);
  const chassis = new THREE.Mesh(chassisGeo, paintMat);
  chassis.position.y = groundClearance + bodyHeight / 2;
  root.add(chassis);

  // 2. Short, Slanted Aerodynamic Hood
  const hoodLength = length * 0.32;
  const hoodGeo = new THREE.BoxGeometry(width * 0.94, 0.14, hoodLength);
  const hood = new THREE.Mesh(hoodGeo, paintMat);
  hood.position.set(0, groundClearance + bodyHeight - 0.01, length * 0.28);
  hood.rotation.x = 0.12;
  root.add(hood);

  // 3. Narrow Upper Grille with Signature Horizontal Strip
  const grilleGeo = new THREE.BoxGeometry(width * 0.88, 0.12, 0.1);
  const grille = new THREE.Mesh(grilleGeo, blackTrimMat);
  grille.position.set(0, groundClearance + bodyHeight * 0.65, length * 0.48);
  root.add(grille);

  // Signature horizontal red / chrome blade running through grille into headlights
  const bladeGeo = new THREE.BoxGeometry(width * 0.86, 0.02, 0.11);
  const blade = new THREE.Mesh(bladeGeo, redGtiLineMat);
  blade.position.set(0, groundClearance + bodyHeight * 0.65, length * 0.485);
  root.add(blade);

  // Angular LED Headlights
  const hlGeo = new THREE.BoxGeometry(0.38, 0.18, 0.1);
  const hlL = new THREE.Mesh(hlGeo, ledHeadlightMat);
  hlL.position.set(-width * 0.36, groundClearance + bodyHeight * 0.65, length * 0.475);
  root.add(hlL);

  const hlR = new THREE.Mesh(hlGeo, ledHeadlightMat);
  hlR.position.set(width * 0.36, groundClearance + bodyHeight * 0.65, length * 0.475);
  root.add(hlR);

  // 4. Iconic Hatchback Greenhouse with Wide C-Pillar
  const cabinLength = length * 0.62;
  const cabinWidth = width * 0.88;
  const roofHeight = 0.76;
  const cabinGeo = new THREE.BoxGeometry(cabinWidth, roofHeight, cabinLength);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, groundClearance + bodyHeight + roofHeight / 2 - 0.03, -0.12);
  root.add(cabin);

  // Wide C-Pillar (Characteristic Golf signature design trait!)
  const cPillarGeo = new THREE.BoxGeometry(0.18, roofHeight * 0.95, 0.42);
  const cPillarL = new THREE.Mesh(cPillarGeo, paintMat);
  cPillarL.position.set(-cabinWidth * 0.46, groundClearance + bodyHeight + roofHeight * 0.45, -cabinLength * 0.38);
  root.add(cPillarL);

  const cPillarR = new THREE.Mesh(cPillarGeo, paintMat);
  cPillarR.position.set(cabinWidth * 0.46, groundClearance + bodyHeight + roofHeight * 0.45, -cabinLength * 0.38);
  root.add(cPillarR);

  // Flat Hatchback Roof
  const roofGeo = new THREE.BoxGeometry(cabinWidth * 1.02, 0.06, cabinLength * 0.96);
  const roof = new THREE.Mesh(roofGeo, paintMat);
  roof.position.set(0, groundClearance + bodyHeight + roofHeight, -0.12);
  root.add(roof);

  // Rear Roof Spoiler (GTI/R style sporty wing)
  const spoilerGeo = new THREE.BoxGeometry(cabinWidth * 0.96, 0.08, 0.28);
  const spoiler = new THREE.Mesh(spoilerGeo, blackTrimMat);
  spoiler.position.set(0, groundClearance + bodyHeight + roofHeight + 0.02, -cabinLength * 0.5 - 0.16);
  root.add(spoiler);

  // Third LED Brake Light
  const brakeLightGeo = new THREE.BoxGeometry(0.35, 0.02, 0.04);
  const brakeLight = new THREE.Mesh(brakeLightGeo, taillightMat);
  brakeLight.position.set(0, groundClearance + bodyHeight + roofHeight + 0.02, -cabinLength * 0.5 - 0.28);
  root.add(brakeLight);

  // 5. Vertical Hatch Tailgate
  const tlGeo = new THREE.BoxGeometry(0.36, 0.22, 0.08);
  const tlL = new THREE.Mesh(tlGeo, taillightMat);
  tlL.position.set(-width * 0.34, groundClearance + bodyHeight * 0.65, -length * 0.48);
  root.add(tlL);

  const tlR = new THREE.Mesh(tlGeo, taillightMat);
  tlR.position.set(width * 0.34, groundClearance + bodyHeight * 0.65, -length * 0.48);
  root.add(tlR);

  // Rear Diffuser & Dual Chrome Exhaust Tips
  const diffGeo = new THREE.BoxGeometry(width * 0.7, 0.16, 0.1);
  const diff = new THREE.Mesh(diffGeo, blackTrimMat);
  diff.position.set(0, groundClearance + 0.1, -length * 0.48);
  root.add(diff);

  const tipGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.14, 16);
  [-0.32, 0.32].forEach((tx) => {
    const tip = new THREE.Mesh(tipGeo, chromeMat);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(tx, groundClearance + 0.1, -length * 0.49);
    root.add(tip);
  });

  // Wheels
  const wheelRadius = 0.36;
  const wheelWidth = 0.24;
  const wx = width * 0.49;
  const wz = length * 0.32;
  const wy = wheelRadius;

  const wFL = createWheel(wheelRadius, wheelWidth, 10);
  wFL.position.set(-wx, wy, wz);
  wFL.rotation.y = Math.PI;
  root.add(wFL);

  const wFR = createWheel(wheelRadius, wheelWidth, 10);
  wFR.position.set(wx, wy, wz);
  root.add(wFR);

  const wRL = createWheel(wheelRadius, wheelWidth, 10);
  wRL.position.set(-wx, wy, -wz);
  wRL.rotation.y = Math.PI;
  root.add(wRL);

  const wRR = createWheel(wheelRadius, wheelWidth, 10);
  wRR.position.set(wx, wy, -wz);
  root.add(wRR);

  return root;
}

// ---------------------------------------------------------------------------
// Run Generators
// ---------------------------------------------------------------------------
async function main() {
  console.log("Generating 3D Car Models (.glb)...");

  const xtrailScene = new THREE.Scene();
  xtrailScene.add(buildNissanXTrailT31());
  await exportSceneToGlb(xtrailScene, "nissan_xtrail_t31.glb");

  const bmwScene = new THREE.Scene();
  bmwScene.add(buildBmwE46Sedan());
  await exportSceneToGlb(bmwScene, "bmw_3_e46.glb");

  const golfScene = new THREE.Scene();
  golfScene.add(buildVwGolfMk7());
  await exportSceneToGlb(golfScene, "vw_golf_mk7.glb");

  console.log("All 3D models generated successfully!");
}

main().catch(console.error);
