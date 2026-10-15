// ==========================================
// 1. ตั้งค่ารายการฟอนต์ 
// ==========================================
const fontConfig = [
    { name: "Chewy", file: "Chewy-Regular.ttf" },
    { name: "Prompt", file: "Prompt-Bold.ttf" },
    { name: "Mitr", file: "Mitr-SemiBold.ttf" },
    { name: "Athiti", file: "Athiti-Bold.ttf" },
    { name: "Luckiest_Guy", file: "LuckiestGuy-Regular.ttf" },
    { name: "Noto_Sans_Thai", file: "NotoSansThai-VariableFont_wdth,wght.ttf" },
    { name: "Oleo_Script", file: "OleoScript-Bold.ttf" },
    { name: "Titan_One", file: "TitanOne-Regular.ttf" },
    { name: "Kanit", file: "Kanit-ExtraBold.ttf" },
    { name: "Super Basic", file: "Super Basic.ttf" }
];

let currentWorkType = 'keychain'; 
let currentBaseType = 'outline';
let currentFontFile = fontConfig[0].file;
let currentFont = null;
let currentFontUrl = "";

// ==========================================
// 2. ฟังก์ชัน UI ควบคุมหน้าเว็บ
// ==========================================
function initUI() {
    const grid = document.getElementById('fontGrid');
    let styleHTML = "";

    fontConfig.forEach((f, index) => {
        styleHTML += `
            @font-face {
                font-family: 'PreviewFont_${index}';
                src: url('font/${f.file}') format('truetype');
            }
        `;
        const card = document.createElement('div');
        card.className = `font-card ${index === 0 ? 'active' : ''}`;
        card.onclick = () => selectFont(index, card);
        card.innerHTML = `
            <div class="preview-text" id="previewText_${index}" style="font-family: 'PreviewFont_${index}', sans-serif;">Yourname</div>
            <div class="font-name">${f.name}</div>
        `;
        grid.appendChild(card);
    });

    const styleTag = document.createElement('style');
    styleTag.innerHTML = styleHTML;
    document.head.appendChild(styleTag);
}

function updatePreviewText() {
    const text = document.getElementById('nameInput').value || "Yourname";
    fontConfig.forEach((_, index) => {
        const el = document.getElementById(`previewText_${index}`);
        if(el) el.innerText = text;
    });
}

function selectFont(index, cardElement) {
    document.querySelectorAll('.font-card').forEach(c => c.classList.remove('active'));
    cardElement.classList.add('active');
    currentFontFile = fontConfig[index].file;
    processModelUpdate();
}

