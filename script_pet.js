// ==========================================
// 1. ตั้งค่ารายการฟอนต์และสีส่วนกลาง (ดึงจาก shop_system.js)
// ==========================================
let fontConfig = [];
let currentPetShape = 'bone'; // 'bone', 'fish', 'circle'
let isCircleNfcEnabled = false;
let currentFontFile = "Mitr-SemiBold.ttf";
let currentFont = null;
let currentFontUrl = "";

// รายการอีโมจิที่แสดงบนป้าย (เพิ่ม/ลบ/ลากขยับได้อิสระ)
let emojiItems = [];
let nextEmojiId = 1;

// ตำแหน่งพิเศษของสัญลักษณ์ NFC
let customNfcPos = null;

window.defaultFilamentColors = [
    { name: "เหลือง (Yellow)", hex: "#f5c400", active: true },
    { name: "ดำ (Black)", hex: "#1a1a1a", active: true },
    { name: "ขาว (White)", hex: "#ffffff", active: true },
    { name: "แดง (Red)", hex: "#e62e2e", active: true },
    { name: "เขียว (Green)", hex: "#00ba7c", active: true },
    { name: "ฟ้ามิ้นต์ (Mint)", hex: "#4dd0e1", active: true },
    { name: "น้ำเงิน (Blue)", hex: "#1e66d0", active: true },
    { name: "ชมพู (Pink)", hex: "#ff77a9", active: true },
    { name: "ส้ม (Orange)", hex: "#ff7b00", active: true },
    { name: "ทอง/น้ำตาล (Gold)", hex: "#c99e52", active: true }
];

function getFontFolderPath() {
    return window.FONT_FOLDER_PATH || "font/";
}

// ==========================================
// 2. ฟังก์ชันจัดการระบบสีส่วนกลาง (คลิกเพื่อกางตัวเลือกสี)
// ==========================================
function getAvailablePalette() {
    if (typeof priceConfig !== "undefined" && Array.isArray(priceConfig.filament_colors) && priceConfig.filament_colors.length > 0) {
        return priceConfig.filament_colors.filter(function(c) { return c.active !== false; });
    }
    return window.defaultFilamentColors;
}

window.refreshFilamentSwatchesUI = function() {
    renderColorSwatches();
};

function toggleColorDropdown(which) {
    const baseDrop = document.getElementById("baseColorSwatchContainer");
    const topDrop = document.getElementById("topColorSwatchContainer");
    if (!baseDrop || !topDrop) return;
    if (which === "base") {
        baseDrop.classList.toggle("open");
        topDrop.classList.remove("open");
    } else {
        topDrop.classList.toggle("open");
        baseDrop.classList.remove("open");
    }
}

function renderColorSwatches() {
    const palette = getAvailablePalette();
    const baseInput = document.getElementById("baseColorInput");
    const topInput = document.getElementById("topColorInput");
    if (!baseInput || !topInput) return;

    const baseHex = baseInput.value;
    const topHex = topInput.value;

    const baseBox = document.getElementById("baseColorSwatchContainer");
    const topBox = document.getElementById("topColorSwatchContainer");
    if (!baseBox || !topBox) return;

    baseBox.innerHTML = "";
    topBox.innerHTML = "";

    let baseFoundName = baseHex;
    let topFoundName = topHex;

    palette.forEach(function(col) {
        if (col.hex.toLowerCase() === baseHex.toLowerCase()) baseFoundName = col.name;
        if (col.hex.toLowerCase() === topHex.toLowerCase()) topFoundName = col.name;

        const bBtn = document.createElement("button");
        bBtn.type = "button";
        bBtn.className = "stock-color-pill" + (col.hex.toLowerCase() === baseHex.toLowerCase() ? " active" : "");
        bBtn.innerHTML = '<span class="stock-color-dot" style="background:' + col.hex + '"></span>' + col.name;
        bBtn.onclick = function() {
            baseInput.value = col.hex;
            baseBox.classList.remove("open");
            renderColorSwatches();
            processModelUpdate();
        };
        baseBox.appendChild(bBtn);

        const tBtn = document.createElement("button");
        tBtn.type = "button";
        tBtn.className = "stock-color-pill" + (col.hex.toLowerCase() === topHex.toLowerCase() ? " active" : "");
        tBtn.innerHTML = '<span class="stock-color-dot" style="background:' + col.hex + '"></span>' + col.name;
        tBtn.onclick = function() {
            topInput.value = col.hex;
            topBox.classList.remove("open");
            renderColorSwatches();
            processModelUpdate();
        };
        topBox.appendChild(tBtn);
    });

    const baseDot = document.getElementById("baseSelectedDot");
    const baseNameEl = document.getElementById("baseSelectedName");
    if (baseDot) baseDot.style.background = baseHex;
    if (baseNameEl) baseNameEl.innerText = baseFoundName;

    const topDot = document.getElementById("topSelectedDot");
    const topNameEl = document.getElementById("topSelectedName");
    if (topDot) topDot.style.background = topHex;
    if (topNameEl) topNameEl.innerText = topFoundName;
}

