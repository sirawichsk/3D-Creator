// ==========================================
// 1. ตั้งค่ารายการฟอนต์ในโฟลเดอร์ font/
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

let currentFontFile = fontConfig[0].file;
let currentFont = null;
let currentFontUrl = "";

// จำตำแหน่งที่ผู้ใช้ลากห่วง (ถ้าเปลี่ยนแค่สีหรือความหนา ห่วงจะได้ไม่เด้งกลับที่เดิม)
let customRingPos = null;
let lastTextAndFontKey = "";

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
            <div class="preview-text" id="previewText_${index}" style="font-family: 'PreviewFont_${index}', sans-serif;">S</div>
            <div class="font-name">${f.name}</div>
        `;
        grid.appendChild(card);
    });

    const styleTag = document.createElement('style');
    styleTag.innerHTML = styleHTML;
    document.head.appendChild(styleTag);
}

function updatePreviewText() {
    const input = document.getElementById('nameInput');
    if (input.value.length > 2) {
        input.value = input.value.substring(0, 2);
    }
    const text = input.value || "S";
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
    let expand = parseFloat(document.getElementById('baseExpandSlider').value);
    let thick = parseFloat(document.getElementById('baseThickSlider').value);
    let textH = parseFloat(document.getElementById('textHeightSlider').value);
    let outer = parseFloat(document.getElementById('ringOuterSlider').value);
    let inner = parseFloat(document.getElementById('ringInnerSlider').value);
    let ringThick = parseFloat(document.getElementById('ringThickSlider').value);
    
    if (inner >= outer) {
        inner = outer - 0.4;
        document.getElementById('ringInnerSlider').value = inner;
    }
    if (ringThick > thick) {
        ringThick = thick;
        document.getElementById('ringThickSlider').value = ringThick;
    }
    
    document.getElementById('fontSizeVal').value = font;
    document.getElementById('textBoldnessVal').value = boldness.toFixed(1);
    document.getElementById('baseExpandVal').value = expand.toFixed(1);
    document.getElementById('baseThickVal').value = thick.toFixed(1);
    document.getElementById('textHeightVal').value = textH.toFixed(1);
    document.getElementById('ringOuterVal').value = outer.toFixed(1);
    document.getElementById('ringInnerVal').value = inner.toFixed(1);
    document.getElementById('ringThickVal').value = ringThick.toFixed(1);
    
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
camera.position.set(0, -55, 65);

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
// 4. โหลดฟอนต์และสร้างโมเดลจี้ตัวอักษร
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

// วาดเผื่อการพลิกแกน X (Math.PI) เพื่อให้ส่วนโค้งมนหงายขึ้นด้านบนอย่างสวยงาม
function createTabEarShape(outerR, innerR, stemLen) {
    const shape = new THREE.Shape();
    // วาดก้านด้านบน และวาดส่วนโค้งครึ่งวงกลมด้านล่าง (พอโดนพลิกแกน ส่วนโค้งจะหงายขึ้นบนพอดี)
    shape.moveTo(-outerR, stemLen);
    shape.lineTo(-outerR, 0);
    shape.absarc(0, 0, outerR, Math.PI, Math.PI * 2, false);
    shape.lineTo(outerR, stemLen);
    shape.lineTo(-outerR, stemLen);

    // เจาะรูวงกลมตรงจุดศูนย์กลางส่วนโค้ง
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    return shape;
}

function generatePreview() {
    if (!currentFont || typeof ClipperLib === 'undefined') return;
    
    const rawText = document.getElementById('nameInput').value || "S";
    const text = rawText.substring(0, 2);
    const fontSize = parseFloat(document.getElementById('fontSizeSlider').value);
    const textBoldness = parseFloat(document.getElementById('textBoldnessSlider').value);
    const shadowOffset = parseFloat(document.getElementById('baseExpandSlider').value);
    const shadowThickness = parseFloat(document.getElementById('baseThickSlider').value);
    const textHeight = parseFloat(document.getElementById('textHeightSlider').value);
    
    const baseColorHex = document.getElementById('baseColorInput').value;
    const topColorHex = document.getElementById('topColorInput').value;
    
    const curveResolution = 24;
    const scale = 1000; 

    // เช็คว่าถ้าเปลี่ยนตัวอักษรหรือเปลี่ยนขนาด ให้รีเซ็ตตำแหน่งห่วงกลับมาตรงกลางด้านบนอัตโนมัติ
    const currentKey = `${text}_${currentFontFile}_${fontSize}`;
    if (currentKey !== lastTextAndFontKey) {
        customRingPos = null;
        lastTextAndFontKey = currentKey;
    }

    while(mainGroup.children.length > 0) mainGroup.remove(mainGroup.children[0]);
    if(dragControls) dragControls.dispose();
    draggableObjects = [];

    const textGroup = new THREE.Group();
    const svgLoader = new THREE.SVGLoader();
    const originalShapes = [];
    let advanceX = 0;

    // 1. แกะรอยฟอนต์
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
        const parsedData = svgLoader.parse(`<svg><path d="${svgPath}"/></svg>`);
        const res = [];
        parsedData.paths.forEach(p => {
            res.push(...p.toShapes(true));
        });
        return res;
    }

    // 2. ปรับความอ้วนตัวอักษร
    let textShapesToRender = originalShapes;
    if (textBoldness > 0) {
        const coText = new ClipperLib.ClipperOffset();
        originalShapes.forEach(shape => {
            const path = shape.getPoints().map(p => ({X: Math.round(p.x * scale), Y: Math.round(p.y * scale)}));
            coText.AddPath(path, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
            shape.holes.forEach(hole => {
                const hPath = hole.getPoints().map(p => ({X: Math.round(p.x * scale), Y: Math.round(p.y * scale)}));
                coText.AddPath(hPath, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
            });
        });
        const offsetPaths = new ClipperLib.Paths();
        coText.Execute(offsetPaths, textBoldness * scale);
        textShapesToRender = clipperPathsToShapes(offsetPaths);
    }

    // 3. เรนเดอร์ตัวอักษรนูนด้านบน (+0.02 เพื่อให้จมยึดกับเนื้อฐาน ไม่ฟ้อง Open Edges)
    textShapesToRender.forEach(shape => {
        const textGeo = new THREE.ExtrudeGeometry(shape, { depth: textHeight + 0.02, bevelEnabled: false, curveSegments: curveResolution });
        textGeo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI));
        textGeo.translate(0, 0, shadowThickness + textHeight);
        fixNormals(textGeo);
        const mesh = new THREE.Mesh(textGeo, new THREE.MeshPhongMaterial({ color: new THREE.Color(topColorHex) }));
        mesh.userData.partType = 'top';
        textGroup.add(mesh);
    });

    const textBox = new THREE.Box3().setFromObject(textGroup);
    const textCenter = new THREE.Vector3();
    textBox.getCenter(textCenter);
    textGroup.position.set(-textCenter.x, -textCenter.y, 0);

    // 4. สร้างฐานรองป้อมๆ แบบทึบตัน (อุดรูในตัว O และช่องว่างระหว่างตัวอักษรทั้งหมด)
    const baseGroup = new THREE.Group();
    const coBase = new ClipperLib.ClipperOffset();
    
    // ใช้เฉพาะเส้นโครงนอกสุดของตัวอักษร (ไม่นำ shape.holes มาคิด เพื่อให้ตรงกลางตัว O, A, B ตันสนิท)
    originalShapes.forEach(shape => {
        const path = shape.getPoints().map(p => ({X: Math.round(p.x * scale), Y: Math.round(p.y * scale)}));
        coBase.AddPath(path, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
    });

    const offsetPaths = new ClipperLib.Paths();
    coBase.Execute(offsetPaths, shadowOffset * scale); 
    const rawBaseShapes = clipperPathsToShapes(offsetPaths);

    // ล้างรูช่องว่างที่เกิดจากการชนกันระหว่างตัวอักษร 2 ตัว (เช่น ช่องว่างระหว่าง S กับ B)
    const baseShapes = rawBaseShapes.map(s => {
        s.holes = []; 
        return s;
    });

    baseShapes.forEach(shape => {
        const baseGeo = new THREE.ExtrudeGeometry(shape, { depth: shadowThickness, bevelEnabled: false, curveSegments: curveResolution });
        baseGeo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI));
        baseGeo.translate(0, 0, shadowThickness);
        fixNormals(baseGeo);
        const mesh = new THREE.Mesh(baseGeo, new THREE.MeshPhongMaterial({ color: new THREE.Color(baseColorHex) }));
        mesh.userData.partType = 'base';
        baseGroup.add(mesh);
    });
    
    baseGroup.position.set(-textCenter.x, -textCenter.y, 0);

    mainGroup.add(textGroup);
    mainGroup.add(baseGroup);
    baseGroup.updateMatrixWorld(true);

    // 5. สร้างห่วงติ่งด้านบน (Tab Ear) โค้งมนสวยงามและวางติดพื้นเตียงพิมพ์
    const ringOuterRadius = parseFloat(document.getElementById('ringOuterSlider').value); 
    const ringInnerRadius = parseFloat(document.getElementById('ringInnerSlider').value); 
    const ringThickness = parseFloat(document.getElementById('ringThickSlider').value);
    const baseBoxForRing = new THREE.Box3().setFromObject(baseGroup);

    // ความยาวก้านเสียบลงไปในเนื้อฐานของตัวอักษร
    const stemLength = ringOuterRadius * 1.5;
    const tabShape = createTabEarShape(ringOuterRadius, ringInnerRadius, stemLength);

    const ringGeo = new THREE.ExtrudeGeometry(tabShape, { depth: ringThickness, bevelEnabled: false, curveSegments: 32 });
    ringGeo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI));
    
    // วางฐานของติ่งห่วงให้เรียบติดพื้นเตียงพิมพ์ (Z=0) เสมอกับก้นฐานตัวอักษร (พิมพ์ง่าย ไม่ต้องใช้ Support)
    ringGeo.translate(0, 0, ringThickness);
    fixNormals(ringGeo);
    
    const topRing = new THREE.Mesh(ringGeo, new THREE.MeshPhongMaterial({ color: new THREE.Color(baseColorHex) }));
    topRing.userData.partType = 'base';
    
    // ตำแหน่งเริ่มต้น: โผล่พ้นขอบบนของตัวอักษรขึ้นมาเป็นติ่งโค้งมนพอดิบพอดี
    if (customRingPos) {
        topRing.position.set(customRingPos.x, customRingPos.y, 0);
    } else {
        const startX = 0;
        const startY = baseBoxForRing.max.y + (ringOuterRadius * 0.25);
        topRing.position.set(startX, startY, 0);
    }
    
    mainGroup.add(topRing);
    draggableObjects.push(topRing);

    dragControls = new THREE.DragControls(draggableObjects, camera, renderer.domElement);
    dragControls.addEventListener('dragstart', function (event) {
        controls.enabled = false;
        event.object.material.emissive.setHex(0x333333); 
    });
    dragControls.addEventListener('drag', function (event) {
        event.object.position.z = 0; 
        customRingPos = { x: event.object.position.x, y: event.object.position.y };
    });
    dragControls.addEventListener('dragend', function (event) {
        controls.enabled = true;
        event.object.material.emissive.setHex(0x000000); 
    });
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
    link.download = 'Letter_' + (document.getElementById('nameInput').value || 'S') + '.stl';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function extractPartMeshData(group, targetPartType) {
    let vertices = [];
    let triangles = [];
    let vertexMap = new Map();

    function getVertexIndex(x, y, z) {
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

    const nameText = 'Letter_' + (document.getElementById('nameInput').value || "S");
    const rawBaseColor = document.getElementById('baseColorInput') ? document.getElementById('baseColorInput').value : "#FF9933";
    const rawTopColor = document.getElementById('topColorInput') ? document.getElementById('topColorInput').value : "#FFFFFF";
    
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

    if (baseData.vertices.length > 0) {
        objectsXML += buildObjectXML(2, "Base", baseData, 1, 0);
        componentsXML += `<component objectid="2" />\n                `;
        bambuPartsConfig += `
    <part id="2" subtype="normal_part">
      <metadata key="name" value="Base"/>
      <metadata key="extruder" value="1"/>
    </part>`;
    }
    
    if (topData.vertices.length > 0) {
        objectsXML += buildObjectXML(3, "Text", topData, 1, 1);
        componentsXML += `<component objectid="3" />`;
        bambuPartsConfig += `
    <part id="3" subtype="normal_part">
      <metadata key="name" value="Text"/>
      <metadata key="extruder" value="2"/>
    </part>`;
    }

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