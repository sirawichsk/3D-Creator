// ==========================================
// ระบบตะกร้าสินค้า, จัดการสต๊อกสีเส้นพลาสติก, สแกนสลิปอัตโนมัติ และหลังบ้านแอดมิน
// S.S. Crafting 3D Studio (shop_system.js)
// ==========================================

const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxDCb7g0VVzNN7LHSHMeg2FGis8gVMLaMCbI2SMDKte7vFEoix5Yts-FgT0tB7AjatQ/exec"; 

let priceConfig = {
    raised_1_5: 49, raised_6_10: 59, raised_11_plus: 69,
    recessed_1_5: 49, recessed_6_10: 59, recessed_11_plus: 69,
    letter_1: 35, letter_2: 45,
    pet_bone: 69, pet_fish: 69, pet_circle: 69, pet_nfc_addon: 30,
    luggage_flat: 89, // ราคาเหมาป้ายห้อยกระเป๋า (แอดมินแก้ได้ในหน้าตั้งราคา)
    shipping_fee: 40, free_shipping_min: 200,
    payment_info: "ธ.กสิกรไทย 123-4-56789-0 ชื่อบัญชี S.S. Crafting",
    filament_colors: [
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
    ]
};

let cart = JSON.parse(localStorage.getItem("ss_cart") || "[]");
let isAdmin = localStorage.getItem("ss_admin_logged") === "true";
let isScanningSlip = false;
// ==========================================
// ฟอนต์ส่วนกลาง (ตรงกับไฟล์ในโฟลเดอร์ D:\My3DWeb\font ทั้ง 10 ไฟล์)
window.FONT_FOLDER_PATH = "font/";
window.shopFontConfig = [
    { name: "Chewy", file: "Chewy-Regular.ttf", family: "Chewy" },
    { name: "Kanit ExtraBold", file: "Kanit-ExtraBold.ttf", family: "Kanit" },
    { name: "Prompt Bold", file: "Prompt-Bold.ttf", family: "Prompt" },
    { name: "Mitr SemiBold", file: "Mitr-SemiBold.ttf", family: "Mitr" },
    { name: "Athiti Bold", file: "Athiti-Bold.ttf", family: "Athiti" },
    { name: "NotoSansThai", file: "NotoSansThai-VariableFont_wdth,wght.ttf", family: "NotoSansThai" },
    { name: "LuckiestGuy", file: "LuckiestGuy-Regular.ttf", family: "LuckiestGuy" },
    { name: "OleoScript", file: "OleoScript-Bold.ttf", family: "OleoScript" },
    { name: "Super Basic", file: "Super Basic.ttf", family: "SuperBasic" },
    { name: "TitanOne", file: "TitanOne-Regular.ttf", family: "TitanOne" }
];

// ==========================================
// 1. โหลดไลบรารี jsQR และ Tesseract.js ผ่าน CDN
// ==========================================
function loadExternalScript(src) {
    return new Promise(function(resolve, reject) {
        if (document.querySelector('script[src="' + src + '"]')) return resolve();
        const s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

async function ensureSlipScannerLibraries() {
    if (typeof jsQR === "undefined") {
        await loadExternalScript("https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js");
    }
    if (typeof Tesseract === "undefined") {
        await loadExternalScript("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
    }
}

// ==========================================
// 2. ฟังก์ชันสแกนสลิป (QR Code + OCR)
// ==========================================
function loadImageFromFile(file) {
    return new Promise(function(resolve, reject) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() { resolve({ img: img, dataUrl: e.target.result }); };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function detectQRCodeFromImage(img) {
    const scales = [1.0, 0.75, 0.5, 1.25];
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    for (let i = 0; i < scales.length; i++) {
        const sc = scales[i];
        const w = Math.floor(img.width * sc);
        const h = Math.floor(img.height * sc);
        if (w < 50 || h < 50) continue;

        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const code = jsQR(imgData.data, w, h, { inversionAttempts: "dontInvert" });
        if (code && code.data) return code.data.trim();
    }
    return null;
}

function preprocessImageForOCR(img) {
    const canvas = document.createElement("canvas");
    const maxDim = 1400;
    let w = img.width;
    let h = img.height;
    if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * (maxDim / w)); w = maxDim; }
        else { w = Math.round(w * (maxDim / h)); h = maxDim; }
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);

    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const saturation = maxC - minC;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        if (lum < 115 && saturation < 80) {
            d[i] = d[i + 1] = d[i + 2] = 0;
        } else if (lum < 155 && saturation < 45) {
            d[i] = d[i + 1] = d[i + 2] = 90;
        } else {
            d[i] = d[i + 1] = d[i + 2] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/png");
}

function extractSlipDetailsByRegex(ocrText) {
    const normalizedText = ocrText.replace(/\u0e4d\u0e32/g, "\u0e33");
    const cleanText = normalizedText.replace(/,/g, "");
    const rawLines = normalizedText.split(/\r?\n/).map(function(l) { return l.trim(); }).filter(Boolean);

    let transferTime = "";
    const timeMatch = cleanText.match(/\b([01]?\d|2[0-3])\s*:\s*([0-5]\d)(?:\s*:\s*[0-5]\d)?\b/);
    if (timeMatch) {
        transferTime = timeMatch[1].padStart(2, "0") + ":" + timeMatch[2];
    }

    let transferDate = "";
    const thaiMonthsPattern = "(?:ม\\.?ค\\.?|ก\\.?พ\\.?|มี\\.?ค\\.?|เม\\.?ย\\.?|พ\\.?ค\\.?|มิ\\.?ย\\.?|ก\\.?ค\\.?|ส\\.?ค\\.?|ก\\.?ย\\.?|ต\\.?ค\\.?|พ\\.?ย\\.?|ธ\\.?ค\\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z\\.]*";
    const dateRegex1 = new RegExp("\\b([0-3]?\\d)\\s+" + thaiMonthsPattern + "\\s+(\\d{2,4})\\b", "i");
    const dateRegex2 = /\b([0-3]?\d)[\/\-]([01]?\d)[\/\-](\d{2,4})\b/;

    const dMatch1 = normalizedText.match(dateRegex1);
    const dMatch2 = normalizedText.match(dateRegex2);
    if (dMatch1) {
        transferDate = dMatch1[0].replace(/\s+/g, " ").trim();
    } else if (dMatch2) {
        transferDate = dMatch2[0].trim();
    }

    let transferAmount = "";
    const amtRegex = /\b(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2})\b/g;
    let m;
    const candidates = [];
    while ((m = amtRegex.exec(normalizedText)) !== null) {
        const numVal = parseFloat(m[0].replace(/,/g, ""));
        if (numVal > 0.00 && numVal < 1000000) {
            candidates.push(numVal);
        }
    }
    if (candidates.length > 0) {
        transferAmount = candidates[0].toFixed(2);
    }

    let transferName = "";
    const lines = rawLines.map(function(l) {
        return l.replace(/\s{3,}[^\s\*]+$/g, "").trim();
    });
    const strictTitleRegex = /(?:^|[^ก-๙a-zA-Z])(นาย\s+|นางสาว\s*|นาง\s+|น\.\s*ส\.?\s*|ด\.\s*ช\.?\s*|ด\.\s*ญ\.?\s*|คุณ\s+|MR\.?\s+|MRS\.?\s+|MS\.?\s+|MISS\s+|K\.\s*)([ก-๙a-zA-Z\s\.\*\-]+)$/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/โอนเงิน|สำเร็จ|รหัสอ้างอิง|เลขที่รายการ|ค่าธรรมเนียม|จำนวนเงิน|วันที่ทำรายการ|ไปยัง|บจก\.|หจก\.|บริษัท|Crafting/i.test(line)) {
            continue;
        }
        const tMatch = line.match(strictTitleRegex);
        if (tMatch) {
            transferName = (tMatch[1] + tMatch[2]).replace(/\s+/g, " ").trim();
            break;
        }
    }

    if (!transferName) {
        for (let i = 0; i < lines.length; i++) {
            if (/X{2,}[\-\s]*X/i.test(lines[i]) || /\d*X+\d*\-\d+/i.test(lines[i])) {
                for (let back = 1; back <= 2; back++) {
                    if (i - back >= 0) {
                        const cand = lines[i - back];
                        if (!/กรุงไทย|กสิกร|ไทยพาณิชย์|กรุงเทพ|กรุงศรี|ออมสิน|ทหารไทย|ธนชาต|พร้อมเพย์|Krungthai|KBank|SCB|BBL|รหัสอ้างอิง|โอนเงิน|สำเร็จ|จาก/i.test(cand) && cand.length >= 3) {
                            transferName = cand;
                            break;
                        }
                    }
                }
                if (transferName) break;
            }
        }
    }

    return { amount: transferAmount, date: transferDate, time: transferTime, senderName: transferName };
}

async function handleSlipFileUpload(fileInputEl, prefix) {
    const file = fileInputEl.files[0];
    const statusBox = document.getElementById(prefix + "_scanStatus");
    const submitBtn = document.getElementById(prefix === "cust" ? "btnConfirmCheckout" : "btnSaveEdit_" + prefix.replace("edit_", ""));

    if (!file) {
        if (statusBox) statusBox.style.display = "none";
        return;
    }

    isScanningSlip = true;
    if (submitBtn) submitBtn.disabled = true;
    if (statusBox) {
        statusBox.style.display = "block";
        statusBox.style.background = "#2a2415";
        statusBox.style.borderColor = "#ffd04d";
        statusBox.style.color = "#ffd04d";
        statusBox.innerHTML = "⏳ <b>กำลังสแกนรูปสลิป:</b> ตรวจสอบ QR Code และอ่านข้อมูลโอนเงินอัตโนมัติ...";
    }

    try {
        await ensureSlipScannerLibraries();
        const loaded = await loadImageFromFile(file);

        const qrPayload = detectQRCodeFromImage(loaded.img);
        document.getElementById(prefix + "_qrPayload").value = qrPayload || "";

        const processedDataUrl = preprocessImageForOCR(loaded.img);
        const ocrResult = await Tesseract.recognize(processedDataUrl, "tha+eng");
        const rawText = (ocrResult && ocrResult.data && ocrResult.data.text) ? ocrResult.data.text : "";
        const extracted = extractSlipDetailsByRegex(rawText);

        const nameEl = document.getElementById(prefix + "_transferName");
        const dateEl = document.getElementById(prefix + "_transferDate");
        const timeEl = document.getElementById(prefix + "_transferTime");
        const amtEl = document.getElementById(prefix + "_transferAmt");

        if (nameEl) nameEl.value = extracted.senderName || "";
        if (dateEl) dateEl.value = extracted.date || "";
        if (timeEl) timeEl.value = extracted.time || "";
        if (amtEl) amtEl.value = extracted.amount || "";

        if (statusBox) {
            if (qrPayload) {
                statusBox.style.background = "#142e22";
                statusBox.style.borderColor = "#00ba7c";
                statusBox.style.color = "#66ffcc";
                statusBox.innerHTML = "✅ <b>สแกนสลิปสำเร็จ!</b> ดึงข้อมูลเรียบร้อย (สามารถคลิกแก้ไขในช่องด้านล่างได้)";
            } else {
                statusBox.style.background = "#332411";
                statusBox.style.borderColor = "#ffaa44";
                statusBox.style.color = "#ffcc88";
                statusBox.innerHTML = "⚠️ <b>ไม่พบ QR Code บนรูปนี้</b> แต่ระบบดึงข้อความให้แล้ว (สามารถกดยืนยันส่งให้ร้านค้าตรวจสอบได้)";
            }
        }
    } catch (err) {
        console.error("Slip Scan Error:", err);
        if (statusBox) {
            statusBox.style.background = "#332411";
            statusBox.style.borderColor = "#ffaa44";
            statusBox.style.color = "#ffcc88";
            statusBox.innerHTML = "⚠️ อ่านข้อความอัตโนมัติไม่สำเร็จ กรุณากรอกข้อมูลสลิปด้านล่างด้วยตนเองครับ";
        }
    } finally {
        isScanningSlip = false;
        if (submitBtn) submitBtn.disabled = false;
    }
}

function cleanDisplayDateTime(str, isTimeOnly) {
    if (!str) return "-";
    const s = String(str).replace(/^'/, "").trim();
    if (!s) return "-";
    if (s.includes("1899") && s.match(/\d{2}:\d{2}/)) {
        return s.match(/\d{2}:\d{2}/)[0];
    }
    if (s.includes("GMT") && s.length > 25) {
        if (isTimeOnly && s.match(/\d{2}:\d{2}/)) return s.match(/\d{2}:\d{2}/)[0];
        const parts = s.split(" ");
        if (parts.length >= 4) return parts[2] + " " + parts[1] + " " + parts[3];
    }
    return s;
}

// ==========================================
// 3. ฟังก์ชันคำนวณราคาและแสดงขนาดจริง 3D บนจอ
// ==========================================
function getPageType() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("recessed")) return "recessed";
    if (path.includes("letter")) return "letter";
    if (path.includes("pet")) return "pet";
    if (path.includes("luggage")) return "luggage";
    return "raised";
}