// ==========================================
// 3. ฟังก์ชันจัดการอีโมจิ (รอยเท้าหมา / หัวใจ)
// ==========================================
function resetDefaultEmojis() {
    const tagW = parseFloat(document.getElementById('tagWidthSlider').value) || 50;
    emojiItems = [];

    if (currentPetShape === 'bone') {
        emojiItems.push({ id: nextEmojiId++, type: 'paw', x: tagW * 0.27, y: -tagW * 0.085, angle: 15 });
    } else if (currentPetShape === 'fish') {
        emojiItems.push({ id: nextEmojiId++, type: 'eye', x: -tagW * 0.33, y: tagW * 0.03, angle: 0 });
        emojiItems.push({ id: nextEmojiId++, type: 'heart', x: tagW * 0.27, y: -tagW * 0.03, angle: 0 });
    } else if (currentPetShape === 'circle') {
        emojiItems.push({ id: nextEmojiId++, type: 'paw', x: -tagW * 0.06, y: tagW * 0.23, angle: 12 });
        emojiItems.push({ id: nextEmojiId++, type: 'paw', x: tagW * 0.13, y: tagW * 0.16, angle: -15 });
        if (!isCircleNfcEnabled) {
            emojiItems.push({ id: nextEmojiId++, type: 'paw', x: -tagW * 0.11, y: -tagW * 0.29, angle: 15 });
            emojiItems.push({ id: nextEmojiId++, type: 'paw', x: tagW * 0.08, y: -tagW * 0.34, angle: -12 });
        }
    }
    customNfcPos = null;
    processModelUpdate();
}

function clearAllEmojis() {
    emojiItems = emojiItems.filter(item => item.type === 'eye');
    processModelUpdate();
}

function addEmoji(type) {
    const tagW = parseFloat(document.getElementById('tagWidthSlider').value) || 50;
    const offset = (emojiItems.length % 3 - 1) * (tagW * 0.08);
    emojiItems.push({
        id: nextEmojiId++,
        type: type,
        x: offset,
        y: -tagW * 0.12,
        angle: (type === 'paw') ? 12 : 0
    });
    processModelUpdate();
}

// ==========================================
// 4. ฟังก์ชันควบคุม UI และฟอนต์ส่วนกลาง
// ==========================================
function initUI() {
    const defaultTenFonts = [
        { name: "Mitr SemiBold", file: "Mitr-SemiBold.ttf", family: "Mitr" },
        { name: "Chewy", file: "Chewy-Regular.ttf", family: "Chewy" },
        { name: "Kanit ExtraBold", file: "Kanit-ExtraBold.ttf", family: "Kanit" },
        { name: "Prompt Bold", file: "Prompt-Bold.ttf", family: "Prompt" },
        { name: "Athiti Bold", file: "Athiti-Bold.ttf", family: "Athiti" },
        { name: "NotoSansThai", file: "NotoSansThai-VariableFont_wdth,wght.ttf", family: "NotoSansThai" },
        { name: "LuckiestGuy", file: "LuckiestGuy-Regular.ttf", family: "LuckiestGuy" },
        { name: "OleoScript", file: "OleoScript-Bold.ttf", family: "OleoScript" },
        { name: "Super Basic", file: "Super Basic.ttf", family: "SuperBasic" },
        { name: "TitanOne", file: "TitanOne-Regular.ttf", family: "TitanOne" }
    ];

    if (window.shopFontConfig && window.shopFontConfig.length >= 8) {
        fontConfig = window.shopFontConfig;
    } else {
        fontConfig = defaultTenFonts;
        window.shopFontConfig = defaultTenFonts;
    }

    const mitrFound = fontConfig.find(function(f) { return f.file === "Mitr-SemiBold.ttf"; });
    currentFontFile = mitrFound ? mitrFound.file : fontConfig[0].file;

    const folder = getFontFolderPath();
    const grid = document.getElementById('fontGrid');
    grid.innerHTML = "";
    let styleHTML = "";

    fontConfig.forEach((f, index) => {
        const famName = f.family || `PreviewFont_${index}`;
        styleHTML += `
            @font-face {
                font-family: '${famName}';
                src: url('${folder}${encodeURI(f.file)}') format('truetype');
            }
        `;
        const card = document.createElement('div');
        card.className = `font-card ${f.file === currentFontFile ? 'active' : ''}`;
        card.onclick = () => selectFont(index, card);
        card.innerHTML = `
            <div class="preview-text" id="previewText_${index}" style="font-family: '${famName}', sans-serif;">SIMBA</div>
            <div class="font-name">${f.name}</div>
        `;
        grid.appendChild(card);
    });

    const styleTag = document.createElement('style');
    styleTag.innerHTML = styleHTML;
    document.head.appendChild(styleTag);

    // บังคับตั้งค่าเริ่มต้นความหนากรอบขอบป้ายเป็น 1.5 mm
    const rimS = document.getElementById('rimWidthSlider');
    const rimV = document.getElementById('rimWidthVal');
    if (rimS) rimS.value = 1.5;
    if (rimV) rimV.value = "1.5";

    renderColorSwatches();
}

function updatePreviewText() {
    const text = document.getElementById('nameInput').value || "SIMBA";
    fontConfig.forEach((_, index) => {
        const el = document.getElementById(`previewText_${index}`);
        if (el) el.innerText = text;
    });
}

