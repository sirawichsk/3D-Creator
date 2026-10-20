// ==========================================
// 3D Luggage Tag Generator (script_luggage.js)
// - ฟอนต์ตั้งต้น Mitr SemiBold (Mitr-SemiBold.ttf)
// - ปรับระยะห่างบรรทัดได้ทั้งแบบทีเดียวทุกบรรทัด และแยกทีละบรรทัด
// - ปรับความสั้นยาวเส้นคั่นป้ายคลาสสิก + ค่าเริ่มต้นใต้เส้น THAILAND
// - ปรับแสงเงาและขอบลอนกระเป๋า (Bevel + Depth Shading) ให้เห็นลายกระเป๋าชัดเจนไม่จ้า
// ==========================================

let scene, camera, renderer, controls, mainGroup;
let loadedFont = null;
let currentFontFile = "Mitr-SemiBold.ttf"; // ตั้งค่าเริ่มต้นเป็น Mitr SemiBold
let fontConfig = [];

let currentLuggageStyle = 1; // 1 = QR Tag, 2 = Suitcase 2-Piece, 3 = Classic Tag
let hasDividerLine = true;
let gapMode = "all"; // 'all' = ปรับพร้อมกันทุกบรรทัด, 'individual' = ปรับแยกทีละบรรทัด
let masterLineGap = 3.5;

let lineItems = [
    { text: "YOUR NAME", size: 7.0, align: "center", gapAfter: 3.5 },
    { text: "Address / Flight", size: 4.8, align: "center", gapAfter: 3.5 },
    { text: "+66 81 234 5678", size: 4.8, align: "center", gapAfter: 3.5 },
    { text: "BKK - THAILAND", size: 4.5, align: "center", gapAfter: 3.5 }
];
let activeLineCount = 3;

window.defaultFilamentColors = [
    { name: "เหลือง", hex: "#f5c400", active: true },
    { name: "ดำ", hex: "#1a1a1a", active: true },
    { name: "ขาว", hex: "#ffffff", active: true },
    { name: "แดง", hex: "#e62e2e", active: true },
    { name: "เขียว", hex: "#00ba7c", active: true },
    { name: "ฟ้ามิ้นต์", hex: "#4dd0e1", active: true },
    { name: "น้ำเงิน", hex: "#1e66d0", active: true },
    { name: "ชมพู", hex: "#ff77a9", active: true },
    { name: "ส้ม", hex: "#ff7b00", active: true },
    { name: "ทอง/น้ำตาล", hex: "#c99e52", active: true }
];

function getFontFolderPath() {
    return window.FONT_FOLDER_PATH || "font/";
}

function init3D() {
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

    // บังคับใช้ Mitr-SemiBold.ttf เป็นฟอนต์ตั้งต้นเสมอ
    const mitrFound = fontConfig.find(function(f) { return f.file === "Mitr-SemiBold.ttf"; });
    currentFontFile = mitrFound ? mitrFound.file : fontConfig[0].file;

    const container = document.getElementById("viewer");
    scene = new THREE.Scene();

    const w = Math.max(100, container.clientWidth);
    const h = Math.max(100, container.clientHeight);

    camera = new THREE.PerspectiveCamera(45, w / h, 1, 2000);
    camera.position.set(0, -80, 140);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 💡 ปรับการจัดแสงใหม่ (Raking Studio Lighting) ลดแสงสะท้อนหน้าตรง เพื่อให้เห็นร่องและลอนกระเป๋าชัดเจน
    scene.add(new THREE.AmbientLight(0xffffff, 0.42));

    // ไฟหลักส่องเฉียงจากด้านบนซ้าย เพื่อให้เกิดเงาใต้ลอนกระเป๋าชัดเจน
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(-70, 95, 95);
    scene.add(keyLight);

    // ไฟเสริมด้านขวาล่างแบบนุ่มนวล ไม่ให้สว่างจ้ากลืนพื้นผิว
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.32);
    fillLight.position.set(80, -85, 55);
    scene.add(fillLight);

    const grid = new THREE.GridHelper(240, 24, 0x444444, 0x252525);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);

    mainGroup = new THREE.Group();
    scene.add(mainGroup);

    function handleViewerResize() {
        if (!container || !renderer || !camera) return;
        const cw = Math.max(50, container.clientWidth);
        const ch = Math.max(50, container.clientHeight);
        camera.aspect = cw / ch;
        camera.updateProjectionMatrix();
        renderer.setSize(cw, ch, false);
    }

    window.addEventListener("resize", handleViewerResize);
    if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(handleViewerResize).observe(container);
    }

    initCustomFontsCSS();
    renderFontSelector();
    renderColorSwatches();
    renderLineControls();
    loadFontFile(currentFontFile);
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function loadFontFile(fileName) {
    const url = getFontFolderPath() + encodeURI(fileName);
    opentype.load(url, function(err, font) {
        if (!err && font) {
            loadedFont = font;
            processModelUpdate();
        } else {
            console.error("❌ ไม่สามารถโหลดไฟล์ฟอนต์ได้: " + url, err);
            alert("ไม่พบไฟล์ฟอนต์: " + url);
        }
    });
}

function initCustomFontsCSS() {
    const folder = getFontFolderPath();
    const styleEl = document.createElement("style");
    let css = "";
    fontConfig.forEach(function(f) {
        css += "@font-face { font-family: '" + f.family + "'; src: url('" + folder + encodeURI(f.file) + "'); }\n";
    });
    styleEl.innerHTML = css;
    document.head.appendChild(styleEl);
}

function renderFontSelector() {
    const grid = document.getElementById("fontGrid");
    if (!grid) return;
    grid.innerHTML = "";
    const sampleText = (lineItems[0] && lineItems[0].text.trim()) ? lineItems[0].text.trim() : "Luggage";

    fontConfig.forEach(function(f) {
        const card = document.createElement("div");
        card.className = "font-card" + (f.file === currentFontFile ? " active" : "");
        card.innerHTML = '<div class="preview-text" style="font-family:\'' + f.family + '\', sans-serif;">' + sampleText + '</div>' +
                         '<div class="font-name">' + f.name + '</div>';
        card.onclick = function() {
            currentFontFile = f.file;
            renderFontSelector();
            loadFontFile(f.file);
        };
        grid.appendChild(card);
    });
}

function updatePreviewText() {
    const sampleText = (lineItems[0] && lineItems[0].text.trim()) ? lineItems[0].text.trim() : "Luggage";
    document.querySelectorAll("#fontGrid .preview-text").forEach(function(el) {
        el.innerText = sampleText;
    });
}