function calculateCurrentItemPrice() {
    const page = getPageType();
    const nameEl = document.getElementById("nameInput");
    const textLen = nameEl ? nameEl.value.trim().length : 1;

    if (page === "luggage") {
        return Number(priceConfig.luggage_flat || 89); // ราคาเหมาป้ายกระเป๋า
    }
    if (page === "raised") {
        if (textLen <= 5) return Number(priceConfig.raised_1_5);
        if (textLen <= 10) return Number(priceConfig.raised_6_10);
        return Number(priceConfig.raised_11_plus);
    } 
    else if (page === "recessed") {
        if (textLen <= 5) return Number(priceConfig.recessed_1_5);
        if (textLen <= 10) return Number(priceConfig.recessed_6_10);
        return Number(priceConfig.recessed_11_plus);
    } 
    else if (page === "letter") {
        return textLen <= 1 ? Number(priceConfig.letter_1) : Number(priceConfig.letter_2);
    } 
    else if (page === "pet") {
        const shape = typeof currentPetShape !== "undefined" ? currentPetShape : "bone";
        let base = Number(priceConfig.pet_bone);
        if (shape === "fish") base = Number(priceConfig.pet_fish);
        if (shape === "circle") {
            base = Number(priceConfig.pet_circle);
            if (typeof isCircleNfcEnabled !== "undefined" && isCircleNfcEnabled) {
                base += Number(priceConfig.pet_nfc_addon);
            }
        }
        return base;
    }
    return 59;
}

function updateOrderButtonPrice() {
    const btn = document.getElementById("btnAddToCart");
    if (btn) {
        const price = calculateCurrentItemPrice();
        btn.innerHTML = "🛒 สั่งซื้อ / เพิ่มลงตะกร้า (" + price + ".-)";
    }
}

function updateModelDimensionDisplay() {
    let dimBox = document.getElementById("modelDimensionHUD");
    if (!dimBox) {
        dimBox = document.createElement("div");
        dimBox.id = "modelDimensionHUD";
        dimBox.style.cssText = "position:absolute; bottom:20px; right:20px; background:rgba(18,18,18,0.85); border:1px solid #333; border-radius:10px; padding:12px 18px; font-size:18px; color:#00ba7c; font-weight:bold; z-index:5; pointer-events:none; box-shadow:0 4px 15px rgba(0,0,0,0.6); font-family:inherit;";
        const viewer = document.getElementById("viewer");
        if (viewer) viewer.appendChild(dimBox);
    }

    if (typeof mainGroup !== "undefined" && mainGroup.children.length > 0) {
        const box = new THREE.Box3().setFromObject(mainGroup);
        if (box.min.x !== Infinity) {
            const sizeX = box.max.x - box.min.x;
            const sizeY = box.max.y - box.min.y;
            const sizeZ = box.max.z - box.min.z;
            dimBox.innerHTML = "📏 ขนาดจริง: กว้าง " + sizeX.toFixed(1) + " × สูง " + sizeY.toFixed(1) + " × หนา " + sizeZ.toFixed(1) + " มม.";
            return;
        }
    }
    dimBox.innerHTML = "📏 ขนาดจริง: กำลังคำนวณ...";
}

function captureCurrentParams() {
    const page = getPageType();
    const inputs = {};
    document.querySelectorAll("#sidebar input").forEach(function(el) {
        if (el.id) inputs[el.id] = el.value;
    });

    const state = {
        page: page,
        fileUrl: page === "raised" ? "raised.html" : page + ".html",
        inputs: inputs,
        currentFontFile: typeof currentFontFile !== "undefined" ? currentFontFile : "Chewy-Regular.ttf",
        currentWorkType: typeof currentWorkType !== "undefined" ? currentWorkType : "keychain",
        currentBaseType: typeof currentBaseType !== "undefined" ? currentBaseType : "outline",
        currentTextStyle: typeof currentTextStyle !== "undefined" ? currentTextStyle : "flat",
        currentPetShape: typeof currentPetShape !== "undefined" ? currentPetShape : "bone",
        isCircleNfcEnabled: typeof isCircleNfcEnabled !== "undefined" ? isCircleNfcEnabled : false,
        customRingPos: typeof customRingPos !== "undefined" ? customRingPos : null,
        emojiItems: typeof emojiItems !== "undefined" ? JSON.parse(JSON.stringify(emojiItems)) : [],
        customNfcPos: typeof customNfcPos !== "undefined" ? customNfcPos : null,
        luggageState: typeof window.getLuggageCustomState === "function" ? window.getLuggageCustomState() : null
    };

    if (typeof draggableObjects !== "undefined" && draggableObjects.length > 0 && page !== "pet") {
        state.draggedRingPos = { x: draggableObjects[0].position.x, y: draggableObjects[0].position.y };
    }
    return state;
}

function applyCapturedParams(state, autoDownloadFormat) {
    if (!state) return;

    if (state.currentFontFile && typeof currentFontFile !== "undefined") {
        currentFontFile = state.currentFontFile;
        document.querySelectorAll(".font-card").forEach(function(c, idx) {
            c.classList.toggle("active", fontConfig[idx] && fontConfig[idx].file === currentFontFile);
        });
    }
    if (state.currentWorkType && typeof currentWorkType !== "undefined") {
        currentWorkType = state.currentWorkType;
        const ringBlock = document.getElementById("ringSettingsBlock");
        if (ringBlock) ringBlock.style.display = currentWorkType === "keychain" ? "block" : "none";
    }
    if (state.currentBaseType && typeof currentBaseType !== "undefined") {
        currentBaseType = state.currentBaseType;
        const outBlock = document.getElementById("outlineSettingsBlock");
        const rectBlock = document.getElementById("rectSettingsBlock");
        if (outBlock) outBlock.style.display = currentBaseType === "outline" ? "block" : "none";
        if (rectBlock) rectBlock.style.display = currentBaseType === "rectangle" ? "block" : "none";
    }
    if (state.currentTextStyle && typeof currentTextStyle !== "undefined") {
        currentTextStyle = state.currentTextStyle;
        const bevBlock = document.getElementById("bevelSettingsBlock");
        if (bevBlock) bevBlock.style.display = currentTextStyle === "rounded" ? "block" : "none";
    }
    if (state.currentPetShape && typeof currentPetShape !== "undefined") {
        currentPetShape = state.currentPetShape;
        const cirBlock = document.getElementById("circleOptionsBlock");
        if (cirBlock) cirBlock.style.display = currentPetShape === "circle" ? "block" : "none";
    }
    if (typeof isCircleNfcEnabled !== "undefined") {
        isCircleNfcEnabled = !!state.isCircleNfcEnabled;
        const nfcBlock = document.getElementById("nfcSettingsBlock");
        if (nfcBlock) nfcBlock.style.display = isCircleNfcEnabled ? "block" : "none";
    }

    if (state.inputs) {
        Object.keys(state.inputs).forEach(function(id) {
            const el = document.getElementById(id);
            if (el) el.value = state.inputs[id];
        });
    }

    if (state.luggageState && typeof window.setLuggageCustomState === "function") {
        window.setLuggageCustomState(state.luggageState);
    }

    if (typeof customRingPos !== "undefined" && state.customRingPos) customRingPos = state.customRingPos;
    if (typeof emojiItems !== "undefined" && state.emojiItems) emojiItems = state.emojiItems;
    if (typeof customNfcPos !== "undefined" && state.customNfcPos) customNfcPos = state.customNfcPos;

    if (typeof updatePreviewText === "function") updatePreviewText();
    if (typeof processModelUpdate === "function") processModelUpdate();

    setTimeout(function() {
        if (state.draggedRingPos && typeof draggableObjects !== "undefined" && draggableObjects.length > 0 && state.page !== "pet") {
            draggableObjects.forEach(function(obj) {
                obj.position.x = state.draggedRingPos.x;
                obj.position.y = state.draggedRingPos.y;
            });
        }
        if (autoDownloadFormat === "3mf" && typeof export3MF === "function") export3MF();
        else if (autoDownloadFormat === "stl" && typeof exportSTL === "function") exportSTL();
    }, 650);
}