function selectFont(index, cardElement) {
    document.querySelectorAll('.font-card').forEach(c => c.classList.remove('active'));
    cardElement.classList.add('active');
    currentFontFile = fontConfig[index].file;
    processModelUpdate();
}

function setPetShape(shape, btn) {
    document.querySelectorAll('#shapeControl .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPetShape = shape;

    const circleBlock = document.getElementById('circleOptionsBlock');
    const phoneLabel = document.getElementById('phoneLabel');
    const backHint = document.getElementById('backPhoneHint');

    // ตั้งค่าความหนาขอบป้าย (rimWidthSlider) เริ่มต้นที่ 1.5 ทุกทรงตามที่กำหนด
    if (shape === 'circle') {
        circleBlock.style.display = 'block';
        phoneLabel.innerText = 'เบอร์โทรศัพท์ (นูนด้านหน้า):';
        backHint.style.display = 'none';
        document.getElementById('tagWidthSlider').value = 40;
        document.getElementById('rimWidthSlider').value = 1.5;
        document.getElementById('fontSizeSlider').value = 7.5;
        document.getElementById('phoneSizeSlider').value = 4.2;
        document.getElementById('topColorInput').value = '#1a1a1a';
    } else {
        circleBlock.style.display = 'none';
        phoneLabel.innerText = 'เบอร์โทรศัพท์ (ปั๊มจมด้านหลัง ไม่ใส่สี):';
        backHint.style.display = 'block';
        document.getElementById('tagWidthSlider').value = 50;
        document.getElementById('rimWidthSlider').value = 1.5;
        document.getElementById('fontSizeSlider').value = 9.0;
        document.getElementById('phoneSizeSlider').value = 5.5;
        document.getElementById('topColorInput').value = (shape === 'bone') ? '#00ba7c' : '#1e66d0';
    }
    renderColorSwatches();
    resetDefaultEmojis();
    updateSlidersFromRange();
}

function setCircleNfcMode(enabled, btn) {
    document.querySelectorAll('#nfcModeControl .seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    isCircleNfcEnabled = enabled;

    const nfcBlock = document.getElementById('nfcSettingsBlock');
    nfcBlock.style.display = enabled ? 'block' : 'none';

    if (enabled && parseFloat(document.getElementById('baseThickSlider').value) < 3.0) {
        document.getElementById('baseThickSlider').value = 3.2;
    }
    resetDefaultEmojis();
    updateSlidersFromRange();
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

function updateSlidersFromRange() {
    let tagW = parseFloat(document.getElementById('tagWidthSlider').value);
    let rimW = parseFloat(document.getElementById('rimWidthSlider').value);
    let emojiS = parseFloat(document.getElementById('emojiScaleSlider').value);
    let fontS = parseFloat(document.getElementById('fontSizeSlider').value);
    let phoneS = parseFloat(document.getElementById('phoneSizeSlider').value);
    let baseT = parseFloat(document.getElementById('baseThickSlider').value);
    let topT = parseFloat(document.getElementById('topThickSlider').value);
    let nfcD = parseFloat(document.getElementById('nfcDiaSlider').value);
    let nfcT = parseFloat(document.getElementById('nfcThickSlider').value);

    if (nfcD >= tagW - 4) {
        nfcD = tagW - 4;
        document.getElementById('nfcDiaSlider').value = nfcD;
    }
    if (nfcT >= baseT - 0.8) {
        nfcT = Math.max(0.6, baseT - 0.8);
        document.getElementById('nfcThickSlider').value = nfcT;
    }

    document.getElementById('tagWidthVal').value = tagW.toFixed(0);
    document.getElementById('rimWidthVal').value = rimW.toFixed(1);
    document.getElementById('emojiScaleVal').value = emojiS.toFixed(1);
    document.getElementById('fontSizeVal').value = fontS.toFixed(1);
    document.getElementById('phoneSizeVal').value = phoneS.toFixed(1);
    document.getElementById('baseThickVal').value = baseT.toFixed(1);
    document.getElementById('topThickVal').value = topT.toFixed(1);
    document.getElementById('nfcDiaVal').value = nfcD.toFixed(1);
    document.getElementById('nfcThickVal').value = nfcT.toFixed(1);

    processModelUpdate();
}

// ==========================================
// 5. ตั้งค่าฉาก 3D และจัดไฟสตูดิโอแบบเดียวกับ Tag กระเป๋า
// ==========================================
const viewer = document.getElementById('viewer');
const scene = new THREE.Scene();

// ใช้ชุดไฟ Raking Studio Lighting เหมือนหน้า Tag กระเป๋าเป๊ะ เพื่อลดแสงสะท้อนหน้าตรงและเห็นมิติชัดเจน
scene.add(new THREE.AmbientLight(0xffffff, 0.42));

const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
keyLight.position.set(-70, 95, 95);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.32);
fillLight.position.set(80, -85, 55);
scene.add(fillLight);

// เพิ่มไฟส่องด้านหลังป้าย เพื่อให้เวลาหมุนไปดูเบอร์โทรปั๊มจมด้านหลังเห็นร่องตัวเลขชัดเจน
const backLight = new THREE.DirectionalLight(0xffffff, 0.55);
backLight.position.set(30, -50, -80);
scene.add(backLight);

const initW = Math.max(100, viewer.clientWidth);
const initH = Math.max(100, viewer.clientHeight);
const camera = new THREE.PerspectiveCamera(50, initW / initH, 0.1, 1000);
camera.position.set(0, -55, 65);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(initW, initH, false);
renderer.setPixelRatio(window.devicePixelRatio);
viewer.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const gridHelper = new THREE.GridHelper(240, 24, 0x444444, 0x252525);
gridHelper.rotation.x = Math.PI / 2; 
scene.add(gridHelper);

let mainGroup = new THREE.Group();
scene.add(mainGroup);

let dragControls;
let draggableObjects = [];

function handleViewerResize() {
    if (!viewer || !renderer || !camera) return;
    const cw = Math.max(50, viewer.clientWidth);
    const ch = Math.max(50, viewer.clientHeight);
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
    renderer.setSize(cw, ch, false);
}

window.addEventListener('resize', handleViewerResize);
if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(handleViewerResize).observe(viewer);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// ==========================================
// 6. ฟังก์ชันช่วยคำนวณรูปทรง Clipper & Three.js
// ==========================================
const SCALE = 1000;
const svgLoader = new THREE.SVGLoader();

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

function makeCirclePath(cx, cy, r, segments = 48) {
    const path = [];
    for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        path.push({ X: Math.round((cx + Math.cos(a) * r) * SCALE), Y: Math.round((cy + Math.sin(a) * r) * SCALE) });
    }
    return path;
}

function makeEllipsePath(cx, cy, rx, ry, rotRad = 0, segments = 48) {
    const path = [];
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);
    for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const lx = Math.cos(a) * rx;
        const ly = Math.sin(a) * ry;
        const x = cx + (lx * cosR - ly * sinR);
        const y = cy + (lx * sinR + ly * cosR);
        path.push({ X: Math.round(x * SCALE), Y: Math.round(y * SCALE) });
    }
    return path;
}