function setWorkType(type, btn) {
    document.querySelectorAll('#workTypeControl .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentWorkType = type;
    document.getElementById('ringSettingsBlock').style.display = (type === 'keychain') ? 'block' : 'none';
    processModelUpdate();
}

function setBaseType(type, btn) {
    document.querySelectorAll('#baseTypeControl .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentBaseType = type;
    document.getElementById('outlineSettingsBlock').style.display = (type === 'outline') ? 'block' : 'none';
    document.getElementById('rectSettingsBlock').style.display = (type === 'rectangle') ? 'block' : 'none';
    processModelUpdate();
}

function setSize(size, btn) {
    document.getElementById('fontSizeSlider').value = size;
    updateSlidersFromRange(true); 
    document.querySelectorAll('#sizeControl .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function handleInputEnter(event, inputId, sliderId) {
    if (event.key === 'Enter') {
        updateSlidersFromInput(inputId, sliderId);
        document.getElementById(inputId).blur(); 
    }
}

function updateSlidersFromInput(inputId, sliderId) {
    let inputElem = document.getElementById(inputId);
    let sliderElem = document.getElementById(sliderId);
    let val = parseFloat(inputElem.value);
    let min = parseFloat(sliderElem.min);
    let max = parseFloat(sliderElem.max);
    
    if (isNaN(val)) val = parseFloat(sliderElem.value);
    if (val < min) val = min;
    if (val > max) val = max;
    
    sliderElem.value = val;
    updateSlidersFromRange();
}

function updateSlidersFromRange(keepSizeBtnActive = false) {
    if (!keepSizeBtnActive) {
        document.querySelectorAll('#sizeControl .seg-btn').forEach(b => b.classList.remove('active'));
    }

    let font = parseFloat(document.getElementById('fontSizeSlider').value);
    let boldness = parseFloat(document.getElementById('textBoldnessSlider').value);
    let thick = parseFloat(document.getElementById('baseThickSlider').value);
    let recess = parseFloat(document.getElementById('recessDepthSlider').value);
    let expand = parseFloat(document.getElementById('baseExpandSlider').value);
    let outer = parseFloat(document.getElementById('ringOuterSlider').value);
    let inner = parseFloat(document.getElementById('ringInnerSlider').value);
    let padX = parseFloat(document.getElementById('rectPadXSlider').value);
    let padY = parseFloat(document.getElementById('rectPadYSlider').value);
    let rRadius = parseFloat(document.getElementById('rectRadiusSlider').value);
    
    if (inner >= outer) {
        inner = outer - 0.5;
        document.getElementById('ringInnerSlider').value = inner;
    }
    if (recess >= thick) {
        recess = thick - 0.5;
        document.getElementById('recessDepthSlider').value = recess;
    }
    
    document.getElementById('fontSizeVal').value = font;
    document.getElementById('textBoldnessVal').value = boldness.toFixed(1);
    document.getElementById('baseThickVal').value = thick.toFixed(1);
    document.getElementById('recessDepthVal').value = recess.toFixed(1);
    document.getElementById('baseExpandVal').value = expand.toFixed(1);
    document.getElementById('ringOuterVal').value = outer.toFixed(1);
    document.getElementById('ringInnerVal').value = inner.toFixed(1);
    
    document.getElementById('rectPadXVal').value = padX.toFixed(0);
    document.getElementById('rectPadYVal').value = padY.toFixed(0);
    document.getElementById('rectRadiusVal').value = rRadius.toFixed(0);
    
    processModelUpdate();
}

// ==========================================
// 3. ตั้งค่าฉาก 3D 
// ==========================================
const viewer = document.getElementById('viewer');
const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(20, -20, 50);
scene.add(dirLight);

const camera = new THREE.PerspectiveCamera(50, viewer.clientWidth / viewer.clientHeight, 0.1, 1000);
camera.position.set(0, -80, 80);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(viewer.clientWidth, viewer.clientHeight);
viewer.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ขนาดเตียงพิมพ์ 256x256 มม. สำหรับ Bambu Lab A1
const gridHelper = new THREE.GridHelper(256, 51, 0x555555, 0x333333);
gridHelper.rotation.x = Math.PI / 2; 
scene.add(gridHelper);

let mainGroup = new THREE.Group();
scene.add(mainGroup);

let dragControls;
let draggableObjects = [];

window.addEventListener('resize', () => {
    camera.aspect = viewer.clientWidth / viewer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewer.clientWidth, viewer.clientHeight);
});
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// ==========================================
// 4. โหลดฟอนต์และสร้างโมเดล 
// ==========================================
function processModelUpdate() {
    const targetPath = `font/${currentFontFile}`; 
    if (targetPath !== currentFontUrl) {
        opentype.load(targetPath, function (err, font) {
            if (err) return console.error('ไม่สามารถโหลดไฟล์ฟอนต์ได้:', err);
            currentFont = font;
            currentFontUrl = targetPath;
            generatePreview(); 
        });
    } else {
        generatePreview(); 
    }
}

function fixNormals(geometry) {
    const index = geometry.getIndex();
    if (index !== null) {
        for (let j = 0; j < index.count; j += 3) {
            const a = index.getX(j); const c = index.getX(j + 2);
            index.setX(j, c); index.setX(j + 2, a);
        }
    }
    geometry.computeVertexNormals();
}

function generatePreview() {
    if (!currentFont || typeof ClipperLib === 'undefined') return;
    
    const text = document.getElementById('nameInput').value || "Yourname";
    const fontSize = parseFloat(document.getElementById('fontSizeSlider').value);
    const textBoldness = parseFloat(document.getElementById('textBoldnessSlider').value);
    const totalThick = parseFloat(document.getElementById('baseThickSlider').value);
    const recessDepth = parseFloat(document.getElementById('recessDepthSlider').value);
    const bottomThick = Math.max(0.1, totalThick - recessDepth); 
    
    const baseColorHex = document.getElementById('baseColorInput').value;
    const topColorHex = document.getElementById('topColorInput').value;
    
    const curveResolution = 24;
    const scale = 1000; 

    while(mainGroup.children.length > 0) mainGroup.remove(mainGroup.children[0]);
    if(dragControls) dragControls.dispose();
    draggableObjects = [];

    const svgLoader = new THREE.SVGLoader();
    const originalShapes = [];
    let advanceX = 0;

    for (let i = 0; i < text.length; i++) {
        const glyph = currentFont.charToGlyph(text[i]);
        const path = glyph.getPath(advanceX, 0, fontSize);
        const svgPathData = path.toPathData();

        if (svgPathData) {
            const svgData = svgLoader.parse(`<svg><path d="${svgPathData}"/></svg>`);
            svgData.paths.forEach((p) => {
                originalShapes.push(...p.toShapes(true));
            });
        }
        advanceX += (glyph.advanceWidth * fontSize / currentFont.unitsPerEm);
    }

    function clipperPathsToShapes(paths) {
        let svgPath = '';
        paths.forEach(p => {
            if(p.length < 3) return;
            svgPath += `M ${p[0].X / scale} ${p[0].Y / scale} `;
            for(let i=1; i<p.length; i++) {
                svgPath += `L ${p[i].X / scale} ${p[i].Y / scale} `;
            }
            svgPath += 'Z ';
        });
        if (!svgPath) return [];
        const parsedData = svgLoader.parse(`<svg><path fill-rule="nonzero" d="${svgPath}"/></svg>`);
        const res = [];
        parsedData.paths.forEach(p => {
            res.push(...p.toShapes(true));
        });
        return res;
    }

    const textPaths = new ClipperLib.Paths();
    const coText = new ClipperLib.ClipperOffset();
    originalShapes.forEach(shape => {
        coText.AddPath(shape.getPoints().map(p => ({X: Math.round(p.x * scale), Y: Math.round(p.y * scale)})), ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
        shape.holes.forEach(hole => {
            coText.AddPath(hole.getPoints().map(p => ({X: Math.round(p.x * scale), Y: Math.round(p.y * scale)})), ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
        });
    });
    coText.Execute(textPaths, Math.max(textBoldness, 0.001) * scale);

    let tMinX = Infinity, tMaxX = -Infinity, tMinY = Infinity, tMaxY = -Infinity;
    originalShapes.forEach(shape => {
        shape.getPoints().forEach(p => {
            if(p.x < tMinX) tMinX = p.x; if(p.x > tMaxX) tMaxX = p.x;
            if(p.y < tMinY) tMinY = p.y; if(p.y > tMaxY) tMaxY = p.y;
        });
    });
    if (tMinX === Infinity) { tMinX = 0; tMaxX = 10; tMinY = 0; tMaxY = 10; }

    const basePaths = new ClipperLib.Paths();
    if (currentBaseType === 'outline') {
        const shadowOffset = parseFloat(document.getElementById('baseExpandSlider').value);
        const coBase = new ClipperLib.ClipperOffset();
        originalShapes.forEach(shape => {
            coBase.AddPath(shape.getPoints().map(p => ({X: Math.round(p.x * scale), Y: Math.round(p.y * scale)})), ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
            shape.holes.forEach(hole => {
                coBase.AddPath(hole.getPoints().map(p => ({X: Math.round(p.x * scale), Y: Math.round(p.y * scale)})), ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
            });
        });
        coBase.Execute(basePaths, shadowOffset * scale); 
    } else {
        const padX = parseFloat(document.getElementById('rectPadXSlider').value);
        const padY = parseFloat(document.getElementById('rectPadYSlider').value);
        let radius = parseFloat(document.getElementById('rectRadiusSlider').value);
        
        const minX = tMinX - padX; const maxX = tMaxX + padX;
        const minY = tMinY - padY; const maxY = tMaxY + padY;
        radius = Math.min(radius, (maxX - minX) / 2, (maxY - minY) / 2);

        const rectShape = new THREE.Shape();
        rectShape.moveTo(minX + radius, minY);
        rectShape.lineTo(maxX - radius, minY);
        rectShape.quadraticCurveTo(maxX, minY, maxX, minY + radius);
        rectShape.lineTo(maxX, maxY - radius);
        rectShape.quadraticCurveTo(maxX, maxY, maxX - radius, maxY);
        rectShape.lineTo(minX + radius, maxY);
        rectShape.quadraticCurveTo(minX, maxY, minX, maxY - radius);
        rectShape.lineTo(minX, minY + radius);
        rectShape.quadraticCurveTo(minX, minY, minX + radius, minY);
        
        basePaths.push(rectShape.getPoints().map(p => ({X: Math.round(p.x * scale), Y: Math.round(p.y * scale)})));
    }

    const baseGroup = new THREE.Group();

    const clipperBase = new ClipperLib.Clipper();
    clipperBase.AddPaths(basePaths, ClipperLib.PolyType.ptSubject, true);
    const bottomPaths = new ClipperLib.Paths();
    clipperBase.Execute(ClipperLib.ClipType.ctUnion, bottomPaths, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
    const bottomShapes = clipperPathsToShapes(bottomPaths);

    bottomShapes.forEach(shape => {
        const geo = new THREE.ExtrudeGeometry(shape, { depth: bottomThick, bevelEnabled: false, curveSegments: curveResolution });
        geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI));
        geo.translate(0, 0, bottomThick);
        fixNormals(geo);
        const mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: new THREE.Color(baseColorHex) }));
        mesh.userData.partType = 'base';
        baseGroup.add(mesh);
    });

    const clipperDiff = new ClipperLib.Clipper();
    clipperDiff.AddPaths(basePaths, ClipperLib.PolyType.ptSubject, true); 
    clipperDiff.AddPaths(textPaths, ClipperLib.PolyType.ptClip, true);   
    const topPaths = new ClipperLib.Paths();
    clipperDiff.Execute(ClipperLib.ClipType.ctDifference, topPaths, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
    const topShapes = clipperPathsToShapes(topPaths);

    topShapes.forEach(shape => {
        const geo = new THREE.ExtrudeGeometry(shape, { depth: recessDepth + 0.02, bevelEnabled: false, curveSegments: curveResolution });
        geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI));
        geo.translate(0, 0, totalThick); 
        fixNormals(geo);
        const mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: new THREE.Color(topColorHex) })); 
        mesh.userData.partType = 'top';
        baseGroup.add(mesh);
    });

    baseGroup.position.set(0, 0, 0); 
    const baseBox = new THREE.Box3().setFromObject(baseGroup);
    const baseCenter = new THREE.Vector3();
    baseBox.getCenter(baseCenter);
    
    baseGroup.position.set(-baseCenter.x, -baseCenter.y, 0);
    mainGroup.add(baseGroup);
    baseGroup.updateMatrixWorld(true);

    if (currentWorkType === 'keychain') {
        const ringOuterRadius = parseFloat(document.getElementById('ringOuterSlider').value); 
        const ringInnerRadius = parseFloat(document.getElementById('ringInnerSlider').value); 
        const baseBoxForRing = new THREE.Box3().setFromObject(baseGroup);

        const ringShape = new THREE.Shape();
        ringShape.absarc(0, 0, ringOuterRadius, 0, Math.PI * 2, false);
        const holePath = new THREE.Path();
        holePath.absarc(0, 0, ringInnerRadius, 0, Math.PI * 2, true);
        ringShape.holes.push(holePath);

        const ringGeoBottom = new THREE.ExtrudeGeometry(ringShape, { depth: bottomThick, bevelEnabled: false, curveSegments: 32 });
        ringGeoBottom.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI));
        ringGeoBottom.translate(0, 0, bottomThick);
        fixNormals(ringGeoBottom);
        const leftRingBottom = new THREE.Mesh(ringGeoBottom, new THREE.MeshPhongMaterial({ color: new THREE.Color(baseColorHex) }));
        leftRingBottom.userData.partType = 'base';
        
        const ringGeoTop = new THREE.ExtrudeGeometry(ringShape, { depth: recessDepth + 0.02, bevelEnabled: false, curveSegments: 32 });
        ringGeoTop.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI));
        ringGeoTop.translate(0, 0, totalThick);
        fixNormals(ringGeoTop);
        const leftRingTop = new THREE.Mesh(ringGeoTop, new THREE.MeshPhongMaterial({ color: new THREE.Color(topColorHex) }));
        leftRingTop.userData.partType = 'top';
        
        let overlap = 2;
        let startX = baseBoxForRing.min.x - ringOuterRadius + overlap;
        
        leftRingBottom.position.set(startX, 0, 0);
        leftRingTop.position.set(startX, 0, 0);

        leftRingBottom.userData.sibling = leftRingTop;
        leftRingTop.userData.sibling = leftRingBottom;
        
        const textW = (tMaxX - tMinX);
        leftRingBottom.userData.scadOffsetX = startX + (textW / 2) + parseFloat(document.getElementById('baseExpandSlider').value) + ringOuterRadius;
        leftRingBottom.userData.scadOffsetY = 0;
        leftRingTop.userData.scadOffsetX = leftRingBottom.userData.scadOffsetX;
        leftRingTop.userData.scadOffsetY = 0;

        mainGroup.add(leftRingBottom);
        mainGroup.add(leftRingTop);
        draggableObjects.push(leftRingBottom, leftRingTop);

        dragControls = new THREE.DragControls(draggableObjects, camera, renderer.domElement);
        dragControls.addEventListener('dragstart', function (event) {
            controls.enabled = false;
            event.object.material.emissive.setHex(0x333333); 
            if(event.object.userData.sibling) {
                event.object.userData.sibling.material.emissive.setHex(0x333333);
            }
        });
        dragControls.addEventListener('drag', function (event) {
            event.object.position.z = 0; 
            if(event.object.userData.sibling) {
                event.object.userData.sibling.position.copy(event.object.position);
            }
            const target = event.object;
            target.userData.scadOffsetX = target.position.x + (textW / 2) + parseFloat(document.getElementById('baseExpandSlider').value) + ringOuterRadius;
            target.userData.scadOffsetY = target.position.y;
            target.userData.sibling.userData.scadOffsetX = target.userData.scadOffsetX;
            target.userData.sibling.userData.scadOffsetY = target.userData.scadOffsetY;
        });
        dragControls.addEventListener('dragend', function (event) {
            controls.enabled = true;
            event.object.material.emissive.setHex(0x000000); 
            if(event.object.userData.sibling) {
                event.object.userData.sibling.material.emissive.setHex(0x000000);
            }
        });
    }
}