// ==========================================
// 4. สร้าง UI ตะกร้าและ Modal ทั้งหมด
// ==========================================
function injectShopUI() {
    const style = document.createElement("style");
    style.innerHTML = [
        "#shop-topbar-right { margin-left: auto; display: flex; align-items: center; gap: 8px; }",
        ".top-action-btn { background: #222; border: 1px solid #444; color: #eee; height: 38px; padding: 0 14px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: inherit; font-size: 13px; font-weight: bold; transition: 0.2s; }",
        ".top-action-btn:hover { background: #333; border-color: #00ba7c; color: #fff; }",
        ".gear-btn { width: 38px; padding: 0; justify-content: center; font-size: 17px; }",
        ".cart-badge { background: #00ba7c; color: #fff; border-radius: 10px; padding: 1px 7px; font-size: 11px; font-weight: bold; }",
        ".btn-order-main { width: 100%; padding: 16px; background: linear-gradient(135deg, #00ba7c, #008f5d); color: white; margin-top: 20px; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(0,186,124,0.3); font-family: inherit; }",
        ".btn-order-main:hover { transform: translateY(-1px); filter: brightness(1.08); }",
        ".btn-order-main:disabled { background: #555; cursor: not-allowed; box-shadow: none; transform: none; }",
        "#cartDrawerOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 999; display: none; }",
        "#cartDrawer { position: fixed; top: 0; right: -430px; width: 410px; max-width: 92vw; height: 100vh; background: #161616; border-left: 1px solid #333; z-index: 1000; display: flex; flex-direction: column; transition: right 0.28s ease; box-shadow: -5px 0 25px rgba(0,0,0,0.8); }",
        "#cartDrawer.open { right: 0; }",
        ".drawer-header { padding: 18px 20px; background: #111; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; font-size: 17px; font-weight: bold; color: #fff; }",
        ".drawer-body { padding: 18px; overflow-y: auto; flex-grow: 1; }",
        ".drawer-footer { padding: 16px 20px; background: #111; border-top: 1px solid #333; }",
        ".cart-item-card { background: #222; border: 1px solid #333; border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }",
        ".cart-color-dot { width: 13px; height: 13px; border-radius: 50%; display: inline-block; border: 1px solid #666; vertical-align: middle; }",
        ".shop-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 1050; display: none; align-items: center; justify-content: center; padding: 15px; }",
        ".shop-modal { background: #181818; border: 1px solid #383838; border-radius: 12px; width: 650px; max-width: 95vw; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 10px 35px rgba(0,0,0,0.9); overflow: hidden; }",
        ".shop-modal-header { padding: 16px 22px; background: #111; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; font-size: 18px; font-weight: bold; color: #c9a77e; }",
        ".shop-modal-body { padding: 20px 22px; overflow-y: auto; flex-grow: 1; }",
        ".close-x-btn { background: transparent; border: none; color: #999; font-size: 22px; cursor: pointer; line-height: 1; }",
        ".close-x-btn:hover { color: #fff; }",
        ".form-label { display: block; font-size: 12px; color: #bbb; margin-bottom: 4px; margin-top: 8px; }",
        ".form-input, .form-textarea, .form-select { width: 100%; padding: 9px 11px; background: #252525; border: 1px solid #444; border-radius: 6px; color: #fff; font-family: inherit; font-size: 13px; box-sizing: border-box; }",
        ".form-input.ocr-filled { background: #1c2621; color: #00ba7c; border-color: #2b5c47; font-weight: bold; }",
        ".form-textarea { resize: vertical; min-height: 60px; }",
        ".form-row { display: flex; gap: 8px; }",
        ".form-col { flex: 1; }",
        ".scan-status-box { display: none; padding: 10px; border-radius: 6px; border: 1px solid #444; font-size: 12px; margin-top: 8px; line-height: 1.4; }",
        ".order-card { background: #222; border: 1px solid #383838; border-radius: 10px; padding: 15px; margin-bottom: 15px; }",
        ".status-badge { padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; }",
        ".status-wait { background: #4a3800; color: #ffd04d; }",
        ".status-prod { background: #00385c; color: #5cc4ff; }",
        ".status-ship { background: #0b4a2d; color: #4dffaa; }",
        ".status-cancel { background: #4a1212; color: #ff7070; }",
        ".price-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }",
        ".small-btn { padding: 6px 10px; border-radius: 6px; border: 1px solid #555; background: #2c2c2c; color: #fff; cursor: pointer; font-size: 12px; font-family: inherit; transition: 0.2s; }",
        ".small-btn:hover:not(:disabled) { border-color: #00ba7c; background: #383838; }",
        ".small-btn:disabled { opacity: 0.6; cursor: not-allowed; }",
        ".small-btn.primary { background: #00ba7c; border-color: #00ba7c; font-weight: bold; }",
        ".small-btn.blue { background: #0088cc; border-color: #0088cc; font-weight: bold; }",
        ".small-btn.warn { background: #b36b00; border-color: #e68a00; font-weight: bold; }",
        ".small-btn.danger { background: #6b1d1d; border-color: #992b2b; }",
        "details.admin-order-details { background: #222; border: 1px solid #383838; border-radius: 10px; margin-bottom: 12px; overflow: hidden; }",
        "details.admin-order-details summary { padding: 15px; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid transparent; transition: 0.2s; outline: none; }",
        "details.admin-order-details summary::-webkit-details-marker { display: none; }",
        "details.admin-order-details[open] summary { border-bottom-color: #333; background: #1a1a1a; }",
        "details.admin-order-details summary:hover { background: #2a2a2a; }",
        ".admin-order-content { padding: 15px; background: #222; }"
    ].join("\n");
    document.head.appendChild(style);

    const topbar = document.getElementById("topbar");
    if (topbar) {

        const rightBox = document.createElement("div");
        rightBox.id = "shop-topbar-right";
        rightBox.innerHTML = [
            '<button class="top-action-btn" onclick="openTrackModal()">🔍 เช็คสถานะ / แจ้งโอน</button>',
            '<button class="top-action-btn" id="topCartBtn" onclick="toggleCartDrawer(true)">🛒 <span class="cart-badge" id="cartCountBadge">0</span></button>',
            '<button class="top-action-btn" id="adminOrdersMenuBtn" style="display:none; border-color:#c9a77e; color:#c9a77e;" onclick="openAdminModal()">📋 จัดการออเดอร์</button>',
            '<button class="top-action-btn gear-btn" id="adminGearBtn" title="ผู้ดูแลระบบ" onclick="handleGearClick()">⚙️</button>'
        ].join("");
        topbar.appendChild(rightBox);
    }

    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
        const orderBtn = document.createElement("button");
        orderBtn.id = "btnAddToCart";
        orderBtn.className = "btn-order-main";
        orderBtn.onclick = addCurrentItemToCart;
        sidebar.appendChild(orderBtn);

        sidebar.addEventListener("input", updateOrderButtonPrice);
        sidebar.addEventListener("click", function() { setTimeout(updateOrderButtonPrice, 50); });
    }

    const container = document.createElement("div");
    container.innerHTML = [
        '<div id="cartDrawerOverlay" onclick="toggleCartDrawer(false)"></div>',
        '<div id="cartDrawer">',
        '    <div class="drawer-header"><span>🛒 ตะกร้าสินค้าของคุณ</span><button class="close-x-btn" onclick="toggleCartDrawer(false)">×</button></div>',
        '    <div class="drawer-body" id="cartDrawerBody"></div>',
        '    <div class="drawer-footer" id="cartDrawerFooter"></div>',
        '</div>',

        '<div class="shop-modal-overlay" id="successModalOverlay">',
        '    <div class="shop-modal" style="width: 380px; text-align: center; padding-bottom: 20px;">',
        '        <div class="shop-modal-header" style="justify-content: center; background: #00ba7c; color: #fff; border-bottom: none;">',
        '            <span style="font-size: 22px;">🎉 สั่งซื้อสำเร็จ!</span>',
        '        </div>',
        '        <div class="shop-modal-body" style="padding-top: 20px;">',
        '            <p style="color: #bbb; margin-top: 0;">หมายเลขคำสั่งซื้อของคุณคือ</p>',
        '            <h2 style="color: #c9a77e; margin: 5px 0 15px 0; font-size: 28px;" id="successOrderId">SS-XXXXX</h2>',
        '            <div style="background: #111; padding: 15px; border-radius: 10px; border: 1px solid #333;">',
        '                <p style="color: #fff; font-weight: bold; margin-top: 0; font-size: 15px;">เพิ่มเพื่อน เพื่อตรวจความถูกต้องก่อนส่ง</p>',
        '                <img src="logo/line friend.png" style="width: 180px; height: 180px; border-radius: 10px; margin: 10px 0; object-fit: contain; background: #fff;">',
        '                <p style="color: #00ba7c; font-size: 16px; font-weight: bold; margin-bottom: 0;">หรือ @665tkfec</p>',
        '            </div>',
        '            <button class="btn-order-main" style="margin-top: 20px;" onclick="closeModal(\'successModalOverlay\')">ตกลง / ปิดหน้าต่าง</button>',
        '        </div>',
        '    </div>',
        '</div>',

        '<div class="shop-modal-overlay" id="loginModalOverlay">',
        '    <div class="shop-modal" style="width: 400px; max-width: 90vw;">',
        '        <div class="shop-modal-header" style="justify-content: center; border-bottom: 0; padding-bottom: 0; margin-top: 10px;">',
        '            <span style="font-size: 20px; color: #fff;">🔒 เข้าสู่ระบบ Admin</span>',
        '        </div>',
        '        <div class="shop-modal-body" style="padding: 20px 30px 30px 30px;">',
        '            <label class="form-label" style="color: #888;">ชื่อผู้ใช้งาน (Username)</label>',
        '            <input type="text" id="loginUsername" class="form-input" style="margin-bottom: 15px;" placeholder="กรอก Username" onkeypress="if(event.key===\'Enter\') document.getElementById(\'loginPassword\').focus()">',
        '            <label class="form-label" style="color: #888;">รหัสผ่าน (Password)</label>',
        '            <input type="password" id="loginPassword" class="form-input" style="margin-bottom: 25px;" placeholder="กรอก Password" onkeypress="if(event.key===\'Enter\') submitAdminLogin()">',
        '            <button class="btn-order-main" id="btnLoginSubmit" style="margin-top: 0;" onclick="submitAdminLogin()">เข้าสู่ระบบ</button>',
        '            <button class="small-btn" style="width: 100%; margin-top: 10px; padding: 12px; background: transparent; border: 1px solid #444;" onclick="closeModal(\'loginModalOverlay\')">ยกเลิก</button>',
        '        </div>',
        '    </div>',
        '</div>',

        '<div class="shop-modal-overlay" id="trackModalOverlay">',
        '    <div class="shop-modal">',
        '        <div class="shop-modal-header">',
        '            <span>🔍 เช็คสถานะ / แก้ไขที่อยู่ / แนบสลิป</span>',
        '            <button class="close-x-btn" onclick="closeModal(\'trackModalOverlay\')">×</button>',
        '        </div>',
        '        <div class="shop-modal-body">',
        '            <div style="display:flex; gap:8px; margin-bottom:15px;">',
        '                <input type="text" id="trackQueryInput" class="form-input" placeholder="กรอก เลขออเดอร์ (เช่น SS-...) หรือ เบอร์โทรศัพท์" style="margin:0;" onkeypress="if(event.key===\'Enter\') searchCustomerOrders()">',
        '                <button class="small-btn primary" id="btnSearchOrder" style="padding:0 18px; white-space:nowrap;" onclick="searchCustomerOrders()">ค้นหา</button>',
        '            </div>',
        '            <div id="trackResultsContainer"></div>',
        '        </div>',
        '    </div>',
        '</div>',

        '<div class="shop-modal-overlay" id="adminModalOverlay">',
        '    <div class="shop-modal" style="width: 860px;">',
        '        <div class="shop-modal-header">',
        '            <span id="adminModalTitle">⚙️ ระบบจัดการร้านค้า</span>',
        '            <button class="close-x-btn" onclick="closeModal(\'adminModalOverlay\')">×</button>',
        '        </div>',
        '        <div class="shop-modal-body">',
        '            <div style="display:flex; gap:8px; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:12px; flex-wrap:wrap;">',
        '                <button class="small-btn primary" id="tabBtnOrders" onclick="switchAdminTab(\'orders\')">📋 รายการออเดอร์ลูกค้า</button>',
        '                <button class="small-btn" id="tabBtnPricing" onclick="switchAdminTab(\'pricing\')">💰 ตั้งค่าราคาสินค้า & ค่าส่ง</button>',
        '                <button class="small-btn" id="tabBtnColors" onclick="switchAdminTab(\'colors\')">🎨 จัดการสต๊อกสีเส้นพลาสติก</button>',
        '                <button class="small-btn danger" style="margin-left:auto;" onclick="adminLogout()">ออกจากระบบแอดมิน</button>',
        '            </div>',
        '            <div id="adminOrdersSection"></div>',
        '            <div id="adminPricingSection" style="display:none;"></div>',
        '            <div id="adminColorsSection" style="display:none;"></div>',
        '        </div>',
        '    </div>',
        '</div>',

        '<div class="shop-modal-overlay" id="verifySlipModalOverlay" style="z-index: 1100;">',
        '    <div class="shop-modal" style="width: 500px; max-width: 95vw;">',
        '        <div class="shop-modal-header">',
        '            <span>🧾 ตรวจสอบและยืนยันความถูกต้องสลิป</span>',
        '            <button class="close-x-btn" onclick="closeModal(\'verifySlipModalOverlay\')">×</button>',
        '        </div>',
        '        <div class="shop-modal-body" id="verifySlipModalBody"></div>',
        '    </div>',
        '</div>'
    ].join("\n");
    document.body.appendChild(container);

    refreshAdminAndCustomerUI();
    updateCartBadgeAndDrawer();
    updateOrderButtonPrice();
}