function makeBoxPath(cx, cy, w, h) {
    const hw = w / 2, hh = h / 2;
    return [
        { X: Math.round((cx - hw) * SCALE), Y: Math.round((cy - hh) * SCALE) },
        { X: Math.round((cx + hw) * SCALE), Y: Math.round((cy - hh) * SCALE) },
        { X: Math.round((cx + hw) * SCALE), Y: Math.round((cy + hh) * SCALE) },
        { X: Math.round((cx - hw) * SCALE), Y: Math.round((cy + hh) * SCALE) }
    ];
}

function unionClipperPaths(pathsList) {
    const c = new ClipperLib.Clipper();
    c.AddPaths(pathsList, ClipperLib.PolyType.ptSubject, true);
    const res = new ClipperLib.Paths();
    c.Execute(ClipperLib.ClipType.ctUnion, res, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
    return res;
}

function diffClipperPaths(subjPaths, clipPaths) {
    const c = new ClipperLib.Clipper();
    c.AddPaths(subjPaths, ClipperLib.PolyType.ptSubject, true);
    c.AddPaths(clipPaths, ClipperLib.PolyType.ptClip, true);
    const res = new ClipperLib.Paths();
    c.Execute(ClipperLib.ClipType.ctDifference, res, ClipperLib.PolyFillType.pftEvenOdd, ClipperLib.PolyFillType.pftEvenOdd);
    return res;
}

function offsetClipperPaths(paths, deltaMm) {
    const co = new ClipperLib.ClipperOffset();
    paths.forEach(p => co.AddPath(p, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon));
    const res = new ClipperLib.Paths();
    co.Execute(res, deltaMm * SCALE);
    return res;
}

function clipperPathsToShapes(paths) {
    let svgPath = '';
    paths.forEach(p => {
        if (p.length < 3) return;
        svgPath += `M ${p[0].X / SCALE} ${p[0].Y / SCALE} `;
        for (let i = 1; i < p.length; i++) {
            svgPath += `L ${p[i].X / SCALE} ${p[i].Y / SCALE} `;
        }
        svgPath += 'Z ';
    });
    if (!svgPath) return [];
    const parsedData = svgLoader.parse(`<svg><path fill-rule="evenodd" d="${svgPath}"/></svg>`);
    const res = [];
    parsedData.paths.forEach(p => {
        res.push(...p.toShapes(true));
    });
    return res;
}

function addFrontTextMeshes(text, fontSize, cx, cy, depth, zBottom, material, partType, targetGroup) {
    if (!text || !currentFont) return;
    const shapes = [];
    let advanceX = 0;

    for (let i = 0; i < text.length; i++) {
        const glyph = currentFont.charToGlyph(text[i]);
        const path = glyph.getPath(advanceX, 0, fontSize);
        const svgPathData = path.toPathData();
        if (svgPathData) {
            const svgData = svgLoader.parse(`<svg><path d="${svgPathData}"/></svg>`);
            svgData.paths.forEach(p => {
                shapes.push(...p.toShapes(true));
            });
        }
        advanceX += (glyph.advanceWidth * fontSize / currentFont.unitsPerEm);
    }
    if (shapes.length === 0) return;

    const tempGroup = new THREE.Group();
    const curveResolution = 24;

    shapes.forEach(shape => {
        const geo = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false, curveSegments: curveResolution });
        geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI));
        fixNormals(geo);
        const mesh = new THREE.Mesh(geo, material);
        tempGroup.add(mesh);
    });

    const box = new THREE.Box3().setFromObject(tempGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);

    tempGroup.children.forEach(m => {
        m.geometry.translate(cx - center.x, cy - center.y, zBottom + depth);
        const finalMesh = new THREE.Mesh(m.geometry, material);
        finalMesh.userData.partType = partType;
        targetGroup.add(finalMesh);
    });
}