// ==========================================
// ระบบคลิกปุ่มสีก่อนค่อยกางตัวเลือกสีจากสต๊อก
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
            triggerUpdate();
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
            triggerUpdate();
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
// ควบคุมบรรทัดข้อความ & ระยะห่างระหว่างบรรทัด (ปรับพร้อมกัน หรือ แยกทีละบรรทัด)
// ==========================================
function setGapMode(mode) {
    gapMode = mode;
    document.getElementById("btnGapAll").classList.toggle("active", mode === "all");
    document.getElementById("btnGapIndiv").classList.toggle("active", mode === "individual");
    document.getElementById("masterGapBlock").style.display = mode === "all" ? "block" : "none";
    renderLineControls();
    triggerUpdate();
}

function updateMasterGap(val) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    masterLineGap = num;
    const vInput = document.getElementById("masterGapVal");
    const sInput = document.getElementById("masterGapSlider");
    if (vInput && document.activeElement !== vInput) vInput.value = num;
    if (sInput && document.activeElement !== sInput) sInput.value = num;

    lineItems.forEach(function(item) {
        item.gapAfter = num;
    });

    // อัปเดตระยะห่างข้อความใต้เส้นคั่นให้ขยับตามไปด้วยเมื่อปรับพร้อมกัน
    const botGapV = document.getElementById("botGapVal");
    const botGapS = document.getElementById("bottomLineGapSlider");
    if (botGapV) botGapV.value = num;
    if (botGapS) botGapS.value = num;

    triggerUpdate();
}

function updateIndividualLineGap(idx, val) {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    lineItems[idx].gapAfter = num;
    const vInput = document.getElementById("lineGapVal_" + idx);
    const sInput = document.getElementById("lineGapSlider_" + idx);
    if (vInput && document.activeElement !== vInput) vInput.value = num;
    if (sInput && document.activeElement !== sInput) sInput.value = num;
    triggerUpdate();
}