function refreshAdminAndCustomerUI() {
    const stlBtns = document.querySelectorAll(".btn-stl");
    const mfBtns = document.querySelectorAll(".btn-3mf");
    const addCartBtn = document.getElementById("btnAddToCart");
    const adminMenuBtn = document.getElementById("adminOrdersMenuBtn");

    if (isAdmin) {
        stlBtns.forEach(function(b) { b.style.display = "block"; });
        mfBtns.forEach(function(b) { b.style.display = "block"; });
        if (addCartBtn) addCartBtn.style.display = "none";
        if (adminMenuBtn) adminMenuBtn.style.display = "inline-flex";
    } else {
        stlBtns.forEach(function(b) { b.style.display = "none"; });
        mfBtns.forEach(function(b) { b.style.display = "none"; });
        if (addCartBtn) addCartBtn.style.display = "block";
        if (adminMenuBtn) adminMenuBtn.style.display = "none";
    }
}

// ==========================================
// 5. ระบบตะกร้า & ยืนยันการสั่งซื้อ
// ==========================================
function getReadableTypeName(page, state) {
    if (page === "raised") return "พวงกุญแจอักษรนูน";
    if (page === "recessed") return "พวงกุญแจขอบนูน";
    if (page === "letter") return "จี้ตัวอักษร";
    if (page === "pet") {
        const s = state.currentPetShape;
        if (s === "bone") return "ป้ายสัตว์เลี้ยง (กระดูก)";
        if (s === "fish") return "ป้ายสัตว์เลี้ยง (ปลา)";
        return "ป้ายสัตว์เลี้ยง (วงกลม" + (state.isCircleNfcEnabled ? " + NFC" : "") + ")";
    }
    if (page === "luggage") {
        const st = state.luggageState ? state.luggageState.style : 1;
        if (st === 1) return "Tag กระเป๋า (QR/NFC)";
        if (st === 2) return "Tag กระเป๋าเดินทาง 2 แผ่น";
        return "Tag กระเป๋าคลาสสิก";
    }
    return "ชิ้นงาน 3D";
}

function addCurrentItemToCart() {
    const state = captureCurrentParams();
    const price = calculateCurrentItemPrice();
    const nameText = state.inputs.nameInput || "Model";
    const typeName = getReadableTypeName(state.page, state);

    cart.push({
        cartItemId: Date.now() + "_" + Math.floor(Math.random() * 1000),
        title: typeName + ': "' + nameText + '"',
        price: price,
        baseColor: state.inputs.baseColorInput || "#ffffff",
        topColor: state.inputs.topColorInput || "#87cefa",
        params: state
    });

    localStorage.setItem("ss_cart", JSON.stringify(cart));
    updateCartBadgeAndDrawer();
    toggleCartDrawer(true);
}

function removeCartItem(index) {
    cart.splice(index, 1);
    localStorage.setItem("ss_cart", JSON.stringify(cart));
    updateCartBadgeAndDrawer();
}

function toggleCartDrawer(open) {
    const drawer = document.getElementById("cartDrawer");
    const overlay = document.getElementById("cartDrawerOverlay");
    if (open) {
        updateCartBadgeAndDrawer();
        overlay.style.display = "block";
        setTimeout(function() { drawer.classList.add("open"); }, 10);
    } else {
        drawer.classList.remove("open");
        setTimeout(function() { overlay.style.display = "none"; }, 280);
    }
}

function updateCartBadgeAndDrawer() {
    const badge = document.getElementById("cartCountBadge");
    if (badge) badge.innerText = cart.length;

    const body = document.getElementById("cartDrawerBody");
    const footer = document.getElementById("cartDrawerFooter");
    if (!body || !footer) return;

    if (cart.length === 0) {
        body.innerHTML = '<p style="text-align:center; color:#777; margin-top:40px;">ยังไม่มีสินค้าในตะกร้าครับ</p>';
        footer.innerHTML = "";
        return;
    }

    let subtotal = 0;
    let itemsHtml = "";
    cart.forEach(function(item, idx) {
        subtotal += Number(item.price);
        itemsHtml += '<div class="cart-item-card">' +
            '<div>' +
                '<div style="font-weight:bold; font-size:14px; color:#fff;">' + item.title + '</div>' +
                '<div style="font-size:12px; color:#aaa; margin-top:4px;">' +
                    'สีที่ 1 <span class="cart-color-dot" style="background:' + item.baseColor + '"></span> | ' +
                    'สีที่ 2 <span class="cart-color-dot" style="background:' + item.topColor + '"></span> | ' +
                    '<b style="color:#00ba7c;">' + item.price + '.-</b>' +
                '</div>' +
            '</div>' +
            '<div style="display:flex; gap:5px;">' +
                '<button class="small-btn" title="โหลดกลับมาแก้ไข" onclick="loadCartItemToEdit(' + idx + ')">✏️ แก้ไข</button>' +
                '<button class="small-btn danger" onclick="removeCartItem(' + idx + ')">🗑️</button>' +
            '</div>' +
        '</div>';
    });

    const freeMin = Number(priceConfig.free_shipping_min) || 200;
    const shipFee = subtotal >= freeMin ? 0 : Number(priceConfig.shipping_fee);
    const total = subtotal + shipFee;
    const promoHint = subtotal >= freeMin 
        ? '<div style="color:#00ba7c; font-size:12px; margin-bottom:8px;">🎉 คุณได้รับสิทธิ์ส่งฟรีแล้ว!</div>'
        : '<div style="color:#ffd04d; font-size:12px; margin-bottom:8px;">💡 สั่งเพิ่มอีก <b>' + (freeMin - subtotal) + '.-</b> ได้รับสิทธิ์ส่งฟรี! (ครบ ' + freeMin + '.-)</div>';

    body.innerHTML = promoHint + itemsHtml +
        '<hr style="border:0; border-top:1px solid #333; margin:15px 0;">' +
        '<h4 style="margin:0 0 8px 0; color:#c9a77e;">📦 ข้อมูลจัดส่งผู้รับ</h4>' +
        '<label class="form-label">ชื่อ-นามสกุล ผู้รับ *</label>' +
        '<input type="text" id="custName" class="form-input" placeholder="ชื่อ-นามสกุล">' +
        '<div class="form-row">' +
            '<div class="form-col">' +
                '<label class="form-label">เบอร์โทรศัพท์ * (ใช้เช็คออเดอร์)</label>' +
                '<input type="text" id="custPhone" class="form-input" placeholder="08X-XXX-XXXX">' +
            '</div>' +
            '<div class="form-col">' +
                '<label class="form-label">Line ID (ไม่บังคับ)</label>' +
                '<input type="text" id="custLine" class="form-input" placeholder="ไอดีไลน์">' +
            '</div>' +
        '</div>' +
        '<label class="form-label">ที่อยู่จัดส่ง *</label>' +
        '<textarea id="custAddress" class="form-textarea" placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"></textarea>' +
        '<hr style="border:0; border-top:1px solid #333; margin:15px 0;">' +
        '<h4 style="margin:0 0 8px 0; color:#c9a77e;">🧾 แนบสลิปโอนเงิน</h4>' +
        '<div style="background:#1e2923; border:1px solid #00ba7c; padding:10px; border-radius:6px; font-size:12px; color:#d2f4e6; margin-bottom:6px;">' +
            '💳 <b>ช่องทางโอนเงิน:</b><br>' + priceConfig.payment_info +
        '</div>' +
        '<div style="background:#262218; border:1px solid #8a6d2b; padding:8px 10px; border-radius:6px; font-size:12px; color:#ffd885; margin-bottom:8px;">' +
            '💡 <b>ยังไม่สะดวกโอนตอนนี้?</b> สามารถกดยืนยันการสั่งซื้อไว้ก่อน แล้วค่อยมาโอนและแนบสลิปทีหลังได้ที่ปุ่ม <b>"🔍 เช็คสถานะ / แจ้งโอน"</b> มุมบนขวาครับ' +
        '</div>' +
        '<label class="form-label">เลือกรูปสลิปโอนเงิน (ไม่บังคับ - แนบทีหลังได้)</label>' +
        '<input type="file" id="custSlipFile" accept="image/*" class="form-input" style="padding:6px;" onchange="handleSlipFileUpload(this, \'cust\')">' +
        '<div id="cust_scanStatus" class="scan-status-box"></div>' +
        '<input type="hidden" id="cust_qrPayload" value="">' +
        '<div class="form-row">' +
            '<div class="form-col">' +
                '<label class="form-label">ชื่อผู้โอน (จากสลิป/แก้ไขได้)</label>' +
                '<input type="text" id="cust_transferName" class="form-input ocr-filled" placeholder="สแกนอัตโนมัติ...">' +
            '</div>' +
            '<div class="form-col">' +
                '<label class="form-label">ยอดโอน (บาท)</label>' +
                '<input type="text" id="cust_transferAmt" class="form-input ocr-filled" placeholder="0.00">' +
            '</div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-col">' +
                '<label class="form-label">วันที่โอน</label>' +
                '<input type="text" id="cust_transferDate" class="form-input ocr-filled" placeholder="สแกนอัตโนมัติ...">' +
            '</div>' +
            '<div class="form-col">' +
                '<label class="form-label">เวลาโอน (HH:mm)</label>' +
                '<input type="text" id="cust_transferTime" class="form-input ocr-filled" placeholder="สแกนอัตโนมัติ...">' +
            '</div>' +
        '</div>';

    footer.innerHTML = '<div style="display:flex; justify-content:space-between; font-size:13px; color:#bbb;">' +
            '<span>ค่าสินค้า (' + cart.length + ' ชิ้น):</span><span>' + subtotal + '.-</span>' +
        '</div>' +
        '<div style="display:flex; justify-content:space-between; font-size:13px; color:#bbb; margin-top:4px;">' +
            '<span>ค่าจัดส่ง:</span><span>' + (shipFee === 0 ? "ฟรี (0.-)" : shipFee + ".-") + '</span>' +
        '</div>' +
        '<div style="display:flex; justify-content:space-between; font-size:17px; font-weight:bold; color:#fff; margin-top:6px; margin-bottom:12px;">' +
            '<span>ยอดรวมสุทธิ:</span><span style="color:#00ba7c;">' + total + ' บาท</span>' +
        '</div>' +
        '<button class="btn-order-main" id="btnConfirmCheckout" style="margin-top:0; padding:13px;" onclick="submitCheckout(' + subtotal + ', ' + shipFee + ', ' + total + ')">' +
            '✅ ยืนยันการสั่งซื้อ' +
        '</button>';
}

function loadCartItemToEdit(idx) {
    const item = cart[idx];
    if (!item) return;
    localStorage.setItem("ss_pending_load_params", JSON.stringify({ state: item.params, autoDownload: null }));
    window.location.href = item.params.fileUrl;
}

function fileToBase64(file) {
    return new Promise(function(resolve) {
        if (!file) return resolve("");
        const reader = new FileReader();
        reader.onload = function() { resolve(reader.result); };
        reader.readAsDataURL(file);
    });
}