function getBackEngraveClipperPaths(text, fontSize, cx, cy) {
    if (!text || !currentFont) return [];
    const rawShapes = [];
    let advanceX = 0;

    for (let i = 0; i < text.length; i++) {
        const glyph = currentFont.charToGlyph(text[i]);
        const path = glyph.getPath(advanceX, 0, fontSize);
        const svgPathData = path.toPathData();
        if (svgPathData) {
            const svgData = svgLoader.parse(`<svg><path d="${svgPathData}"/></svg>`);
            svgData.paths.forEach(p => rawShapes.push(...p.toShapes(true)));
        }
        advanceX += (glyph.advanceWidth * fontSize / currentFont.unitsPerEm);
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    rawShapes.forEach(s => {
        s.getPoints(24).forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });
    });
    if (minX === Infinity) return [];

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    const subjPaths = [];
    const holePaths = [];

    rawShapes.forEach(s => {
        const pts = s.getPoints(24).map(p => ({
            X: Math.round((cx - (p.x - midX)) * SCALE),
            Y: Math.round((cy - (p.y - midY)) * SCALE)
        }));
        subjPaths.push(pts);

        s.holes.forEach(h => {
            const hPts = h.getPoints(24).map(p => ({
                X: Math.round((cx - (p.x - midX)) * SCALE),
                Y: Math.round((cy - (p.y - midY)) * SCALE)
            }));
            holePaths.push(hPts);
        });
    });

    const c1 = new ClipperLib.Clipper();
    c1.AddPaths(subjPaths, ClipperLib.PolyType.ptSubject, true);
    const unitedSubj = new ClipperLib.Paths();
    c1.Execute(ClipperLib.ClipType.ctUnion, unitedSubj, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);

    if (holePaths.length > 0) {
        return diffClipperPaths(unitedSubj, holePaths);
    }
    return unitedSubj;
}

// ==========================================
// 7. สร้างรูปทรงกระดูก ปลา วงกลม และอีโมจิ
// ==========================================
function buildBoneOutline(W) {
    const L = W * 0.30;
    const barH = W * 0.35;
    const rLobe = W * 0.145;
    const yOff = W * 0.105;

    let parts = [];
    parts.push(makeBoxPath(0, 0, L * 2, barH));
    parts.push(makeCirclePath(-L, yOff, rLobe));
    parts.push(makeCirclePath(-L, -yOff, rLobe));
    parts.push(makeCirclePath(L, yOff, rLobe));
    parts.push(makeCirclePath(L, -yOff, rLobe));

    let united = unionClipperPaths(parts);
    let smoothed = offsetClipperPaths(offsetClipperPaths(united, 2.2), -2.2);
    return { paths: smoothed, topY: barH / 2 };
}

function buildFishOutline(W) {
    const bodyW = W * 0.72;
    const bodyH = W * 0.44;
    const bodyCx = -W * 0.08;

    let parts = [];
    parts.push(makeEllipsePath(bodyCx, 0, bodyW / 2, bodyH / 2, 0, 64));

    const tailStartX = bodyCx + bodyW * 0.32;
    const tailEndX = W * 0.46;
    const tailSpreadY = bodyH * 0.46;
    const rawTail = [[
        { X: Math.round(tailStartX * SCALE), Y: 0 },
        { X: Math.round(tailEndX * SCALE), Y: Math.round(tailSpreadY * SCALE) },
        { X: Math.round((tailEndX - W * 0.09) * SCALE), Y: 0 },
        { X: Math.round(tailEndX * SCALE), Y: Math.round(-tailSpreadY * SCALE) }
    ]];
    const roundedTail = offsetClipperPaths(rawTail, W * 0.045);
    parts.push(...roundedTail);

    let united = unionClipperPaths(parts);
    let smoothed = offsetClipperPaths(offsetClipperPaths(united, 1.5), -1.5);
    return { paths: smoothed, topY: bodyH / 2, bodyCx: bodyCx };
}

function buildCircleOutline(D) {
    const R = D / 2;
    return { paths: [makeCirclePath(0, 0, R, 64)], topY: R };
}

function makePawClipperPaths(cx, cy, size, angleDeg = 0) {
    const rad = angleDeg * Math.PI / 180;
    const cosA = Math.cos(rad), sinA = Math.sin(rad);
    function rot(lx, ly) {
        return {
            x: cx + (lx * cosA - ly * sinA),
            y: cy + (lx * sinA + ly * cosA)
        };
    }

    let parts = [];
    const p0 = rot(0, -size * 0.18);
    parts.push(makeEllipsePath(p0.x, p0.y, size * 0.34, size * 0.25, rad, 24));
    const toes = [
        { x: -size * 0.34, y: size * 0.14, a: 20 },
        { x: -size * 0.12, y: size * 0.30, a: 7 },
        { x: size * 0.12,  y: size * 0.30, a: -7 },
        { x: size * 0.34,  y: size * 0.14, a: -20 }
    ];
    toes.forEach(t => {
        const pt = rot(t.x, t.y);
        parts.push(makeEllipsePath(pt.x, pt.y, size * 0.11, size * 0.16, rad + (t.a * Math.PI / 180), 20));
    });
    return unionClipperPaths(parts);
}