function renderLineControls() {
    const container = document.getElementById("linesConfigContainer");
    if (!container) return;
    container.innerHTML = "";

    for (let i = 0; i < activeLineCount; i++) {
        const item = lineItems[i];
        if (item.gapAfter === undefined) item.gapAfter = masterLineGap;
        const card = document.createElement("div");
        card.className = "line-item-card";

        let indivGapHtml = "";
        if (gapMode === "individual") {
            indivGapHtml = [
                '<div class="slider-group" style="margin-top:8px; margin-bottom:0; padding-top:6px; border-top:1px dashed #333;">',
                '    <div class="slider-header">',
                '        <span style="color:#00ba7c;">ระยะห่างหลังบรรทัดที่ ' + (i + 1) + ' (mm)</span>',
                '        <input type="number" id="lineGapVal_' + i + '" class="slider-value-input" value="' + item.gapAfter + '" step="0.5" onchange="updateIndividualLineGap(' + i + ', this.value)">',
                '    </div>',
                '    <input type="range" id="lineGapSlider_' + i + '" min="0.5" max="14.0" step="0.5" value="' + item.gapAfter + '" oninput="updateIndividualLineGap(' + i + ', this.value)">',
                '</div>'
            ].join("");
        }

        card.innerHTML = [
            '<div class="line-item-header">',
            '    <span style="font-size:12px; color:#c9a77e; font-weight:bold;">บรรทัดที่ ' + (i + 1) + '</span>',
            '    <div class="align-btn-group">',
            '        <button type="button" class="align-mini-btn ' + (item.align === "left" ? "active" : "") + '" onclick="updateLineAlign(' + i + ', \'left\')">ชิดซ้าย</button>',
            '        <button type="button" class="align-mini-btn ' + (item.align === "center" ? "active" : "") + '" onclick="updateLineAlign(' + i + ', \'center\')">กลาง</button>',
            '        <button type="button" class="align-mini-btn ' + (item.align === "right" ? "active" : "") + '" onclick="updateLineAlign(' + i + ', \'right\')">ชิดขวา</button>',
            '    </div>',
            '</div>',
            '<input type="text" value="' + item.text.replace(/"/g, '&quot;') + '" style="margin-bottom:8px;" placeholder="พิมพ์ข้อความบรรทัดที่ ' + (i + 1) + '" oninput="updateLineText(' + i + ', this.value)">',
            '<div class="slider-group" style="margin-bottom:0;">',
            '    <div class="slider-header">',
            '        <span>ขนาดตัวอักษร (mm)</span>',
            '        <input type="number" id="lineSizeVal_' + i + '" class="slider-value-input" value="' + item.size + '" step="0.2" onchange="updateLineSize(' + i + ', this.value)">',
            '    </div>',
            '    <input type="range" id="lineSizeSlider_' + i + '" min="3.2" max="15.0" step="0.2" value="' + item.size + '" oninput="updateLineSize(' + i + ', this.value)">',
            '</div>',
            indivGapHtml
        ].join("");
        container.appendChild(card);
    }
    syncMainNameInput();
}

function syncMainNameInput() {
    const nameEl = document.getElementById("nameInput");
    if (nameEl) nameEl.value = (lineItems[0] && lineItems[0].text) ? lineItems[0].text : "Luggage Tag";
    updatePreviewText();
    if (typeof updateOrderButtonPrice === "function") updateOrderButtonPrice();
}

function changeLineCount(val) {
    activeLineCount = parseInt(val, 10) || 3;
    renderLineControls();
    triggerUpdate();
}

function updateLineText(idx, val) {
    lineItems[idx].text = val;
    syncMainNameInput();
    triggerUpdate();
}

function updateLineSize(idx, val) {
    const num = parseFloat(val) || 4.8;
    lineItems[idx].size = num;
    const vInput = document.getElementById("lineSizeVal_" + idx);
    const sInput = document.getElementById("lineSizeSlider_" + idx);
    if (vInput && document.activeElement !== vInput) vInput.value = num;
    if (sInput && document.activeElement !== sInput) sInput.value = num;
    triggerUpdate();
}

function updateLineAlign(idx, alignVal) {
    lineItems[idx].align = alignVal;
    renderLineControls();
    triggerUpdate();
}

function updateSlidersFromRange() {
    const pairs = [
        ["qrSizeVal", "qrSizeSlider"],
        ["topFilletVal", "topFilletSlider"],
        ["ribRadiusVal", "ribRadiusSlider"],
        ["borderThicknessVal", "borderThicknessSlider"],
        ["dividerThicknessVal", "dividerThicknessSlider"],
        ["dividerLengthVal", "dividerLengthSlider"],
        ["botSizeVal", "bottomLineSizeSlider"],
        ["botGapVal", "bottomLineGapSlider"]
    ];
    pairs.forEach(function(p) {
        const vEl = document.getElementById(p[0]);
        const sEl = document.getElementById(p[1]);
        if (vEl && sEl) vEl.value = sEl.value;
    });
    triggerUpdate();
}

function updateSlidersFromInput(valId, sliderId) {
    const vEl = document.getElementById(valId);
    const sEl = document.getElementById(sliderId);
    if (vEl && sEl) {
        sEl.value = vEl.value;
        triggerUpdate();
    }
}

function handleInputEnter(e, valId, sliderId) {
    if (e.key === "Enter") updateSlidersFromInput(valId, sliderId);
}

function selectLuggageStyle(styleNum) {
    currentLuggageStyle = styleNum;
    document.getElementById("tabStyle1").classList.toggle("active", styleNum === 1);
    document.getElementById("tabStyle2").classList.toggle("active", styleNum === 2);
    document.getElementById("tabStyle3").classList.toggle("active", styleNum === 3);

    document.getElementById("style1OptionsBlock").style.display = styleNum === 1 ? "block" : "none";
    document.getElementById("style2OptionsBlock").style.display = styleNum === 2 ? "block" : "none";
    document.getElementById("style3OptionsBlock").style.display = styleNum === 3 ? "block" : "none";

    triggerUpdate();
}

function setDividerMode(enabled) {
    hasDividerLine = enabled;
    document.getElementById("btnDividerOn").classList.toggle("active", enabled);
    document.getElementById("btnDividerOff").classList.toggle("active", !enabled);
    document.getElementById("underDividerWrapper").style.display = enabled ? "block" : "none";
    triggerUpdate();
}

let updateTimer = null;
function triggerUpdate() {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(processModelUpdate, 50);
}

// ==========================================
// แปลงฟอนต์เป็น Shape 3D ด้วย ClipperLib
// ==========================================
function opentypePathToThreeShapes(otPath) {
    const scale = 1000;
    const polys = [];
    let curr = [];
    let cx = 0, cy = 0;

    function addPt(x, y) {
        curr.push({ X: Math.round(x * scale), Y: Math.round(y * scale) });
        cx = x; cy = y;
    }

    otPath.commands.forEach(function(cmd) {
        if (cmd.type === "M") {
            if (curr.length >= 3) polys.push(curr);
            curr = [];
            addPt(cmd.x, -cmd.y);
        } else if (cmd.type === "L") {
            addPt(cmd.x, -cmd.y);
        } else if (cmd.type === "Q") {
            const x0 = cx, y0 = cy, x1 = cmd.x1, y1 = -cmd.y1, x2 = cmd.x, y2 = -cmd.y;
            for (let i = 1; i <= 10; i++) {
                const t = i / 10, mt = 1 - t;
                addPt(mt * mt * x0 + 2 * mt * t * x1 + t * t * x2, mt * mt * y0 + 2 * mt * t * y1 + t * t * y2);
            }
        } else if (cmd.type === "C") {
            const x0 = cx, y0 = cy, x1 = cmd.x1, y1 = -cmd.y1, x2 = cmd.x2, y2 = -cmd.y2, x3 = cmd.x, y3 = -cmd.y;
            for (let i = 1; i <= 12; i++) {
                const t = i / 12, mt = 1 - t;
                addPt(
                    mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3,
                    mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3
                );
            }
        } else if (cmd.type === "Z") {
            if (curr.length >= 3) polys.push(curr);
            curr = [];
        }
    });
    if (curr.length >= 3) polys.push(curr);
    if (polys.length === 0) return [];

    if (typeof ClipperLib !== "undefined") {
        const cpr = new ClipperLib.Clipper();
        cpr.AddPaths(polys, ClipperLib.PolyType.ptSubject, true);
        const polyTree = new ClipperLib.PolyTree();
        cpr.Execute(ClipperLib.ClipType.ctUnion, polyTree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
        return clipperPolyTreeToThreeShapes(polyTree, scale);
    }
    return [];
}

function clipperPolyTreeToThreeShapes(polyTree, scale) {
    const shapes = [];
    function walk(node) {
        if (!node.IsHole() && node.Contour().length >= 3) {
            const s = new THREE.Shape();
            const c = node.Contour();
            s.moveTo(c[0].X / scale, c[0].Y / scale);
            for (let i = 1; i < c.length; i++) s.lineTo(c[i].X / scale, c[i].Y / scale);
            s.closePath();

            const children = node.Childs();
            for (let j = 0; j < children.length; j++) {
                const hNode = children[j];
                const hc = hNode.Contour();
                if (hc.length >= 3) {
                    const hp = new THREE.Path();
                    hp.moveTo(hc[0].X / scale, hc[0].Y / scale);
                    for (let k = 1; k < hc.length; k++) hp.lineTo(hc[k].X / scale, hc[k].Y / scale);
                    hp.closePath();
                    s.holes.push(hp);
                }
                const gChildren = hNode.Childs();
                for (let g = 0; g < gChildren.length; g++) walk(gChildren[g]);
            }
            shapes.push(s);
        } else {
            const children = node.Childs();
            for (let i = 0; i < children.length; i++) walk(children[i]);
        }
    }
    walk(polyTree);
    return shapes;
}

function createPositionedTextGeometry(text, fontSize, depth, align, centerX, centerY, zBottom, maxAreaWidth) {
    if (!loadedFont || !text || !text.trim()) return null;
    try {
        const fontPath = loadedFont.getPath(text.trim(), 0, 0, fontSize);
        const shapes = opentypePathToThreeShapes(fontPath);
        if (!shapes || shapes.length === 0) return null;

        const geo = new THREE.ExtrudeGeometry(shapes, { depth: depth, bevelEnabled: false });
        geo.computeBoundingBox();
        const bb = geo.boundingBox;
        const textW = bb.max.x - bb.min.x;
        const textH = bb.max.y - bb.min.y;

        let shiftX = centerX - (bb.min.x + textW / 2);
        const halfArea = (maxAreaWidth / 2) - 3.5;
        if (align === "left") shiftX = centerX - halfArea - bb.min.x;
        else if (align === "right") shiftX = centerX + halfArea - bb.max.x;

        const shiftY = centerY - (bb.min.y + textH / 2);
        geo.translate(shiftX, shiftY, zBottom);
        
        return { geometry: geo, width: textW, height: textH };
    } catch (e) {
        console.error("Text Error:", e);
        return null;
    }
}

function measureTextWidth(text, fontSize) {
    if (!loadedFont || !text || !text.trim()) return 0;
    try {
        const shapes = opentypePathToThreeShapes(loadedFont.getPath(text.trim(), 0, 0, fontSize));
        if (shapes.length === 0) return 0;
        const tGeo = new THREE.ShapeGeometry(shapes);
        tGeo.computeBoundingBox();
        const w = tGeo.boundingBox.max.x - tGeo.boundingBox.min.x;
        tGeo.dispose();
        return w;
    } catch (e) {
        return 0;
    }
}

function createRoundedRectShape(w, h, r) {
    const maxR = Math.min(w / 2, h / 2, Math.max(0, r));
    const s = new THREE.Shape();
    const hw = w / 2, hh = h / 2;
    s.moveTo(-hw + maxR, -hh);
    s.lineTo(hw - maxR, -hh);
    if (maxR > 0) s.quadraticCurveTo(hw, -hh, hw, -hh + maxR);
    s.lineTo(hw, hh - maxR);
    if (maxR > 0) s.quadraticCurveTo(hw, hh, hw - maxR, hh);
    s.lineTo(-hw + maxR, hh);
    if (maxR > 0) s.quadraticCurveTo(-hw, hh, -hw, hh - maxR);
    s.lineTo(-hw, -hh + maxR);
    if (maxR > 0) s.quadraticCurveTo(-hw, -hh, -hw + maxR, -hh);
    return s;
}

function createChamferedTagShapeWithFillet(w, h, bottomR, topCut, topFillet) {
    const hw = w / 2, hh = h / 2;
    const r = Math.min(bottomR, hw, hh);
    const cut = Math.min(topCut, hw - 4, hh - 4);
    const f = Math.max(0, Math.min(topFillet, cut * 0.9));

    const s = new THREE.Shape();
    s.moveTo(-hw + r, -hh);
    s.lineTo(hw - r, -hh);
    s.quadraticCurveTo(hw, -hh, hw, -hh + r);

    s.lineTo(hw, hh - cut - f * 0.5);
    if (f > 0) {
        s.quadraticCurveTo(hw, hh - cut, hw - f * 0.35, hh - cut + f * 0.35);
        s.lineTo(hw - cut + f * 0.35, hh - f * 0.35);
        s.quadraticCurveTo(hw - cut, hh, hw - cut - f * 0.5, hh);
    } else {
        s.lineTo(hw, hh - cut);
        s.lineTo(hw - cut, hh);
    }

    if (f > 0) {
        s.lineTo(-hw + cut + f * 0.5, hh);
        s.quadraticCurveTo(-hw + cut, hh, -hw + cut - f * 0.35, hh - f * 0.35);
        s.lineTo(-hw + f * 0.35, hh - cut + f * 0.35);
        s.quadraticCurveTo(-hw, hh - cut, -hw, hh - cut - f * 0.5);
    } else {
        s.lineTo(-hw + cut, hh);
        s.lineTo(-hw, hh - cut);
    }

    s.lineTo(-hw, -hh + r);
    s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
    return s;
}

function createSlotHolePath(cx, cy, slotW, slotH) {
    const p = new THREE.Path();
    const r = Math.min(slotW, slotH) / 2;
    const hw = slotW / 2, hh = slotH / 2;
    p.moveTo(cx - hw + r, cy - hh);
    p.lineTo(cx + hw - r, cy - hh);
    p.quadraticCurveTo(cx + hw, cy - hh, cx + hw, cy - hh + r);
    p.lineTo(cx + hw, cy + hh - r);
    p.quadraticCurveTo(cx + hw, cy + hh, cx + hw - r, cy + hh);
    p.lineTo(cx - hw + r, cy + hh);
    p.quadraticCurveTo(cx - hw, cy + hh, cx - hw, cy + hh - r);
    p.lineTo(cx - hw, cy - hh + r);
    p.quadraticCurveTo(cx - hw, cy - hh, cx - hw + r, cy - hh);
    return p;
}

function createCircleHolePath(cx, cy, radius) {
    const p = new THREE.Path();
    p.absarc(cx, cy, radius, 0, Math.PI * 2, false);
    return p;
}

function getEffectiveGap(idx) {
    if (gapMode === "all") return masterLineGap;
    return (lineItems[idx] && lineItems[idx].gapAfter !== undefined) ? lineItems[idx].gapAfter : masterLineGap;
}

function processModelUpdate() {
    if (!mainGroup) return;
    while (mainGroup.children.length > 0) {
        const old = mainGroup.children[0];
        if (old.geometry) old.geometry.dispose();
        mainGroup.remove(old);
    }

    const baseColorHex = document.getElementById("baseColorInput").value || "#f5c400";
    const topColorHex = document.getElementById("topColorInput").value || "#1a1a1a";

    const matBase = new THREE.MeshStandardMaterial({ color: baseColorHex, roughness: 0.45, metalness: 0.05 });
    const matTop = new THREE.MeshStandardMaterial({ color: topColorHex, roughness: 0.4, metalness: 0.05 });

    if (currentLuggageStyle === 1) buildStyle1QRTag(matBase, matTop);
    else if (currentLuggageStyle === 2) buildStyle2SuitcaseTag(matBase, matTop, baseColorHex);
    else buildStyle3ClassicTag(matBase, matTop);
}

function tagMeshRole(mesh, role) {
    mesh.userData.colorRole = role;
    mainGroup.add(mesh);
}

// ------------------------------------------
// แบบที่ 1: ป้าย QR Code แนวตั้ง (รองรับปรับระยะห่างบรรทัด)
// ------------------------------------------
function buildStyle1QRTag(matBase, matTop) {
    const tagW = 50, tagH = 85, baseThick = 3.0, embossH = 1.0;
    const topFillet = parseFloat(document.getElementById("topFilletSlider").value) || 4.0;

    const tagShape = createChamferedTagShapeWithFillet(tagW, tagH, 4.5, 11, topFillet);
    tagShape.holes.push(createSlotHolePath(0, (tagH / 2) - 5.8, 14, 4.2));

    const baseGeo = new THREE.ExtrudeGeometry(tagShape, { depth: baseThick, bevelEnabled: false });
    tagMeshRole(new THREE.Mesh(baseGeo, matBase), "base");

    const qrSize = parseFloat(document.getElementById("qrSizeSlider").value) || 28;
    const qrCenterY = -(tagH / 2) + 6.5 + (qrSize / 2);

    const qrText = document.getElementById("qrTextInput").value.trim() || "https://sscrafting.com";
    try {
        const qr = qrcode(0, "M");
        qr.addData(qrText);
        qr.make();
        const count = qr.getModuleCount();
        const cellSize = qrSize / count;
        const startX = -(qrSize / 2);
        const startY = qrCenterY + (qrSize / 2);

        for (let r = 0; r < count; r++) {
            for (let c = 0; c < count; c++) {
                if (qr.isDark(r, c)) {
                    const cellGeo = new THREE.BoxGeometry(cellSize * 1.03, cellSize * 1.03, embossH);
                    cellGeo.translate(startX + (c + 0.5) * cellSize, startY - (r + 0.5) * cellSize, baseThick + embossH / 2);
                    tagMeshRole(new THREE.Mesh(cellGeo, matTop), "top");
                }
            }
        }
    } catch (e) {}

    // จัดวางบรรทัดข้อความเหนือ QR Code ตามระยะห่างที่ผู้ใช้กำหนด
    const textTopLimit = (tagH / 2) - 12;
    const textBottomLimit = qrCenterY + (qrSize / 2) + 3;
    const centerTextAreaY = (textTopLimit + textBottomLimit) / 2;

    const nonEmpty = [];
    for (let i = 0; i < activeLineCount; i++) {
        if (lineItems[i].text && lineItems[i].text.trim()) {
            nonEmpty.push({ item: lineItems[i], idx: i });
        }
    }

    let totalH = 0;
    nonEmpty.forEach(function(entry, k) {
        totalH += entry.item.size;
        if (k < nonEmpty.length - 1) totalH += getEffectiveGap(entry.idx);
    });

    let currentY = centerTextAreaY + (totalH / 2);
    nonEmpty.forEach(function(entry, k) {
        currentY -= entry.item.size / 2;
        const tObj = createPositionedTextGeometry(entry.item.text, entry.item.size, embossH, entry.item.align, 0, currentY, baseThick, tagW - 4);
        if (tObj) tagMeshRole(new THREE.Mesh(tObj.geometry, matTop), "top");
        currentY -= (entry.item.size / 2 + getEffectiveGap(entry.idx));
    });
}

// ------------------------------------------
// แบบที่ 2: กระเป๋า 2 แผ่น 
// - ท้องกระเป๋ายกลอยขึ้นจากล้อ (เห็นล้อยื่นออกมาด้านล่างสมจริง)
// - ฐานล้อพิมพ์สีเดียวกับตัวกระเป๋าก่อน แล้วทับสีดำเฉพาะ 3 เลเยอร์สุดท้าย (0.6 มม.)
// ------------------------------------------
function createSuitcaseBodyWithWheelsShape(w, h, cornerR, wheelX, wheelY, wheelR, bottomClearance) {
    const hw = w / 2;
    const hh = h / 2;
    const r = Math.min(cornerR, hw, hh);
    const bodyBotY = -hh + bottomClearance; // ยกท้องกระเป๋าขึ้นจากจุดต่ำสุดของล้อ

    // 1. วาดรูปทรงตัวกระเป๋าที่ยกท้องกระเป๋าขึ้น
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-hw + r, bodyBotY);
    bodyShape.lineTo(hw - r, bodyBotY);
    bodyShape.quadraticCurveTo(hw, bodyBotY, hw, bodyBotY + r);
    bodyShape.lineTo(hw, hh - r);
    bodyShape.quadraticCurveTo(hw, hh, hw - r, hh);
    bodyShape.lineTo(-hw + r, hh);
    bodyShape.quadraticCurveTo(-hw, hh, -hw, hh - r);
    bodyShape.lineTo(-hw, bodyBotY + r);
    bodyShape.quadraticCurveTo(-hw, bodyBotY, -hw + r, bodyBotY);

    // 2. ใช้ ClipperLib รวมรูปทรงตัวกระเป๋า เข้ากับ ฐานล้อกลมทั้ง 2 ข้าง ให้เป็นเนื้อเดียวกัน
    const scale = 1000;
    if (typeof ClipperLib !== "undefined") {
        const subjPolys = [];
        const bodyPts = bodyShape.getPoints(32);
        subjPolys.push(bodyPts.map(function(p) {
            return { X: Math.round(p.x * scale), Y: Math.round(p.y * scale) };
        }));

        [-wheelX, wheelX].forEach(function(wx) {
            const wShape = new THREE.Shape();
            wShape.absarc(wx, wheelY, wheelR, 0, Math.PI * 2, false);
            const wPts = wShape.getPoints(36);
            subjPolys.push(wPts.map(function(p) {
                return { X: Math.round(p.x * scale), Y: Math.round(p.y * scale) };
            }));
        });

        const cpr = new ClipperLib.Clipper();
        cpr.AddPaths(subjPolys, ClipperLib.PolyType.ptSubject, true);
        const polyTree = new ClipperLib.PolyTree();
        cpr.Execute(ClipperLib.ClipType.ctUnion, polyTree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);

        const mergedShapes = clipperPolyTreeToThreeShapes(polyTree, scale);
        if (mergedShapes.length > 0) {
            return mergedShapes[0];
        }
    }

    return bodyShape;
}

// ------------------------------------------
// แบบที่ 2: กระเป๋า 2 แผ่น (ซิงค์เลเยอร์สีดำของล้อ ให้เริ่มที่ระดับเดียวกับลอนกระเป๋าและข้อความ Z = 1.8 มม.)
// ------------------------------------------
function buildStyle2SuitcaseTag(matBase, matTop, baseColorHex) {
    const tagW = 54, tagH = 85;
    const cornerR = 4.5;
    const wheelR = 6.0;
    const holeR = 2.5;
    const bottomClearance = 2.6;

    const wheelX = (tagW / 2) - wheelR;
    const wheelY = -(tagH / 2) + wheelR;
    const slotY = (tagH / 2) - 5.5;

    const topPlateOffsetX = -32;
    const botPlateOffsetX = 32;

    // ซิงค์ความสูงเลเยอร์ของทั้ง 2 แผ่นให้ตรงกันเป๊ะ (ประหยัดการสลับสี AMS)
    const baseBodyThick = 1.8;        // Z = 0.0 - 1.8 มม.: พิมพ์ฐานสีเหลืองล้วนทั้ง 2 แผ่น
    const ribAndInlayDepth = 0.6;     // Z = 1.8 - 2.4 มม.: ขึ้นลอนกระเป๋า (เหลือง) + เริ่มพิมพ์ล้อ/ช่องสาย (ดำ) + ฝังข้อความแผ่นขวา (ดำ)
    const topWheelExtraHeight = 0.4;  // Z = 2.4 - 2.8 มม.: ล้อและกรอบช่องสายสีดำนูนสูงพ้นลอนกระเป๋าขึ้นมาอีก 2 เลเยอร์ (0.4 มม.)
    const totalWheelBlackThick = ribAndInlayDepth + topWheelExtraHeight; // รวมความหนาสีดำ = 1.0 มม. (ตั้งแต่ 1.8 ถึง 2.8 มม.)

    const recessedShadeColor = new THREE.Color(baseColorHex).multiplyScalar(0.91);
    const matCoverRecessed = new THREE.MeshStandardMaterial({ color: recessedShadeColor, roughness: 0.55, metalness: 0.05 });
    const matRibRaised = new THREE.MeshStandardMaterial({ color: baseColorHex, roughness: 0.32, metalness: 0.08 });

    // รูปทรงกระเป๋าหลักพร้อมซุ้มล้อ
    const coverShape = createSuitcaseBodyWithWheelsShape(tagW, tagH, cornerR, wheelX, wheelY, wheelR, bottomClearance);
    coverShape.holes.push(createCircleHolePath(-wheelX, wheelY, holeR));
    coverShape.holes.push(createCircleHolePath(wheelX, wheelY, holeR));
    coverShape.holes.push(createSlotHolePath(0, slotY, 16, 4.2));

    // ==========================================
    // แผ่นซ้าย: ฝาหน้ากระเป๋าเดินทาง
    // ==========================================
    // 1. แผ่นฐานตัวกระเป๋า (Z = 0.0 ถึง 1.8 มม.) สีที่ 1
    const coverBaseGeo = new THREE.ExtrudeGeometry(coverShape, { depth: baseBodyThick, bevelEnabled: false });
    coverBaseGeo.translate(topPlateOffsetX, 0, 0);
    tagMeshRole(new THREE.Mesh(coverBaseGeo, matCoverRecessed), "base");

    // 2. ลอนกระเป๋าเดินทาง (เริ่มที่ Z = 1.8 ถึง 2.4 มม.) ฝังฐานจมลงไปในเนื้อกระเป๋า 0.2 มม. ให้เชื่อมสนิท
    const ribRadius = parseFloat(document.getElementById("ribRadiusSlider").value) || 1.5;
    const ribW = tagW - 6;
    const ribH = 3.2;
    for (let ry = -21; ry <= 27; ry += 8) {
        const rShape = createRoundedRectShape(ribW, ribH, Math.min(ribRadius, ribH / 2));
        const rGeo = new THREE.ExtrudeGeometry(rShape, {
            depth: ribAndInlayDepth + 0.2,
            bevelEnabled: false
        });
        rGeo.translate(topPlateOffsetX, ry, baseBodyThick - 0.2);
        tagMeshRole(new THREE.Mesh(rGeo, matRibRaised), "base");
    }

    // 3. ล้อสีดำและกรอบช่องสอดสายสีดำ: เริ่มพิมพ์สีดำตั้งแต่เลเยอร์เดียวกับลอนกระเป๋า (Z = 1.8 มม.) ยาวไปจนถึง 2.8 มม.
    [-wheelX, wheelX].forEach(function(wx) {
        const wTopShape = new THREE.Shape();
        wTopShape.absarc(wx, wheelY, wheelR, 0, Math.PI * 2, false);
        wTopShape.holes.push(createCircleHolePath(wx, wheelY, holeR));
        const wTopGeo = new THREE.ExtrudeGeometry(wTopShape, { depth: totalWheelBlackThick, bevelEnabled: false });
        wTopGeo.translate(topPlateOffsetX, 0, baseBodyThick);
        tagMeshRole(new THREE.Mesh(wTopGeo, matTop), "top");
    });

    const collarShape = new THREE.Shape();
    const cw = 10.5, ch = 4.1;
    collarShape.moveTo(-cw, slotY - ch);
    collarShape.lineTo(cw, slotY - ch);
    collarShape.lineTo(cw, slotY + ch);
    collarShape.lineTo(-cw, slotY + ch);
    collarShape.closePath();
    collarShape.holes.push(createSlotHolePath(0, slotY, 16, 4.2));

    const cTopGeo = new THREE.ExtrudeGeometry(collarShape, { depth: totalWheelBlackThick, bevelEnabled: false });
    cTopGeo.translate(topPlateOffsetX, 0, baseBodyThick);
    tagMeshRole(new THREE.Mesh(cTopGeo, matTop), "top");

    // ==========================================
    // แผ่นขวา: แผ่นข้อมูล (ฐานล่าง 0.0 - 1.8 มม. + ชั้นฝังตัวอักษร 1.8 - 2.4 มม. ตรงกับเลเยอร์ล้อสีดำเป๊ะ)
    // ==========================================
    // 1) ชั้นฐานล่างทึบ (Z = 0.0 ถึง 1.8 มม.)
    const botLowerGeo = new THREE.ExtrudeGeometry(coverShape, { depth: baseBodyThick, bevelEnabled: false });
    botLowerGeo.translate(botPlateOffsetX, 0, 0);
    tagMeshRole(new THREE.Mesh(botLowerGeo, matBase), "base");

    // 2) คำนวณตำแหน่งตัวอักษรสีดำ (Z = 1.8 ถึง 2.4 มม.) และเก็บ Polygon เพื่อเจาะร่อง
    const nonEmpty = [];
    for (let i = 0; i < activeLineCount; i++) {
        if (lineItems[i].text && lineItems[i].text.trim()) {
            nonEmpty.push({ item: lineItems[i], idx: i });
        }
    }

    let totalH = 0;
    nonEmpty.forEach(function(entry, k) {
        totalH += entry.item.size;
        if (k < nonEmpty.length - 1) totalH += getEffectiveGap(entry.idx);
    });

    const clipScale = 1000;
    const allTextPolysForCarving = [];
    let currentY = 3 + (totalH / 2);

    nonEmpty.forEach(function(entry) {
        currentY -= entry.item.size / 2;
        const cleanStr = entry.item.text.trim();
        const fontPath = loadedFont.getPath(cleanStr, 0, 0, entry.item.size);
        const shapes = opentypePathToThreeShapes(fontPath);

        if (shapes && shapes.length > 0) {
            const tempGeo = new THREE.ExtrudeGeometry(shapes, { depth: ribAndInlayDepth, bevelEnabled: false });
            tempGeo.computeBoundingBox();
            const bb = tempGeo.boundingBox;
            const textW = bb.max.x - bb.min.x;
            const textH = bb.max.y - bb.min.y;

            const maxAreaWidth = tagW - 8;
            const halfArea = (maxAreaWidth / 2) - 3.5;
            let localShiftX = -(bb.min.x + textW / 2);
            if (entry.item.align === "left") localShiftX = -halfArea - bb.min.x;
            else if (entry.item.align === "right") localShiftX = halfArea - bb.max.x;

            const localShiftY = currentY - (bb.min.y + textH / 2);

            // วางเนื้อตัวอักษรสีดำลงในร่อง (Z = 1.8 ถึง 2.4 มม.)
            tempGeo.translate(botPlateOffsetX + localShiftX, localShiftY, baseBodyThick);
            tagMeshRole(new THREE.Mesh(tempGeo, matTop), "top");

            shapes.forEach(function(sh) {
                const pts = sh.getPoints(18);
                allTextPolysForCarving.push(pts.map(function(p) {
                    return { X: Math.round((p.x + localShiftX) * clipScale), Y: Math.round((p.y + localShiftY) * clipScale) };
                }));
                if (sh.holes && sh.holes.length > 0) {
                    sh.holes.forEach(function(h) {
                        const hPts = h.getPoints(18);
                        allTextPolysForCarving.push(hPts.map(function(p) {
                            return { X: Math.round((p.x + localShiftX) * clipScale), Y: Math.round((p.y + localShiftY) * clipScale) };
                        }));
                    });
                }
            });
        }
        currentY -= (entry.item.size / 2 + getEffectiveGap(entry.idx));
    });

    // 3) เจาะร่องตัวอักษรออกจากแผ่นสีเหลืองชั้นบน (Z = 1.8 ถึง 2.4 มม.) พร้อมรักษารูล้อและรูสายรัดให้ทะลุ 100%
    if (typeof ClipperLib !== "undefined" && allTextPolysForCarving.length > 0) {
        const platePolys = [];
        const outerPts = coverShape.getPoints(36);
        const outerPoly = outerPts.map(function(p) { 
            return { X: Math.round(p.x * clipScale), Y: Math.round(p.y * clipScale) }; 
        });
        if (!ClipperLib.Clipper.Orientation(outerPoly)) {
            outerPoly.reverse();
        }
        platePolys.push(outerPoly);

        if (coverShape.holes) {
            coverShape.holes.forEach(function(h) {
                const hPts = h.getPoints(24);
                const holePoly = hPts.map(function(p) { 
                    return { X: Math.round(p.x * clipScale), Y: Math.round(p.y * clipScale) }; 
                });
                if (ClipperLib.Clipper.Orientation(holePoly)) {
                    holePoly.reverse();
                }
                platePolys.push(holePoly);
            });
        }

        const textUnion = new ClipperLib.Paths();
        const cprText = new ClipperLib.Clipper();
        cprText.AddPaths(allTextPolysForCarving, ClipperLib.PolyType.ptSubject, true);
        cprText.Execute(ClipperLib.ClipType.ctUnion, textUnion, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);

        const diffTree = new ClipperLib.PolyTree();
        const cprDiff = new ClipperLib.Clipper();
        cprDiff.AddPaths(platePolys, ClipperLib.PolyType.ptSubject, true);
        cprDiff.AddPaths(textUnion, ClipperLib.PolyType.ptClip, true);
        cprDiff.Execute(ClipperLib.ClipType.ctDifference, diffTree, ClipperLib.PolyFillType.pftEvenOdd, ClipperLib.PolyFillType.pftNonZero);

        const carvedTopShapes = clipperPolyTreeToThreeShapes(diffTree, clipScale);
        if (carvedTopShapes.length > 0) {
            const botUpperGeo = new THREE.ExtrudeGeometry(carvedTopShapes, { depth: ribAndInlayDepth, bevelEnabled: false });
            botUpperGeo.translate(botPlateOffsetX, 0, baseBodyThick);
            tagMeshRole(new THREE.Mesh(botUpperGeo, matBase), "base");
        }
    } else {
        const botUpperGeo = new THREE.ExtrudeGeometry(coverShape, { depth: ribAndInlayDepth, bevelEnabled: false });
        botUpperGeo.translate(botPlateOffsetX, 0, baseBodyThick);
        tagMeshRole(new THREE.Mesh(botUpperGeo, matBase), "base");
    }
}

function buildStyle3ClassicTag(matBase, matTop) {
    const baseThick = 3.0, embossH = 1.0;
    const borderThick = parseFloat(document.getElementById("borderThicknessSlider").value) || 0;
    const dividerThick = parseFloat(document.getElementById("dividerThicknessSlider").value) || 1.2;
    const dividerLenPercent = parseFloat(document.getElementById("dividerLengthSlider").value) || 85;
    
    // ดึงค่าระยะห่างของข้อความใต้เส้นคั่นจากสไลเดอร์
    const botGapSliderEl = document.getElementById("bottomLineGapSlider");
    const botGap = botGapSliderEl ? parseFloat(botGapSliderEl.value) : 3.8;

    let maxTextWidth = 0;
    const nonEmptyEntries = [];
    for (let i = 0; i < activeLineCount; i++) {
        const item = lineItems[i];
        if (item.text && item.text.trim()) {
            const w = measureTextWidth(item.text, item.size);
            if (w > maxTextWidth) maxTextWidth = w;
            nonEmptyEntries.push({ item: item, idx: i });
        }
    }

    let botText = "";
    let botSize = 5.0;
    if (hasDividerLine) {
        botText = document.getElementById("bottomSingleLineInput").value.trim();
        botSize = parseFloat(document.getElementById("bottomLineSizeSlider").value) || 5.0;
        if (botText) {
            const w = measureTextWidth(botText, botSize);
            if (w > maxTextWidth) maxTextWidth = w;
        }
    }

    const tagW = Math.max(85, Math.ceil(maxTextWidth + 28));
    const tagH = 50;
    const textCenterX = 4;
    const usableW = tagW - 22;

    const tagShape = createRoundedRectShape(tagW, tagH, 5);
    tagShape.holes.push(createSlotHolePath(-(tagW / 2) + 6.5, 0, 4.2, 16));

    const baseGeo = new THREE.ExtrudeGeometry(tagShape, { depth: baseThick, bevelEnabled: false });
    tagMeshRole(new THREE.Mesh(baseGeo, matBase), "base");

    if (borderThick > 0.1) {
        const outerMargin = 1.8;
        const rimOuter = createRoundedRectShape(tagW - outerMargin * 2, tagH - outerMargin * 2, 4);
        const rimInner = createRoundedRectShape(tagW - (outerMargin + borderThick) * 2, tagH - (outerMargin + borderThick) * 2, Math.max(1, 4 - borderThick));
        rimOuter.holes.push(rimInner);
        const rimGeo = new THREE.ExtrudeGeometry(rimOuter, { depth: embossH, bevelEnabled: false });
        rimGeo.translate(0, 0, baseThick);
        tagMeshRole(new THREE.Mesh(rimGeo, matTop), "top");
    }

    let totalH = 0;
    nonEmptyEntries.forEach(function(entry, k) {
        totalH += entry.item.size;
        if (k < nonEmptyEntries.length - 1) {
            totalH += getEffectiveGap(entry.idx);
        }
    });

    const lastUpperGap = nonEmptyEntries.length > 0 ? getEffectiveGap(nonEmptyEntries[nonEmptyEntries.length - 1].idx) : 3.5;

    if (hasDividerLine) {
        if (nonEmptyEntries.length > 0) totalH += lastUpperGap;
        totalH += dividerThick;
        if (botText) totalH += botGap + botSize;
    }

    let currentY = totalH / 2;

    nonEmptyEntries.forEach(function(entry, k) {
        currentY -= entry.item.size / 2;
        const tObj = createPositionedTextGeometry(entry.item.text, entry.item.size, embossH, entry.item.align, textCenterX, currentY, baseThick, usableW);
        if (tObj) tagMeshRole(new THREE.Mesh(tObj.geometry, matTop), "top");
        const gapToNext = (k < nonEmptyEntries.length - 1) ? getEffectiveGap(entry.idx) : lastUpperGap;
        currentY -= (entry.item.size / 2 + gapToNext);
    });

    if (hasDividerLine) {
        currentY -= dividerThick / 2;

        const actualDivLen = Math.max(8, usableW * (dividerLenPercent / 100));
        const divGeo = new THREE.BoxGeometry(actualDivLen, dividerThick, embossH);
        divGeo.translate(textCenterX, currentY, baseThick + embossH / 2);
        tagMeshRole(new THREE.Mesh(divGeo, matTop), "top");

        currentY -= (dividerThick / 2 + botGap);
        
        if (botText) {
            currentY -= botSize / 2;
            const bObj = createPositionedTextGeometry(botText, botSize, embossH, "center", textCenterX, currentY, baseThick, usableW);
            if (bObj) tagMeshRole(new THREE.Mesh(bObj.geometry, matTop), "top");
        }
    }
}

window.getLuggageCustomState = function() {
    return {
        style: currentLuggageStyle,
        hasDividerLine: hasDividerLine,
        gapMode: gapMode,
        masterLineGap: masterLineGap,
        activeLineCount: activeLineCount,
        lineItems: JSON.parse(JSON.stringify(lineItems))
    };
};

window.setLuggageCustomState = function(st) {
    if (!st) return;
    currentLuggageStyle = st.style || 1;
    hasDividerLine = st.hasDividerLine !== undefined ? st.hasDividerLine : true;
    gapMode = st.gapMode || "all";
    masterLineGap = st.masterLineGap !== undefined ? st.masterLineGap : 3.5;
    activeLineCount = st.activeLineCount || 3;
    if (Array.isArray(st.lineItems)) lineItems = st.lineItems;

    document.getElementById("lineCountSelect").value = String(activeLineCount);
    document.getElementById("masterGapVal").value = masterLineGap;
    document.getElementById("masterGapSlider").value = masterLineGap;
    setGapMode(gapMode);
    selectLuggageStyle(currentLuggageStyle);
    setDividerMode(hasDividerLine);
    renderLineControls();
    renderColorSwatches();
    renderFontSelector();
    processModelUpdate();
};

function exportSTL() {
    const exporter = new THREE.STLExporter();
    const stlString = exporter.parse(mainGroup);
    const blob = new Blob([stlString], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "LuggageTag_Style" + currentLuggageStyle + ".stl";
    link.click();
}

async function export3MF() {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>');
    zip.folder("_rels").file(".rels", '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>');

    // ฟังก์ชันเชื่อมจุด (Weld Vertices) เพื่อป้องกันปัญหา Non-Manifold Edges ใน Slicer
    function buildWeldedMeshXml(meshesArray) {
        const vertexMap = new Map();
        const uniqueVertices = [];
        const triangles = [];

        function getWeldedVertexIndex(x, y, z) {
            const kx = x.toFixed(3);
            const ky = y.toFixed(3);
            const kz = z.toFixed(3);
            const key = kx + "," + ky + "," + kz;
            let idx = vertexMap.get(key);
            if (idx === undefined) {
                idx = uniqueVertices.length;
                uniqueVertices.push('<vertex x="' + kx + '" y="' + ky + '" z="' + kz + '"/>');
                vertexMap.set(key, idx);
            }
            return idx;
        }

        meshesArray.forEach(function(mesh) {
            const geo = mesh.geometry.clone();
            mesh.updateMatrixWorld();
            geo.applyMatrix4(mesh.matrixWorld);
            const pos = geo.attributes.position;
            if (!pos) return;

            if (geo.index) {
                const idx = geo.index;
                for (let i = 0; i < idx.count; i += 3) {
                    const i1 = idx.getX(i), i2 = idx.getX(i + 1), i3 = idx.getX(i + 2);
                    const v1 = getWeldedVertexIndex(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
                    const v2 = getWeldedVertexIndex(pos.getX(i2), pos.getY(i2), pos.getZ(i2));
                    const v3 = getWeldedVertexIndex(pos.getX(i3), pos.getY(i3), pos.getZ(i3));
                    if (v1 !== v2 && v2 !== v3 && v1 !== v3) {
                        triangles.push('<triangle v1="' + v1 + '" v2="' + v2 + '" v3="' + v3 + '"/>');
                    }
                }
            } else {
                for (let i = 0; i < pos.count; i += 3) {
                    const v1 = getWeldedVertexIndex(pos.getX(i), pos.getY(i), pos.getZ(i));
                    const v2 = getWeldedVertexIndex(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1));
                    const v3 = getWeldedVertexIndex(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
                    if (v1 !== v2 && v2 !== v3 && v1 !== v3) {
                        triangles.push('<triangle v1="' + v1 + '" v2="' + v2 + '" v3="' + v3 + '"/>');
                    }
                }
            }
            geo.dispose();
        });

        return {
            vertsXml: uniqueVertices.join(""),
            trisXml: triangles.join(""),
            hasData: triangles.length > 0
        };
    }

    // แยกกลุ่มตามสี (Color1_Base และ Color2_Top)
    const baseMeshes = [];
    const topMeshes = [];
    mainGroup.children.forEach(function(mesh) {
        if (!mesh.isMesh) return;
        if (mesh.userData.colorRole === "top") topMeshes.push(mesh);
        else baseMeshes.push(mesh);
    });

    let objectsXml = "";
    let compXml = "";
    let nextId = 1;

    const baseData = buildWeldedMeshXml(baseMeshes);
    if (baseData.hasData) {
        objectsXml += '<object id="' + nextId + '" name="Color1_Base" type="model"><mesh><vertices>' + baseData.vertsXml + '</vertices><triangles>' + baseData.trisXml + '</triangles></mesh></object>';
        compXml += '<component objectid="' + nextId + '"/>';
        nextId++;
    }

    const topData = buildWeldedMeshXml(topMeshes);
    if (topData.hasData) {
        objectsXml += '<object id="' + nextId + '" name="Color2_Top" type="model"><mesh><vertices>' + topData.vertsXml + '</vertices><triangles>' + topData.trisXml + '</triangles></mesh></object>';
        compXml += '<component objectid="' + nextId + '"/>';
        nextId++;
    }

    // รวมเป็น Assembly เดียวกัน เพื่อให้ Bambu Studio มองเห็นเป็นชิ้นงาน 2 สีที่ประกอบกันมาเรียบร้อย
    const assemblyId = nextId;
    objectsXml += '<object id="' + assemblyId + '" name="LuggageTag_Assembly" type="model"><components>' + compXml + '</components></object>';
    const buildXml = '<item objectid="' + assemblyId + '"/>';

    const modelXml = '<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources>' + objectsXml + '</resources><build>' + buildXml + '</build></model>';
    zip.folder("3D").file("3dmodel.model", modelXml);

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = "LuggageTag_Style" + currentLuggageStyle + ".3mf";
    link.click();
}

window.addEventListener("DOMContentLoaded", init3D);