async function submitCheckout(subtotal, shipping, totalPrice) {
    if (isScanningSlip) {
        alert("กรุณารอให้ระบบสแกนรูปสลิปเสร็จสักครู่ครับ");
        return;
    }

    const name = document.getElementById("custName").value.trim();
    const phone = document.getElementById("custPhone").value.trim();
    const lineId = document.getElementById("custLine").value.trim();
    const address = document.getElementById("custAddress").value.trim();
    const slipFile = document.getElementById("custSlipFile").files[0];
    
    const qrPayload = document.getElementById("cust_qrPayload").value.trim();
    const tName = document.getElementById("cust_transferName").value.trim();
    const tDate = document.getElementById("cust_transferDate").value.trim();
    const tTime = document.getElementById("cust_transferTime").value.trim();
    const tAmt = document.getElementById("cust_transferAmt").value.trim();

    if (!name || !phone || !address) {
        alert("กรุณากรอก ชื่อ, เบอร์โทรศัพท์ และที่อยู่จัดส่งให้ครบถ้วนครับ");
        return;
    }

    const btn = document.getElementById("btnConfirmCheckout");
    btn.disabled = true;
    btn.innerText = slipFile ? "⏳ กำลังอัปโหลดสลิปและบันทึกออเดอร์..." : "⏳ กำลังบันทึกออเดอร์...";

    const slipBase64 = await fileToBase64(slipFile);
    const payload = {
        action: "createOrder",
        customerName: name,
        phone: phone,
        lineId: lineId,
        address: address,
        transferName: tName,
        transferDate: tDate,
        transferTime: tTime,
        transferAmount: tAmt,
        qrPayload: qrPayload,
        items: cart,
        subtotal: subtotal,
        shipping: shipping,
        totalPrice: totalPrice,
        slipBase64: slipBase64
    };

    const res = await sendApiRequest(payload);
    if (res.success) {
        cart = [];
        localStorage.setItem("ss_cart", "[]");
        toggleCartDrawer(false);
        updateCartBadgeAndDrawer();
        
        document.getElementById("successOrderId").innerText = res.orderId;
        document.getElementById("successModalOverlay").style.display = "flex";
    } else {
        alert("❌ ไม่สามารถบันทึกออเดอร์ได้: " + (res.message || "เกิดข้อผิดพลาด"));
        btn.disabled = false;
        btn.innerText = "✅ ยืนยันการสั่งซื้อ";
    }
}

// ==========================================
// 6. เช็คสถานะ & แก้ไขข้อมูลลูกค้า
// ==========================================
function openTrackModal(defaultQuery) {
    document.getElementById("trackModalOverlay").style.display = "flex";
    if (defaultQuery) {
        document.getElementById("trackQueryInput").value = defaultQuery;
        searchCustomerOrders();
    }
}

function closeModal(id) {
    document.getElementById(id).style.display = "none";
}

function getStatusBadgeHtml(status) {
    if (status === "กำลังผลิต") return '<span class="status-badge status-prod">🔨 กำลังผลิต (ล็อกการแก้ไข)</span>';
    if (status === "จัดส่งแล้ว") return '<span class="status-badge status-ship">🚚 จัดส่งแล้ว</span>';
    if (status === "ยกเลิกแล้ว") return '<span class="status-badge status-cancel">❌ ยกเลิกแล้ว</span>';
    return '<span class="status-badge status-wait">⏳ รอตรวจสอบ / แก้ไขได้</span>';
}

function getSlipVerifyBadgeHtml(slipVerified, hasSlip) {
    if (!hasSlip) return '<span style="color:#ff8888; font-size:12px;">(ยังไม่แนบสลิป)</span>';
    if (slipVerified === "ยืนยันสลิปแล้ว") {
        return '<span style="background:#0b4a2d; color:#4dffaa; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:bold;">✔️ ร้านตรวจสอบสลิปแล้ว</span>';
    }
    return '<span style="background:#4a3800; color:#ffd04d; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:bold;">⏳ รอร้านตรวจสอบสลิป</span>';
}

async function searchCustomerOrders() {
    const q = document.getElementById("trackQueryInput").value.trim();
    if (!q) return alert("กรุณากรอกเลขออเดอร์ หรือเบอร์โทรศัพท์ครับ");

    const box = document.getElementById("trackResultsContainer");
    const btnSearch = document.getElementById("btnSearchOrder");
    btnSearch.disabled = true;
    btnSearch.innerText = "กำลังหา...";
    box.innerHTML = '<p style="text-align:center; color:#aaa;">⏳ กำลังค้นหาข้อมูล...</p>';

    const res = await sendApiRequest({ action: "trackOrder", query: q });
    btnSearch.disabled = false;
    btnSearch.innerText = "ค้นหา";

    if (!res.success || !res.orders || res.orders.length === 0) {
        box.innerHTML = '<p style="text-align:center; color:#ff8888;">ไม่พบข้อมูลออเดอร์ที่ค้นหาครับ</p>';
        return;
    }

    window._trackedOrdersCache = res.orders;
    let html = "";

    res.orders.forEach(function(o, idx) {
        const canEdit = o.status !== "กำลังผลิต" && o.status !== "จัดส่งแล้ว" && o.status !== "ยกเลิกแล้ว";
        const itemsList = (o.items || []).map(function(it) {
            return "<li>" + it.title + " (" + it.price + ".-)</li>";
        }).join("");

        const dispDate = cleanDisplayDateTime(o.transferDate, false);
        const dispTime = cleanDisplayDateTime(o.transferTime, true);

        const trackInfo = o.trackingNo ? '<br><b>📦 เลขพัสดุ:</b> <span style="color:#ffd04d; font-size:15px;">' + o.trackingNo + '</span>' : "";
        const slipInfo = o.slipUrl 
            ? '<br><b>🧾 สลิปที่แนบไว้:</b> ผู้โอน ' + (o.transferName || "-") + ' | วันที่ ' + dispDate + ' เวลา ' + dispTime + ' | ยอด ' + (o.transferAmount || "-") + '.- (<a href="' + o.slipUrl + '" target="_blank" style="color:#5cc4ff;">ดูรูปสลิป</a>) ' + getSlipVerifyBadgeHtml(o.slipVerified, true)
            : '<br><span style="color:#ff9999;">*ยังไม่ได้แนบสลิป (สามารถเลือกไฟล์สลิปด้านล่างเพื่อแจ้งโอนได้เลยครับ)</span>';

        const pfx = "edit_" + o.orderId;
        let editSection = "";
        if (canEdit) {
            editSection = '<div style="background:#1a1a1a; padding:12px; border-radius:8px; border:1px solid #333; margin-top:10px;">' +
                '<div style="font-size:12px; font-weight:bold; color:#c9a77e; margin-bottom:6px;">✏️ แก้ไขข้อมูลจัดส่ง / แจ้งโอนแนบสลิปตามหลัง</div>' +
                '<div class="form-row" style="margin-bottom:6px;">' +
                    '<div class="form-col"><input type="text" id="editName_' + o.orderId + '" class="form-input" value="' + (o.customerName || "") + '" placeholder="ชื่อผู้รับ"></div>' +
                    '<div class="form-col"><input type="text" id="editPhone_' + o.orderId + '" class="form-input" value="' + (o.phone || "") + '" placeholder="เบอร์โทร"></div>' +
                '</div>' +
                '<input type="text" id="editLine_' + o.orderId + '" class="form-input" value="' + (o.lineId || "") + '" style="margin-bottom:6px;" placeholder="Line ID (ไม่บังคับ)">' +
                '<textarea id="editAddr_' + o.orderId + '" class="form-textarea" style="margin-bottom:8px;">' + (o.address || "") + '</textarea>' +
                '<div style="font-size:12px; color:#00ba7c; margin:6px 0 4px 0; font-weight:bold;">🧾 เลือกรูปสลิปโอนเงิน (สแกนอ่านข้อมูลอัตโนมัติ):</div>' +
                '<input type="file" id="editSlip_' + o.orderId + '" accept="image/*" class="form-input" style="padding:5px; margin-bottom:6px;" onchange="handleSlipFileUpload(this, \'' + pfx + '\')">' +
                '<div id="' + pfx + '_scanStatus" class="scan-status-box"></div>' +
                '<input type="hidden" id="' + pfx + '_qrPayload" value="">' +
                '<div class="form-row" style="margin-bottom:6px;">' +
                    '<div class="form-col"><label class="form-label">ชื่อผู้โอน (จากสลิป/แก้ไขได้)</label><input type="text" id="' + pfx + '_transferName" class="form-input ocr-filled" value="' + (o.transferName || "") + '"></div>' +
                    '<div class="form-col"><label class="form-label">ยอดเงิน (บาท)</label><input type="text" id="' + pfx + '_transferAmt" class="form-input ocr-filled" value="' + (o.transferAmount || "") + '"></div>' +
                '</div>' +
                '<div class="form-row" style="margin-bottom:10px;">' +
                    '<div class="form-col"><label class="form-label">วันที่โอน</label><input type="text" id="' + pfx + '_transferDate" class="form-input ocr-filled" value="' + (dispDate === "-" ? "" : dispDate) + '"></div>' +
                    '<div class="form-col"><label class="form-label">เวลาโอน</label><input type="text" id="' + pfx + '_transferTime" class="form-input ocr-filled" value="' + (dispTime === "-" ? "" : dispTime) + '"></div>' +
                '</div>' +
                '<div style="display:flex; gap:6px; flex-wrap:wrap;">' +
                    '<button class="small-btn primary" id="btnSaveEdit_' + o.orderId + '" onclick="saveCustomerOrderEdit(\'' + o.orderId + '\')">💾 บันทึกการแก้ไข / แจ้งโอน</button>' +
                    '<button class="small-btn blue" onclick="reorderAndCancelByIdx(' + idx + ')">🔄 ดึงเข้าตะกร้าแก้ไขชิ้นงาน & สั่งใหม่</button>' +
                    '<button class="small-btn danger" style="margin-left:auto;" onclick="cancelCustomerOrder(\'' + o.orderId + '\')">❌ ยกเลิกออเดอร์</button>' +
                '</div>' +
            '</div>';
        }

        html += '<div class="order-card">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:8px; margin-bottom:10px;">' +
                '<div>' +
                    '<b style="font-size:16px; color:#00ba7c;">รหัสออเดอร์: ' + o.orderId + '</b>' +
                    '<div style="font-size:11px; color:#888;">วันที่สั่ง: ' + cleanDisplayDateTime(o.timestamp, false) + '</div>' +
                '</div>' +
                getStatusBadgeHtml(o.status) +
            '</div>' +
            '<div style="font-size:13px; margin-bottom:8px;">' +
                '<b>รายการที่สั่ง:</b> <ul style="margin:4px 0 8px 20px; padding:0;">' + itemsList + '</ul>' +
                '<b>ยอดรวมสุทธิ:</b> <span style="color:#00ba7c; font-weight:bold;">' + o.totalPrice + ' บาท</span>' +
                trackInfo + slipInfo +
            '</div>' +
            editSection +
        '</div>';
    });
    box.innerHTML = html;
}

async function saveCustomerOrderEdit(orderId) {
    if (isScanningSlip) {
        alert("กรุณารอให้ระบบสแกนรูปสลิปเสร็จสักครู่ครับ");
        return;
    }

    const pfx = "edit_" + orderId;
    const name = document.getElementById("editName_" + orderId).value.trim();
    const phone = document.getElementById("editPhone_" + orderId).value.trim();
    const line = document.getElementById("editLine_" + orderId).value.trim();
    const addr = document.getElementById("editAddr_" + orderId).value.trim();
    
    const qrPayload = document.getElementById(pfx + "_qrPayload").value.trim();
    const tName = document.getElementById(pfx + "_transferName").value.trim();
    const tDate = document.getElementById(pfx + "_transferDate").value.trim();
    const tTime = document.getElementById(pfx + "_transferTime").value.trim();
    const tAmt = document.getElementById(pfx + "_transferAmt").value.trim();
    
    const slipFile = document.getElementById("editSlip_" + orderId).files[0];

    const btn = document.getElementById("btnSaveEdit_" + orderId);
    btn.disabled = true;
    btn.innerText = slipFile ? "⏳ กำลังอัปโหลดสลิป..." : "⏳ กำลังบันทึก...";

    const slipBase64 = await fileToBase64(slipFile);

    const res = await sendApiRequest({
        action: "updateCustomerOrder",
        orderId: orderId,
        customerName: name,
        phone: phone,
        lineId: line,
        address: addr,
        transferName: tName,
        transferDate: tDate,
        transferTime: tTime,
        transferAmount: tAmt,
        qrPayload: qrPayload,
        slipBase64: slipBase64
    });

    if (res.success) {
        alert("✅ บันทึกข้อมูลเรียบร้อยแล้วครับ");
        searchCustomerOrders();
    } else {
        alert("❌ ไม่สามารถแก้ไขได้: " + res.message);
        btn.disabled = false;
        btn.innerText = "💾 บันทึกการแก้ไข / แจ้งโอน";
    }
}