// ==========================================
// 5. ดาวน์โหลด STL และ 3MF (แยกชิ้นและสีสำหรับ Bambu Studio)
// ==========================================
function exportSTL() {
    const exporter = new THREE.STLExporter();
    const stlString = exporter.parse(mainGroup);
    const blob = new Blob([stlString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.download = (document.getElementById('nameInput').value || 'Recessed_Keychain') + '.stl';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function extractPartMeshData(group, targetPartType) {
    let vertices = [];
    let triangles = [];
    let vertexMap = new Map(); // ตัวช่วยจำพิกัดเพื่อเชื่อมจุดซ้ำให้เป็นเนื้อเดียวกัน (Manifold)

    function getVertexIndex(x, y, z) {
        // ปัดเศษทศนิยม 4 ตำแหน่งเพื่อเชื่อมจุดที่อยู่ตำแหน่งเดียวกันเป๊ะๆ เข้าด้วยกัน
        const vx = parseFloat(x.toFixed(4));
        const vy = parseFloat(y.toFixed(4));
        const vz = parseFloat(z.toFixed(4));
        const key = `${vx},${vy},${vz}`;
        
        if (vertexMap.has(key)) {
            return vertexMap.get(key);
        }
        const newIndex = vertices.length;
        vertices.push({ x: vx, y: vy, z: vz });
        vertexMap.set(key, newIndex);
        return newIndex;
    }

    group.updateMatrixWorld(true);
    group.traverse(child => {
        if (child.isMesh && child.userData.partType === targetPartType) {
            let geom = child.geometry.clone();
            geom.applyMatrix4(child.matrixWorld);
            
            let pos = geom.attributes.position;
            let idx = geom.index;

            if (idx) {
                for (let i = 0; i < idx.count; i += 3) {
                    let i1 = idx.getX(i), i2 = idx.getX(i+1), i3 = idx.getX(i+2);
                    let v1 = getVertexIndex(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
                    let v2 = getVertexIndex(pos.getX(i2), pos.getY(i2), pos.getZ(i2));
                    let v3 = getVertexIndex(pos.getX(i3), pos.getY(i3), pos.getZ(i3));
                    if (v1 !== v2 && v2 !== v3 && v1 !== v3) {
                        triangles.push({ v1, v2, v3 });
                    }
                }
            } else {
                for (let i = 0; i < pos.count; i += 3) {
                    let v1 = getVertexIndex(pos.getX(i), pos.getY(i), pos.getZ(i));
                    let v2 = getVertexIndex(pos.getX(i+1), pos.getY(i+1), pos.getZ(i+1));
                    let v3 = getVertexIndex(pos.getX(i+2), pos.getY(i+2), pos.getZ(i+2));
                    if (v1 !== v2 && v2 !== v3 && v1 !== v3) {
                        triangles.push({ v1, v2, v3 });
                    }
                }
            }
        }
    });
    return { vertices, triangles };
}

async function export3MF() {
    if (typeof JSZip === 'undefined') {
        alert('กำลังโหลดไลบรารีสร้างไฟล์ 3MF กรุณาลองใหม่อีกครั้งครับ');
        return;
    }

    const nameText = document.getElementById('nameInput').value || "Model";
    
    // ดึงค่าสีจากหน้าเว็บ (ถ้าไม่มีช่องเลือกสี ให้ใช้สีขาวและฟ้าเป็นค่าเริ่มต้น)
    const rawBaseColor = document.getElementById('baseColorInput') ? document.getElementById('baseColorInput').value : "#FFFFFF";
    const rawTopColor = document.getElementById('topColorInput') ? document.getElementById('topColorInput').value : "#87CEFA";
    
    const baseColor3MF = rawBaseColor.toUpperCase() + "FF";
    const topColor3MF = rawTopColor.toUpperCase() + "FF";

    const baseData = extractPartMeshData(mainGroup, 'base');
    const topData = extractPartMeshData(mainGroup, 'top');

    function buildObjectXML(id, name, meshData, pid, pindex) {
        let vStr = meshData.vertices.map(v => `<vertex x="${v.x.toFixed(4)}" y="${v.y.toFixed(4)}" z="${v.z.toFixed(4)}" />`).join('\n                    ');
        let tStr = meshData.triangles.map(t => `<triangle v1="${t.v1}" v2="${t.v2}" v3="${t.v3}" />`).join('\n                    ');
        return `
        <object id="${id}" name="${name}" type="model" pid="${pid}" pindex="${pindex}">
            <mesh>
                <vertices>
                    ${vStr}
                </vertices>
                <triangles>
                    ${tStr}
                </triangles>
            </mesh>
        </object>`;
    }

    let objectsXML = "";
    let componentsXML = "";
    let bambuPartsConfig = "";

    // ชิ้นที่ 1: ฐาน (ผูกกับช่อง AMS เบอร์ 1)
    if (baseData.vertices.length > 0) {
        objectsXML += buildObjectXML(2, "Base", baseData, 1, 0);
        componentsXML += `<component objectid="2" />\n                `;
        bambuPartsConfig += `
    <part id="2" subtype="normal_part">
      <metadata key="name" value="Base"/>
      <metadata key="extruder" value="1"/>
    </part>`;
    }
    
    // ชิ้นที่ 2: ตัวอักษร/ชั้นบน (ผูกกับช่อง AMS เบอร์ 2)
    if (topData.vertices.length > 0) {
        objectsXML += buildObjectXML(3, "Text", topData, 1, 1);
        componentsXML += `<component objectid="3" />`;
        bambuPartsConfig += `
    <part id="3" subtype="normal_part">
      <metadata key="name" value="Text"/>
      <metadata key="extruder" value="2"/>
    </part>`;
    }

    // ใช้ Header มาตรฐานกลาง (ไม่ใส่ชื่อ BambuStudio เพื่อไม่ให้โปรแกรมเข้าใจผิดว่าเป็น Project file แล้วฟ้องหา Config อื่นๆ)
    const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
    <metadata name="Application">S.S. Crafting 3D Studio</metadata>
    <resources>
        <m:basematerials id="1">
            <m:base name="Base_Color" displaycolor="${baseColor3MF}" />
            <m:base name="Text_Color" displaycolor="${topColor3MF}" />
        </m:basematerials>${objectsXML}
        <object id="4" name="${nameText}" type="model">
            <components>
                ${componentsXML}
            </components>
        </object>
    </resources>
    <build>
        <item objectid="4" />
    </build>
</model>`;

    // ตั้งค่าแยกชิ้นส่วนเข้าช่อง AMS 1 และ 2
    const modelSettingsXML = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="4">
    <metadata key="name" value="${nameText}"/>
    <metadata key="extruder" value="1"/>${bambuPartsConfig}
  </object>
</config>`;

    const contentTypesXML = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
    <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
    <Default Extension="config" ContentType="text/xml" />
</Types>`;

    const relsXML = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`;

    const zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypesXML);
    zip.folder("_rels").file(".rels", relsXML);
    zip.folder("3D").file("3dmodel.model", modelXML);
    zip.folder("Metadata").file("model_settings.config", modelSettingsXML);

    const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.ms-package.3dmanufacturing-3dmodel+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.download = nameText + '.3mf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.onload = () => {
    initUI();
    processModelUpdate();
};