function makeHeartClipperPaths(cx, cy, size) {
    const path = [];
    const segments = 64;
    const s = size / 30;
    for (let i = 0; i < segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        path.push({
            X: Math.round((cx + hx * s) * SCALE),
            Y: Math.round((cy + (hy + 2.5) * s) * SCALE)
        });
    }
    return [path];
}

function makeNfcWavesPaths(cx, cy, size) {
    let wavePaths = [];
    for (let i = 1; i <= 3; i++) {
        const r = size * (0.22 * i);
        const arcPts = [];
        const segs = 16;
        for (let s = 0; s <= segs; s++) {
            const a = (-Math.PI / 3) + (s / segs) * (2 * Math.PI / 3);
            arcPts.push({
                X: Math.round((cx + Math.cos(a) * r) * SCALE),
                Y: Math.round((cy + Math.sin(a) * r) * SCALE)
            });
        }
        const co = new ClipperLib.ClipperOffset();
        co.AddPath(arcPts, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etOpenRound);
        const stroke = new ClipperLib.Paths();
        co.Execute(stroke, size * 0.065 * SCALE);
        wavePaths.push(...stroke);
    }
    return unionClipperPaths(wavePaths);
}

function addDraggableEmojiMesh(emojiObj, localClipperPaths, depth, zBottom, material, partType, targetGroup) {
    const shapes = clipperPathsToShapes(localClipperPaths);
    if (shapes.length === 0) return;

    const geometries = shapes.map(s => {
        const g = new THREE.ExtrudeGeometry(s, { depth: depth, bevelEnabled: false, curveSegments: 24 });
        g.translate(0, 0, zBottom);
        g.computeVertexNormals();
        return g;
    });

    const mergedGeo = new THREE.BufferGeometry();
    let positions = [];
    let normals = [];

    geometries.forEach(g => {
        const nonIndexed = g.index ? g.toNonIndexed() : g;
        const pos = nonIndexed.attributes.position.array;
        const norm = nonIndexed.attributes.normal.array;
        for (let i = 0; i < pos.length; i++) {
            positions.push(pos[i]);
            normals.push(norm[i]);
        }
    });

    mergedGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    mergedGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

    const mesh = new THREE.Mesh(mergedGeo, material.clone());
    mesh.userData.partType = partType;
    mesh.userData.emojiRef = emojiObj;
    mesh.position.set(emojiObj.x, emojiObj.y, 0);

    targetGroup.add(mesh);
    draggableObjects.push(mesh);
}

// ==========================================
// 8. ประมวลผลและสร้างโมเดล 3D
// ==========================================
function processModelUpdate() {
    const folder = getFontFolderPath();
    const targetPath = `${folder}${encodeURI(currentFontFile)}`; 
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

function addExtrudedShapesToGroup(shapes, depth, zBottom, material, partType, group) {
    const curveResolution = 24;
    shapes.forEach(s => {
        const geo = new THREE.ExtrudeGeometry(s, { depth: depth, bevelEnabled: false, curveSegments: curveResolution });
        geo.translate(0, 0, zBottom);
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, material);
        mesh.userData.partType = partType;
        group.add(mesh);
    });
}