async function cancelCustomerOrder(orderId) {
    if (!confirm("ต้องการยกเลิกออเดอร์ " + orderId + " ใช่หรือไม่ครับ?")) return;
    const res = await sendApiRequest({ action: "updateCustomerOrder", orderId: orderId, newStatus: "ยกเลิกแล้ว" });
    if (res.success) {
        alert("ยกเลิกออเดอร์เรียบร้อยแล้วครับ");
        searchCustomerOrders();
    } else {
        alert("ไม่สามารถยกเลิกได้: " + res.message);
    }
}

async function reorderAndCancelByIdx(idx) {
    const order = window._trackedOrdersCache && window._trackedOrdersCache[idx];
    if (!order) return;
    if (!confirm("ระบบจะทำการยกเลิกออเดอร์ใบเดิม และดึงพวงกุญแจทั้งหมดกลับเข้าตะกร้าเพื่อให้คุณแก้ไขและสั่งใหม่ ยืนยันหรือไม่ครับ?")) return;
    const res = await sendApiRequest({ action: "updateCustomerOrder", orderId: order.orderId, newStatus: "ยกเลิกแล้ว" });
    if (res.success) {
        cart = order.items || [];
        localStorage.setItem("ss_cart", JSON.stringify(cart));
        closeModal("trackModalOverlay");
        updateCartBadgeAndDrawer();
        toggleCartDrawer(true);
    } else {
        alert("ไม่สามารถดำเนินการได้: " + res.message);
    }
}

// ==========================================
// 7. ระบบแอดมิน & จัดการสต๊อกสีเส้นพลาสติกส่วนกลาง
// ==========================================
function handleGearClick() {
    if (isAdmin) {
        openAdminModal();
    } else {
        document.getElementById("loginUsername").value = "";
        document.getElementById("loginPassword").value = "";
        document.getElementById("loginModalOverlay").style.display = "flex";
        setTimeout(function() { document.getElementById("loginUsername").focus(); }, 100);
    }
}

async function submitAdminLogin() {
    const user = document.getElementById("loginUsername").value.trim();
    const pass = document.getElementById("loginPassword").value.trim();
    if (!user || !pass) return alert("กรุณากรอก Username และ Password ให้ครบถ้วนครับ");

    const btn = document.getElementById("btnLoginSubmit");
    const oldText = btn.innerText;
    btn.innerText = "⏳ กำลังตรวจสอบ...";
    btn.disabled = true;

    const res = await sendApiRequest({ action: "verifyAdmin", username: user, password: pass });

    btn.innerText = oldText;
    btn.disabled = false;

    if (res.success) {
        isAdmin = true;
        localStorage.setItem("ss_admin_logged", "true");
        localStorage.setItem("ss_admin_user", user);
        localStorage.setItem("ss_admin_pass", pass);
        localStorage.setItem("ss_admin_right", res.right || "Admin");
        
        closeModal("loginModalOverlay");
        refreshAdminAndCustomerUI();
        openAdminModal();
    } else {
        alert("❌ Username หรือ รหัสผ่านไม่ถูกต้องครับ");
    }
}

function adminLogout() {
    isAdmin = false;
    localStorage.removeItem("ss_admin_logged");
    localStorage.removeItem("ss_admin_user");
    localStorage.removeItem("ss_admin_pass");
    localStorage.removeItem("ss_admin_right");
    closeModal("adminModalOverlay");
    refreshAdminAndCustomerUI();
}

function openAdminModal() {
    const user = localStorage.getItem("ss_admin_user") || "Unknown";
    const right = localStorage.getItem("ss_admin_right") || "Admin";
    document.getElementById("adminModalTitle").innerHTML = '⚙️ แอดมิน: <span style="color:#fff;">' + user + '</span> <span style="font-size:12px; color:#00ba7c; border:1px solid #00ba7c; padding:2px 6px; border-radius:10px; margin-left:8px; vertical-align:middle;">สิทธิ์: ' + right + '</span>';

    document.getElementById("adminModalOverlay").style.display = "flex";
    switchAdminTab("orders");
}

function switchAdminTab(tab) {
    document.getElementById("tabBtnOrders").className = tab === "orders" ? "small-btn primary" : "small-btn";
    document.getElementById("tabBtnPricing").className = tab === "pricing" ? "small-btn primary" : "small-btn";
    document.getElementById("tabBtnColors").className = tab === "colors" ? "small-btn primary" : "small-btn";

    document.getElementById("adminOrdersSection").style.display = tab === "orders" ? "block" : "none";
    document.getElementById("adminPricingSection").style.display = tab === "pricing" ? "block" : "none";
    document.getElementById("adminColorsSection").style.display = tab === "colors" ? "block" : "none";

    if (tab === "orders") loadAdminOrdersList();
    if (tab === "pricing") renderAdminPricingForm();
    if (tab === "colors") renderAdminColorsForm();
}

function openAdminSlipInspectModal(orderIdx) {
    const o = window._adminOrdersCache && window._adminOrdersCache[orderIdx];
    if (!o) return;

    const dispDate = cleanDisplayDateTime(o.transferDate, false);
    const dispTime = cleanDisplayDateTime(o.transferTime, true);
    const isMatchedAmt = parseFloat(o.transferAmount) === parseFloat(o.totalPrice);

    const body = document.getElementById("verifySlipModalBody");
    body.innerHTML = [
        '<div style="background:#111; border:1px solid #333; border-radius:8px; padding:12px; margin-bottom:12px; font-size:13px; line-height:1.6;">',
        '    <div><b>รหัสออเดอร์:</b> <span style="color:#c9a77e;">' + o.orderId + '</span> | <b>ลูกค้า:</b> ' + o.customerName + '</div>',
        '    <div><b>ยอดที่ต้องชำระ:</b> <span style="color:#00ba7c; font-size:16px; font-weight:bold;">' + o.totalPrice + ' บาท</span></div>',
        '    <hr style="border:0; border-top:1px solid #2a2a2a; margin:8px 0;">',
        '    <div><b>ข้อมูลสลิป (OCR):</b></div>',
        '    <div>👤 <b>ชื่อผู้โอน:</b> ' + (o.transferName || "-") + '</div>',
        '    <div>📅 <b>วันที่โอน:</b> ' + dispDate + ' | ⏰ <b>เวลา:</b> ' + dispTime + '</div>',
        '    <div>💰 <b>ยอดโอน:</b> <span style="font-weight:bold; color:' + (isMatchedAmt ? '#00ba7c' : '#ffd04d') + ';">' + (o.transferAmount || "-") + ' บาท</span> ' + (isMatchedAmt ? '✔️ (ตรงกับยอดสั่งซื้อ)' : '⚠️ (กรุณาเทียบกับรูป)') + '</div>',
        '    <div>🔒 <b>QR Payload:</b> <span style="font-size:11px; color:#888;">' + (o.qrPayload ? "พบ QR Code (" + o.qrPayload.substring(0, 22) + "...)" : "ไม่พบ QR Code บนรูป") + '</span></div>',
        '</div>',
        '<div style="text-align:center; margin-bottom:15px;">',
        '    <a href="' + o.slipUrl + '" target="_blank" class="small-btn blue" style="display:inline-block; text-decoration:none; padding:8px 16px;">🖼️ คลิกเปิดดูรูปสลิปขนาดเต็ม (Google Drive)</a>',
        '</div>',
        '<div style="display:flex; gap:8px;">',
        '    <button class="btn-order-main" id="btnConfirmSlipValid" style="margin-top:0; flex:2; padding:12px;" onclick="adminConfirmSlipVerification(\'' + o.orderId + '\', true)">✅ ยืนยันสลิปถูกต้อง (& เริ่มผลิต)</button>',
        '    <button class="small-btn danger" style="flex:1; padding:12px;" onclick="adminConfirmSlipVerification(\'' + o.orderId + '\', false)">❌ สลิปไม่ถูกต้อง</button>',
        '</div>'
    ].join("\n");

    document.getElementById("verifySlipModalOverlay").style.display = "flex";
}

async function adminConfirmSlipVerification(orderId, isValid) {
    const user = localStorage.getItem("ss_admin_user") || "";
    const pass = localStorage.getItem("ss_admin_pass") || "";
    const btn = document.getElementById("btnConfirmSlipValid");
    if (btn) { btn.disabled = true; btn.innerText = "⏳ กำลังบันทึก..."; }

    const payload = {
        action: "updateAdminOrder",
        username: user,
        password: pass,
        orderId: orderId,
        slipVerified: isValid ? "ยืนยันสลิปแล้ว" : "สลิปมีปัญหา"
    };
    if (isValid) payload.status = "กำลังผลิต";

    const res = await sendApiRequest(payload);
    closeModal("verifySlipModalOverlay");
    if (res.success) {
        loadAdminOrdersList();
    } else {
        alert("เกิดข้อผิดพลาด: " + res.message);
    }
}

async function loadAdminOrdersList() {
    const box = document.getElementById("adminOrdersSection");
    box.innerHTML = '<p style="text-align:center; color:#aaa;">⏳ กำลังโหลดรายการออเดอร์ทั้งหมด...</p>';

    const user = localStorage.getItem("ss_admin_user") || "";
    const pass = localStorage.getItem("ss_admin_pass") || "";
    const res = await sendApiRequest({ action: "getAdminOrders", username: user, password: pass });

    if (!res.success || !res.orders || res.orders.length === 0) {
        box.innerHTML = '<p style="text-align:center; color:#888;">ยังไม่มีรายการสั่งซื้อเข้ามาครับ</p>';
        return;
    }
    window._adminOrdersCache = res.orders;
    
    let html = "";
    res.orders.forEach(function(o, orderIdx) {
        let itemsButtonsHtml = "";
        (o.items || []).forEach(function(it, itemIdx) {
            itemsButtonsHtml += '<div style="background:#181818; border:1px solid #333; border-radius:6px; padding:8px 10px; margin-top:6px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">' +
                '<div>' +
                    '<b>' + (itemIdx + 1) + '. ' + it.title + '</b> (' + it.price + '.-) ' +
                    '<span class="cart-color-dot" style="background:' + it.baseColor + '"></span> ' +
                    '<span class="cart-color-dot" style="background:' + it.topColor + '"></span>' +
                '</div>' +
                '<div style="display:flex; gap:5px;">' +
                    '<button class="small-btn" onclick="adminLoadCustomerModel(' + orderIdx + ', ' + itemIdx + ', null)">👁️ เปิดดู</button>' +
                    '<button class="small-btn primary" onclick="adminLoadCustomerModel(' + orderIdx + ', ' + itemIdx + ', \'stl\')">📦 .STL</button>' +
                    '<button class="small-btn blue" onclick="adminLoadCustomerModel(' + orderIdx + ', ' + itemIdx + ', \'3mf\')">🌈 .3MF</button>' +
                '</div>' +
            '</div>';
        });

        const isCollapsed = o.status === "จัดส่งแล้ว" || o.status === "ยกเลิกแล้ว";
        const detailsOpenAttr = isCollapsed ? "" : "open";
        const lineText = o.lineId ? " | <b>Line ID:</b> " + o.lineId : "";
        const dispDate = cleanDisplayDateTime(o.transferDate, false);
        const dispTime = cleanDisplayDateTime(o.transferTime, true);

        const slipText = o.slipUrl 
            ? '🧾 <b>สลิปโอนเงิน:</b> ผู้โอน <b>' + (o.transferName || "-") + '</b> | วันที่ ' + dispDate + ' เวลา ' + dispTime + ' | ยอด <span style="color:#00ba7c; font-weight:bold;">' + (o.transferAmount || "-") + '</span>.- ' +
              getSlipVerifyBadgeHtml(o.slipVerified, true) + ' ' +
              '<button class="small-btn warn" style="margin-left:6px;" onclick="openAdminSlipInspectModal(' + orderIdx + ')">🔍 ตรวจสอบ & ยืนยันสลิป</button>'
            : '<span style="color:#ff8888;">*ลูกค้ายังไม่ได้แนบสลิป</span>';

        html += '<details class="admin-order-details" ' + detailsOpenAttr + '>' +
            '<summary>' +
                '<div><b style="font-size:16px; color:#c9a77e;">' + o.orderId + '</b> | <b>' + o.customerName + '</b> ' + getSlipVerifyBadgeHtml(o.slipVerified, !!o.slipUrl) + '</div>' +
                getStatusBadgeHtml(o.status) +
            '</summary>' +
            '<div class="admin-order-content">' +
                '<div style="font-size:13px; color:#ccc; margin-bottom:8px; line-height: 1.7;">' +
                    '📞 <b>เบอร์โทร:</b> ' + o.phone + lineText + '<br>' +
                    '📍 <b>ที่อยู่จัดส่ง:</b> ' + o.address + '<br>' +
                    '💰 <b>ยอดสั่งซื้อสุทธิ:</b> <span style="color:#00ba7c; font-weight:bold; font-size:15px;">' + o.totalPrice + ' บาท</span> (ค่าสินค้า ' + o.subtotal + '.- + ค่าส่ง ' + o.shipping + '.-)<br>' +
                    slipText +
                    '<div style="font-size:11px; color:#888; margin-top:4px;">สั่งเมื่อ: ' + cleanDisplayDateTime(o.timestamp, false) + '</div>' +
                '</div>' +
                '<div>' + itemsButtonsHtml + '</div>' +
                '<div style="display:flex; gap:8px; align-items:center; margin-top:12px; padding-top:10px; border-top:1px solid #333;">' +
                    '<span style="font-size:12px; color:#aaa;">ปรับสถานะ:</span>' +
                    '<select id="admStatus_' + o.orderId + '" class="form-input" style="width:auto; padding:5px 8px;">' +
                        '<option value="รอตรวจสอบ" ' + (o.status === "รอตรวจสอบ" ? "selected" : "") + '>รอตรวจสอบ</option>' +
                        '<option value="กำลังผลิต" ' + (o.status === "กำลังผลิต" ? "selected" : "") + '>กำลังผลิต</option>' +
                        '<option value="จัดส่งแล้ว" ' + (o.status === "จัดส่งแล้ว" ? "selected" : "") + '>จัดส่งแล้ว</option>' +
                        '<option value="ยกเลิกแล้ว" ' + (o.status === "ยกเลิกแล้ว" ? "selected" : "") + '>ยกเลิกแล้ว</option>' +
                    '</select>' +
                    '<input type="text" id="admTrack_' + o.orderId + '" class="form-input" value="' + (o.trackingNo || "") + '" placeholder="ใส่เลขพัสดุจัดส่ง" style="width:160px; padding:5px 8px;">' +
                    '<button class="small-btn primary" id="btnAdmSave_' + o.orderId + '" onclick="adminUpdateOrderStatus(\'' + o.orderId + '\')">บันทึกสถานะ</button>' +
                '</div>' +
            '</div>' +
        '</details>';
    });
    box.innerHTML = html;
}

function adminLoadCustomerModel(orderIdx, itemIdx, autoDownloadFormat) {
    const order = window._adminOrdersCache[orderIdx];
    const item = order.items[itemIdx];
    if (!item || !item.params) return;

    const currentPage = getPageType();
    if (item.params.page === currentPage) {
        closeModal("adminModalOverlay");
        applyCapturedParams(item.params, autoDownloadFormat);
    } else {
        localStorage.setItem("ss_pending_load_params", JSON.stringify({
            state: item.params,
            autoDownload: autoDownloadFormat
        }));
        window.location.href = item.params.fileUrl;
    }
}

async function adminUpdateOrderStatus(orderId) {
    const status = document.getElementById("admStatus_" + orderId).value;
    const trackingNo = document.getElementById("admTrack_" + orderId).value.trim();
    const user = localStorage.getItem("ss_admin_user") || "";
    const pass = localStorage.getItem("ss_admin_pass") || "";

    const btn = document.getElementById("btnAdmSave_" + orderId);
    btn.disabled = true;
    btn.innerText = "กำลังบันทึก...";

    const res = await sendApiRequest({
        action: "updateAdminOrder",
        username: user,
        password: pass,
        orderId: orderId,
        status: status,
        trackingNo: trackingNo
    });
    if (res.success) {
        alert("✅ อัปเดตสถานะออเดอร์เรียบร้อยครับ");
        loadAdminOrdersList();
    } else {
        alert("เกิดข้อผิดพลาด: " + res.message);
        btn.disabled = false;
        btn.innerText = "บันทึกสถานะ";
    }
}

function renderAdminPricingForm() {
    const box = document.getElementById("adminPricingSection");
    box.innerHTML = '<h4 style="margin:0 0 10px 0; color:#00ba7c;">1. ราคาพวงกุญแจอักษรนูน & ขอบนูน (ตามจำนวนตัวอักษร)</h4>' +
        '<div class="price-grid">' +
            '<div><label class="form-label">อักษรนูน (1-5 ตัว)</label><input type="number" id="cfg_raised_1_5" class="form-input" value="' + priceConfig.raised_1_5 + '"></div>' +
            '<div><label class="form-label">อักษรนูน (6-10 ตัว)</label><input type="number" id="cfg_raised_6_10" class="form-input" value="' + priceConfig.raised_6_10 + '"></div>' +
            '<div><label class="form-label">อักษรนูน (11 ตัวขึ้นไป)</label><input type="number" id="cfg_raised_11_plus" class="form-input" value="' + priceConfig.raised_11_plus + '"></div>' +
            '<div><label class="form-label">ขอบนูน (1-5 ตัว)</label><input type="number" id="cfg_recessed_1_5" class="form-input" value="' + priceConfig.recessed_1_5 + '"></div>' +
            '<div><label class="form-label">ขอบนูน (6-10 ตัว)</label><input type="number" id="cfg_recessed_6_10" class="form-input" value="' + priceConfig.recessed_6_10 + '"></div>' +
            '<div><label class="form-label">ขอบนูน (11 ตัวขึ้นไป)</label><input type="number" id="cfg_recessed_11_plus" class="form-input" value="' + priceConfig.recessed_11_plus + '"></div>' +
        '</div>' +
        '<h4 style="margin:18px 0 10px 0; color:#00ba7c;">2. ราคาจี้ตัวอักษร & ป้ายห้อยกระเป๋า (Luggage Tag)</h4>' +
        '<div class="price-grid">' +
            '<div><label class="form-label">จี้ตัวอักษร 1 ตัว (บาท)</label><input type="number" id="cfg_letter_1" class="form-input" value="' + priceConfig.letter_1 + '"></div>' +
            '<div><label class="form-label">จี้ตัวอักษร 2 ตัว (บาท)</label><input type="number" id="cfg_letter_2" class="form-input" value="' + priceConfig.letter_2 + '"></div>' +
            '<div><label class="form-label">🧳 ป้ายห้อยกระเป๋า (ราคาเหมาทุกแบบ)</label><input type="number" id="cfg_luggage_flat" class="form-input" value="' + (priceConfig.luggage_flat || 89) + '"></div>' +
        '</div>' +
        '<h4 style="margin:18px 0 10px 0; color:#00ba7c;">3. ราคาป้ายชื่อสัตว์เลี้ยง (Pet Tag)</h4>' +
        '<div class="price-grid">' +
            '<div><label class="form-label">ทรงกระดูก (บาท)</label><input type="number" id="cfg_pet_bone" class="form-input" value="' + priceConfig.pet_bone + '"></div>' +
            '<div><label class="form-label">ทรงปลา (บาท)</label><input type="number" id="cfg_pet_fish" class="form-input" value="' + priceConfig.pet_fish + '"></div>' +
            '<div><label class="form-label">ทรงวงกลมปกติ (บาท)</label><input type="number" id="cfg_pet_circle" class="form-input" value="' + priceConfig.pet_circle + '"></div>' +
            '<div><label class="form-label">บวกเพิ่มชิป NFC (+บาท)</label><input type="number" id="cfg_pet_nfc_addon" class="form-input" value="' + priceConfig.pet_nfc_addon + '"></div>' +
        '</div>' +
        '<h4 style="margin:18px 0 10px 0; color:#00ba7c;">4. ค่าจัดส่ง & เลขบัญชีรับโอน</h4>' +
        '<div class="price-grid">' +
            '<div><label class="form-label">ค่าจัดส่งปกติ (บาท)</label><input type="number" id="cfg_shipping_fee" class="form-input" value="' + priceConfig.shipping_fee + '"></div>' +
            '<div><label class="form-label">สั่งครบกี่บาทส่งฟรี (บาท)</label><input type="number" id="cfg_free_shipping_min" class="form-input" value="' + priceConfig.free_shipping_min + '"></div>' +
        '</div>' +
        '<label class="form-label">ข้อมูลเลขบัญชีธนาคารที่แสดงในตะกร้า</label>' +
        '<input type="text" id="cfg_payment_info" class="form-input" value="' + priceConfig.payment_info + '">' +
        '<button class="btn-order-main" id="btnSavePricing" style="margin-top:18px; padding:12px;" onclick="saveAdminPricing()">💾 บันทึกราคาทั้งหมด</button>';
}

// หน้าจัดการสต๊อกสีเส้นพลาสติกส่วนกลาง
function renderAdminColorsForm() {
    const box = document.getElementById("adminColorsSection");
    if (!Array.isArray(priceConfig.filament_colors)) {
        priceConfig.filament_colors = window.defaultFilamentColors || [];
    }

    let rowsHtml = "";
    priceConfig.filament_colors.forEach(function(col, idx) {
        rowsHtml += '<div style="display:flex; gap:8px; align-items:center; background:#222; padding:8px 12px; border-radius:8px; border:1px solid #333; margin-bottom:8px;">' +
            '<input type="color" value="' + col.hex + '" onchange="updateFilamentColorItem(' + idx + ', \'hex\', this.value)" style="width:42px; height:34px; border:none; background:transparent; cursor:pointer;">' +
            '<input type="text" class="form-input" value="' + col.name + '" oninput="updateFilamentColorItem(' + idx + ', \'name\', this.value)" placeholder="ชื่อสี เช่น เหลือง (Yellow)" style="flex:1;">' +
            '<label style="display:flex; align-items:center; gap:5px; font-size:13px; color:#ccc; cursor:pointer; white-space:nowrap;">' +
                '<input type="checkbox" ' + (col.active !== false ? "checked" : "") + ' onchange="updateFilamentColorItem(' + idx + ', \'active\', this.checked)"> มีของในสต๊อก' +
            '</label>' +
            '<button class="small-btn danger" onclick="removeFilamentColorItem(' + idx + ')">🗑️ ลบ</button>' +
        '</div>';
    });

    box.innerHTML = '<h4 style="margin:0 0 6px 0; color:#00ba7c;">🎨 จัดการสีเส้นพลาสติกที่มีในสต๊อก (Filament Stock)</h4>' +
        '<p style="font-size:12px; color:#aaa; margin-top:0; margin-bottom:12px;">สีที่ติ๊ก "มีของในสต๊อก" จะไปแสดงให้ลูกค้ากดเลือกในหน้าสั่งทำป้ายห้อยกระเป๋า (และชิ้นงานอื่นๆ ในอนาคต) โดยอัตโนมัติครับ</p>' +
        '<div>' + rowsHtml + '</div>' +
        '<div style="display:flex; gap:10px; margin-top:12px;">' +
            '<button class="small-btn blue" style="padding:10px 16px;" onclick="addNewFilamentColorItem()">➕ เพิ่มสีใหม่เข้าสต๊อก</button>' +
            '<button class="btn-order-main" id="btnSaveColors" style="margin-top:0; flex:1; padding:11px;" onclick="saveAdminColorsStock()">💾 บันทึกสต๊อกสีเส้นพลาสติก</button>' +
        '</div>';
}