function generatePreview() {
    if (!currentFont || typeof ClipperLib === 'undefined') return;

    while (mainGroup.children.length > 0) mainGroup.remove(mainGroup.children[0]);
    if (dragControls) dragControls.dispose();
    draggableObjects = [];

    const nameText = document.getElementById('nameInput').value.trim();
    const phoneText = document.getElementById('phoneInput').value.trim();
    const tagW = parseFloat(document.getElementById('tagWidthSlider').value);
    const rimWidth = parseFloat(document.getElementById('rimWidthSlider').value);
    const emojiScale = parseFloat(document.getElementById('emojiScaleSlider').value);
    const fontSize = parseFloat(document.getElementById('fontSizeSlider').value);
    const phoneSize = parseFloat(document.getElementById('phoneSizeSlider').value);
    const baseThick = parseFloat(document.getElementById('baseThickSlider').value);
    const topThick = parseFloat(document.getElementById('topThickSlider').value);

    const baseColorHex = document.getElementById('baseColorInput').value;
    const topColorHex = document.getElementById('topColorInput').value;

    // ใช้วัสดุ MeshStandardMaterial แบบเดียวกับ Tag กระเป๋า เพื่อให้แสงเงาดูนุ่มนวลและเห็นมิติชัดเจน
    const baseMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(baseColorHex), roughness: 0.45, metalness: 0.05 });
    const topMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(topColorHex), roughness: 0.4, metalness: 0.05 });

    let shapeData;
    if (currentPetShape === 'bone') {
        shapeData = buildBoneOutline(tagW);
    } else if (currentPetShape === 'fish') {
        shapeData = buildFishOutline(tagW);
    } else {
        shapeData = buildCircleOutline(tagW);
    }

    const bodyOuterPaths = shapeData.paths;
    const bodyInnerPaths = offsetClipperPaths(bodyOuterPaths, -rimWidth);

    const earOuterR = (currentPetShape === 'circle') ? 4.2 : 3.8;
    const earInnerR = (currentPetShape === 'circle') ? 1.8 : 1.6;
    const earCx = (currentPetShape === 'fish') ? shapeData.bodyCx * 0.4 : 0;
    const earCy = shapeData.topY + earOuterR * 0.55;

    const earTabParts = [
        makeCirclePath(earCx, earCy, earOuterR, 36),
        makeBoxPath(earCx, earCy - earOuterR * 0.6, earOuterR * 2, earOuterR * 1.2)
    ];
    const earOuterPaths = unionClipperPaths(earTabParts);
    const earHolePaths = [makeCirclePath(earCx, earCy, earInnerR, 32)];

    const fullBasePaths = diffClipperPaths(unionClipperPaths([...bodyOuterPaths, ...earOuterPaths]), earHolePaths);

    let rimPaths = [];
    const topDepth = topThick + 0.02;
    const topZBottom = baseThick - 0.02;

    if (currentPetShape === 'bone') {
        rimPaths.push(...diffClipperPaths(fullBasePaths, bodyInnerPaths));
        if (nameText) {
            addFrontTextMeshes(nameText, fontSize, 0, 0, topDepth, topZBottom, topMat, 'top', mainGroup);
        }
    } else if (currentPetShape === 'fish') {
        rimPaths.push(...diffClipperPaths(fullBasePaths, bodyInnerPaths));
        if (nameText) {
            addFrontTextMeshes(nameText, fontSize, shapeData.bodyCx * 0.5, 0, topDepth, topZBottom, topMat, 'top', mainGroup);
        }
    } else if (currentPetShape === 'circle') {
        const ringOuter = offsetClipperPaths(bodyOuterPaths, -1.2);
        const ringInner = offsetClipperPaths(bodyOuterPaths, -(1.2 + rimWidth));
        rimPaths.push(...diffClipperPaths(ringOuter, ringInner));
        rimPaths.push(makeBoxPath(0, -tagW * 0.095, tagW * 0.58, 0.7));

        if (nameText) {
            addFrontTextMeshes(nameText, fontSize, 0, tagW * 0.01, topDepth, topZBottom, topMat, 'top', mainGroup);
        }
        if (phoneText) {
            addFrontTextMeshes(phoneText, phoneSize, 0, -tagW * 0.175, topDepth, topZBottom, topMat, 'top', mainGroup);
        }

        if (isCircleNfcEnabled) {
            if (!customNfcPos) {
                customNfcPos = { x: -tagW * 0.14, y: -tagW * 0.31 };
            }
            const nfcWaves = makeNfcWavesPaths(0, 0, tagW * 0.13 * emojiScale);
            addDraggableEmojiMesh(customNfcPos, nfcWaves, topDepth, topZBottom, topMat, 'top', mainGroup);
            addFrontTextMeshes("NFC", phoneSize * 0.95, tagW * 0.07, -tagW * 0.31, topDepth, topZBottom, topMat, 'top', mainGroup);
        }
    }

    // วาดอีโมจิ (รอยเท้ากับหัวใจขยายตาม emojiScale ส่วนตาปลาคงขนาดตามสัดส่วนป้าย ไม่ขยายตามสไลเดอร์อีโมจิ)
    emojiItems.forEach(item => {
        let localPaths = [];
        if (item.type === 'paw') {
            const basePawSize = (currentPetShape === 'circle') ? tagW * 0.145 : tagW * 0.11;
            localPaths = makePawClipperPaths(0, 0, basePawSize * emojiScale, item.angle || 0);
        } else if (item.type === 'heart') {
            const baseHeartSize = tagW * 0.085;
            localPaths = makeHeartClipperPaths(0, 0, baseHeartSize * emojiScale);
        } else if (item.type === 'eye') {
            // ล็อกขนาดตาปลาตามความกว้างป้าย (tagW * 0.018) ไม่คูณ emojiScale
            localPaths = [makeCirclePath(0, 0, tagW * 0.018, 20)];
        }
        addDraggableEmojiMesh(item, localPaths, topDepth, topZBottom, topMat, 'top', mainGroup);
    });

    const unitedRimPaths = unionClipperPaths(rimPaths);
    const rimShapes = clipperPathsToShapes(unitedRimPaths);
    addExtrudedShapesToGroup(rimShapes, topDepth, topZBottom, topMat, 'top', mainGroup);

    if (currentPetShape === 'bone' || currentPetShape === 'fish') {
        const engraveDepth = 0.6;
        let backTextPaths = [];

        if (phoneText) {
            const lines = phoneText.split(/\s+|\/+/).filter(Boolean);
            const textCenterX = (currentPetShape === 'fish') ? shapeData.bodyCx * 0.5 : 0;

            if (lines.length >= 2) {
                const lineGap = phoneSize * 0.68;
                backTextPaths.push(...getBackEngraveClipperPaths(lines[0], phoneSize, textCenterX, lineGap));
                backTextPaths.push(...getBackEngraveClipperPaths(lines.slice(1).join(' '), phoneSize, textCenterX, -lineGap));
            } else {
                backTextPaths.push(...getBackEngraveClipperPaths(phoneText, phoneSize, textCenterX, 0));
            }
        }

        if (backTextPaths.length > 0) {
            const bottomEngravedPaths = diffClipperPaths(fullBasePaths, backTextPaths);
            const bottomShapes = clipperPathsToShapes(bottomEngravedPaths);
            addExtrudedShapesToGroup(bottomShapes, engraveDepth + 0.02, 0, baseMat, 'base', mainGroup);

            const upperBaseShapes = clipperPathsToShapes(fullBasePaths);
            addExtrudedShapesToGroup(upperBaseShapes, baseThick - engraveDepth, engraveDepth, baseMat, 'base', mainGroup);
        } else {
            const fullBaseShapes = clipperPathsToShapes(fullBasePaths);
            addExtrudedShapesToGroup(fullBaseShapes, baseThick, 0, baseMat, 'base', mainGroup);
        }

    } else if (currentPetShape === 'circle') {
        if (isCircleNfcEnabled) {
            const nfcDia = parseFloat(document.getElementById('nfcDiaSlider').value);
            const nfcThick = parseFloat(document.getElementById('nfcThickSlider').value);
            const wallThick = (baseThick - nfcThick) / 2;

            const nfcHolePath = [makeCirclePath(0, 0, nfcDia / 2, 64)];
            const midHollowPaths = diffClipperPaths(fullBasePaths, nfcHolePath);

            const fullBaseShapes = clipperPathsToShapes(fullBasePaths);
            const midHollowShapes = clipperPathsToShapes(midHollowPaths);

            addExtrudedShapesToGroup(fullBaseShapes, wallThick + 0.01, 0, baseMat, 'base', mainGroup);
            addExtrudedShapesToGroup(midHollowShapes, nfcThick, wallThick, baseMat, 'base', mainGroup);
            addExtrudedShapesToGroup(fullBaseShapes, wallThick + 0.01, wallThick + nfcThick - 0.01, baseMat, 'base', mainGroup);
        } else {
            const fullBaseShapes = clipperPathsToShapes(fullBasePaths);
            addExtrudedShapesToGroup(fullBaseShapes, baseThick, 0, baseMat, 'base', mainGroup);
        }
    }

    if (typeof THREE.DragControls !== 'undefined' && draggableObjects.length > 0) {
        dragControls = new THREE.DragControls(draggableObjects, camera, renderer.domElement);
        dragControls.addEventListener('dragstart', function (event) {
            controls.enabled = false;
            if (event.object.material && event.object.material.emissive) {
                event.object.material.emissive.setHex(0x444444);
            }
        });
        dragControls.addEventListener('drag', function (event) {
            event.object.position.z = 0;
            if (event.object.userData.emojiRef) {
                event.object.userData.emojiRef.x = event.object.position.x;
                event.object.userData.emojiRef.y = event.object.position.y;
            }
        });
        dragControls.addEventListener('dragend', function (event) {
            controls.enabled = true;
            if (event.object.material && event.object.material.emissive) {
                event.object.material.emissive.setHex(0x000000);
            }
        });
    }
}

// ==========================================
// 9. ส่งออกไฟล์ STL และ 3MF (แยกสีสำหรับ Bambu Studio)
// ==========================================
function exportSTL() {
    const exporter = new THREE.STLExporter();
    const stlString = exporter.parse(mainGroup);
    const blob = new Blob([stlString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.download = 'PetTag_' + (document.getElementById('nameInput').value || 'Pet') + '.stl';
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
        if (vertexMap.has(key)) return vertexMap.get(key);
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
                    if (v1 !== v2 && v2 !== v3 && v1 !== v3) triangles.push({ v1, v2, v3 });
                }
            } else {
                for (let i = 0; i < pos.count; i += 3) {
                    let v1 = getVertexIndex(pos.getX(i), pos.getY(i), pos.getZ(i));
                    let v2 = getVertexIndex(pos.getX(i+1), pos.getY(i+1), pos.getZ(i+1));
                    let v3 = getVertexIndex(pos.getX(i+2), pos.getY(i+2), pos.getZ(i+2));
                    if (v1 !== v2 && v2 !== v3 && v1 !== v3) triangles.push({ v1, v2, v3 });
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

    const nameText = 'PetTag_' + (document.getElementById('nameInput').value || "Pet");
    const rawBaseColor = document.getElementById('baseColorInput').value;
    const rawTopColor = document.getElementById('topColorInput').value;
    
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
        objectsXML += buildObjectXML(3, "Top_Details", topData, 1, 1);
        componentsXML += `<component objectid="3" />`;
        bambuPartsConfig += `
    <part id="3" subtype="normal_part">
      <metadata key="name" value="Top_Details"/>
      <metadata key="extruder" value="2"/>
    </part>`;
    }

    const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
    <metadata name="Application">S.S. Crafting 3D Studio</metadata>
    <resources>
        <m:basematerials id="1">
            <m:base name="Base_Color" displaycolor="${baseColor3MF}" />
            <m:base name="Top_Color" displaycolor="${topColor3MF}" />
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

window.addEventListener("DOMContentLoaded", () => {
    initUI();
    resetDefaultEmojis();
});