function updateFilamentColorItem(idx, key, val) {
    if (priceConfig.filament_colors && priceConfig.filament_colors[idx]) {
        priceConfig.filament_colors[idx][key] = val;
    }
}

function addNewFilamentColorItem() {
    if (!Array.isArray(priceConfig.filament_colors)) priceConfig.filament_colors = [];
    priceConfig.filament_colors.push({ name: "สีใหม่", hex: "#00ba7c", active: true });
    renderAdminColorsForm();
}

function removeFilamentColorItem(idx) {
    priceConfig.filament_colors.splice(idx, 1);
    renderAdminColorsForm();
}

async function saveAdminColorsStock() {
    const btn = document.getElementById("btnSaveColors");
    btn.disabled = true;
    btn.innerText = "⏳ กำลังบันทึกสต๊อกสี...";

    localStorage.setItem("ss_price_config", JSON.stringify(priceConfig));
    if (typeof window.refreshFilamentSwatchesUI === "function") {
        window.refreshFilamentSwatchesUI();
    }

    const user = localStorage.getItem("ss_admin_user") || "";
    const pass = localStorage.getItem("ss_admin_pass") || "";
    const res = await sendApiRequest({ action: "saveConfig", username: user, password: pass, config: priceConfig });

    btn.disabled = false;
    btn.innerText = "💾 บันทึกสต๊อกสีเส้นพลาสติก";

    if (res.success) {
        alert("✅ บันทึกสต๊อกสีเส้นพลาสติกเรียบร้อยแล้วครับ!");
    } else {
        alert("❌ เกิดข้อผิดพลาด: " + (res.message || "ไม่สามารถบันทึกได้"));
    }
}

async function saveAdminPricing() {
    const newCfg = {
        raised_1_5: Number(document.getElementById("cfg_raised_1_5").value),
        raised_6_10: Number(document.getElementById("cfg_raised_6_10").value),
        raised_11_plus: Number(document.getElementById("cfg_raised_11_plus").value),
        recessed_1_5: Number(document.getElementById("cfg_recessed_1_5").value),
        recessed_6_10: Number(document.getElementById("cfg_recessed_6_10").value),
        recessed_11_plus: Number(document.getElementById("cfg_recessed_11_plus").value),
        letter_1: Number(document.getElementById("cfg_letter_1").value),
        letter_2: Number(document.getElementById("cfg_letter_2").value),
        luggage_flat: Number(document.getElementById("cfg_luggage_flat").value),
        pet_bone: Number(document.getElementById("cfg_pet_bone").value),
        pet_fish: Number(document.getElementById("cfg_pet_fish").value),
        pet_circle: Number(document.getElementById("cfg_pet_circle").value),
        pet_nfc_addon: Number(document.getElementById("cfg_pet_nfc_addon").value),
        shipping_fee: Number(document.getElementById("cfg_shipping_fee").value),
        free_shipping_min: Number(document.getElementById("cfg_free_shipping_min").value),
        payment_info: document.getElementById("cfg_payment_info").value.trim(),
        filament_colors: priceConfig.filament_colors || []
    };

    const btn = document.getElementById("btnSavePricing");
    btn.disabled = true;
    btn.innerText = "กำลังบันทึก...";

    priceConfig = newCfg;
    localStorage.setItem("ss_price_config", JSON.stringify(priceConfig));
    updateOrderButtonPrice();

    const user = localStorage.getItem("ss_admin_user") || "";
    const pass = localStorage.getItem("ss_admin_pass") || "";
    const res = await sendApiRequest({ action: "saveConfig", username: user, password: pass, config: newCfg });
    
    btn.disabled = false;
    btn.innerText = "💾 บันทึกราคาทั้งหมด";

    if (res.success) {
        alert("✅ บันทึกการตั้งค่าราคาเรียบร้อยแล้วครับ!");
    } else {
        alert("❌ เกิดข้อผิดพลาด: " + (res.message || "ไม่สามารถบันทึกราคาได้"));
    }
}

// ==========================================
// 8. ฟังก์ชันเชื่อมต่อ API
// ==========================================
async function sendApiRequest(data) {
    if (GAS_WEB_APP_URL && GAS_WEB_APP_URL.startsWith("http")) {
        try {
            const response = await fetch(GAS_WEB_APP_URL, {
                method: "POST",
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (err) {
            return { success: false, message: err.message };
        }
    }

    let localOrders = JSON.parse(localStorage.getItem("ss_mock_orders") || "[]");
    if (data.action === "verifyAdmin") {
        const isMatch = (data.username === "ss3d" && data.password === "1234");
        return { success: isMatch, right: isMatch ? "admin" : "" };
    }
    if (data.action === "getConfig") {
        const saved = localStorage.getItem("ss_price_config");
        if (saved) priceConfig = JSON.parse(saved);
        return { success: true, config: priceConfig };
    }
    if (data.action === "saveConfig") {
        localStorage.setItem("ss_price_config", JSON.stringify(data.config));
        return { success: true };
    }
    if (data.action === "createOrder") {
        if (data.qrPayload) {
            const isDup = localOrders.some(function(o) { return o.qrPayload === data.qrPayload; });
            if (isDup) return { success: false, message: "สลิปนี้ถูกใช้งานไปแล้ว" };
        }
        const orderId = "SS-" + Math.floor(100000 + Math.random() * 900000);
        localOrders.push({
            orderId: orderId,
            timestamp: new Date().toLocaleString("th-TH"),
            customerName: data.customerName,
            phone: data.phone,
            lineId: data.lineId || "",
            address: data.address,
            transferName: data.transferName || "",
            transferDate: data.transferDate || "",
            transferTime: data.transferTime || "",
            transferAmount: data.transferAmount || "",
            qrPayload: data.qrPayload || "",
            items: data.items,
            subtotal: data.subtotal,
            shipping: data.shipping,
            totalPrice: data.totalPrice,
            slipUrl: data.slipBase64 ? "(แนบสลิปแล้ว)" : "",
            status: "รอตรวจสอบ",
            trackingNo: "",
            slipVerified: data.slipBase64 ? "รอตรวจสลิป" : "ยังไม่แนบสลิป"
        });
        localStorage.setItem("ss_mock_orders", JSON.stringify(localOrders));
        return { success: true, orderId: orderId };
    }
    if (data.action === "trackOrder") {
        const q = data.query.toLowerCase().replace(/[^a-z0-9]/g, "");
        const found = localOrders.filter(function(o) {
            return o.orderId.toLowerCase().replace(/[^a-z0-9]/g, "") === q ||
                   o.phone.replace(/[^0-9]/g, "").includes(q);
        });
        return { success: true, orders: found.reverse() };
    }
    if (data.action === "updateCustomerOrder") {
        if (data.qrPayload) {
            const isDup = localOrders.some(function(o) { return o.orderId !== data.orderId && o.qrPayload === data.qrPayload; });
            if (isDup) return { success: false, message: "สลิปนี้ถูกใช้งานไปแล้ว" };
        }
        const idx = localOrders.findIndex(function(o) { return o.orderId === data.orderId; });
        if (idx === -1) return { success: false, message: "ไม่พบออเดอร์" };
        if (localOrders[idx].status === "กำลังผลิต" || localOrders[idx].status === "จัดส่งแล้ว") {
            return { success: false, message: "ออเดอร์ล็อกแล้ว" };
        }
        if (data.newStatus === "ยกเลิกแล้ว") {
            localOrders[idx].status = "ยกเลิกแล้ว";
        } else {
            if (data.customerName) localOrders[idx].customerName = data.customerName;
            if (data.phone) localOrders[idx].phone = data.phone;
            if (data.lineId !== undefined) localOrders[idx].lineId = data.lineId;
            if (data.address) localOrders[idx].address = data.address;
            if (data.transferName !== undefined) localOrders[idx].transferName = data.transferName;
            if (data.transferDate !== undefined) localOrders[idx].transferDate = data.transferDate;
            if (data.transferTime !== undefined) localOrders[idx].transferTime = data.transferTime;
            if (data.transferAmount !== undefined) localOrders[idx].transferAmount = data.transferAmount;
            if (data.qrPayload) localOrders[idx].qrPayload = data.qrPayload;
            if (data.slipBase64) {
                localOrders[idx].slipUrl = "(แนบสลิปใหม่แล้ว)";
                localOrders[idx].slipVerified = "รอตรวจสลิป";
            }
        }
        localStorage.setItem("ss_mock_orders", JSON.stringify(localOrders));
        return { success: true };
    }
    if (data.action === "getAdminOrders") {
        return { success: true, orders: localOrders.slice().reverse() };
    }
    if (data.action === "updateAdminOrder") {
        const idx = localOrders.findIndex(function(o) { return o.orderId === data.orderId; });
        if (idx !== -1) {
            if (data.status) localOrders[idx].status = data.status;
            if (data.trackingNo !== undefined) localOrders[idx].trackingNo = data.trackingNo;
            if (data.slipVerified !== undefined) localOrders[idx].slipVerified = data.slipVerified;
            localStorage.setItem("ss_mock_orders", JSON.stringify(localOrders));
        }
        return { success: true };
    }
    return { success: true };
}

window.addEventListener("DOMContentLoaded", async function() {
    const savedCfg = localStorage.getItem("ss_price_config");
    if (savedCfg) {
        try {
            const parsed = JSON.parse(savedCfg);
            priceConfig = Object.assign(priceConfig, parsed);
        } catch(e) {}
    }
    injectShopUI();
    if (typeof window.refreshFilamentSwatchesUI === "function") {
        window.refreshFilamentSwatchesUI();
    }

    const cfgRes = await sendApiRequest({ action: "getConfig" });
    if (cfgRes.success && cfgRes.config) {
        priceConfig = Object.assign(priceConfig, cfgRes.config);
        localStorage.setItem("ss_price_config", JSON.stringify(priceConfig));
        updateOrderButtonPrice();
        if (typeof window.refreshFilamentSwatchesUI === "function") {
            window.refreshFilamentSwatchesUI();
        }
    }

    setInterval(updateModelDimensionDisplay, 400);

    const pending = localStorage.getItem("ss_pending_load_params");
    if (pending) {
        localStorage.removeItem("ss_pending_load_params");
        try {
            const parsed = JSON.parse(pending);
            setTimeout(function() { applyCapturedParams(parsed.state, parsed.autoDownload); }, 300);
        } catch (e) {}
    }
});