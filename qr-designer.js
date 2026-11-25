const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1700;
const canvas = document.querySelector("#card-canvas");
const context = canvas.getContext("2d");
const targetInput = document.querySelector("#target-url");
const linkMessage = document.querySelector("#link-message");
const backgroundFileInput = document.querySelector("#background-file");
const backgroundMessage = document.querySelector("#background-message");
const downloadButton = document.querySelector("#download-png");
const exportMessage = document.querySelector("#export-message");
const showUrlOption = document.querySelector("#url-option");
const showUrlCheckbox = document.querySelector("#show-url");
const zoomInput = document.querySelector("#background-zoom");
const xInput = document.querySelector("#background-x");
const yInput = document.querySelector("#background-y");
const clearBackgroundButton = document.querySelector("#clear-background");

let currentQr = null;
let backgroundImage = null;
let backgroundObjectUrl = null;

function setMessage(element, message, isError) {
    element.textContent = message;
    element.classList.toggle("is-error", isError);
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
}

function wrapText(ctx, text, maxWidth, maxLines) {
    const lines = [];
    let line = "";
    for (const character of text) {
        const next = line + character;
        if (ctx.measureText(next).width > maxWidth && line) {
            lines.push(line);
            line = character;
            if (lines.length === maxLines) break;
        } else {
            line = next;
        }
    }

    if (line && lines.length < maxLines) lines.push(line);
    const displayedText = lines.join("");
    if (displayedText.length < text.length && lines.length) {
        lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, -1)}…`;
    }
    return lines;
}

function drawBackground() {
    context.fillStyle = document.querySelector("#background-color").value;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (backgroundImage) {
        const scale = Math.max(
            CANVAS_WIDTH / backgroundImage.naturalWidth,
            CANVAS_HEIGHT / backgroundImage.naturalHeight
        ) * Number(zoomInput.value) / 100;
        const imageWidth = backgroundImage.naturalWidth * scale;
        const imageHeight = backgroundImage.naturalHeight * scale;
        const x = (CANVAS_WIDTH - imageWidth) * Number(xInput.value) / 100;
        const y = (CANVAS_HEIGHT - imageHeight) * Number(yInput.value) / 100;
        context.drawImage(backgroundImage, x, y, imageWidth, imageHeight);
    }

    const opacity = Number(document.querySelector("#background-tint").value) / 100;
    const overlay = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    overlay.addColorStop(0, `rgba(46, 24, 65, ${opacity})`);
    overlay.addColorStop(1, `rgba(90, 43, 107, ${opacity * 0.8})`);
    context.fillStyle = overlay;
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawHeader() {
    const title = document.querySelector("#card-title").value.trim() || "Hồ sơ học sinh";
    const subtitle = document.querySelector("#card-subtitle").value.trim();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#fff6d8";
    context.font = "700 24px 'Be Vietnam Pro', sans-serif";
    context.fillText("✦  HỒ SƠ CÁ NHÂN  ✦", CANVAS_WIDTH / 2, 145);

    context.fillStyle = "#ffffff";
    context.font = "800 58px 'Be Vietnam Pro', sans-serif";
    context.fillText(title, CANVAS_WIDTH / 2, 242, 920);

    if (subtitle) {
        context.fillStyle = "rgba(255,255,255,0.9)";
        context.font = "500 28px 'Be Vietnam Pro', sans-serif";
        context.fillText(subtitle, CANVAS_WIDTH / 2, 320, 920);
    }
}

function drawQrCard() {
    if (!currentQr) {
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = "rgba(255,255,255,0.95)";
        drawRoundedRect(context, 160, 650, 760, 340, 34);
        context.fill();
        context.fillStyle = "#855a96";
        context.font = "700 28px 'Be Vietnam Pro', sans-serif";
        context.fillText("Dán link hồ sơ để tạo mã QR", CANVAS_WIDTH / 2, 820, 680);
        return;
    }

    const isMiddle = document.querySelector('input[name="qr-position"]:checked').value === "middle";
    const showUrl = isMiddle && showUrlCheckbox.checked;
    const qrSize = Number(document.querySelector("#qr-size").value) * 20;
    const url = targetInput.value.trim();
    context.font = "500 18px 'Be Vietnam Pro', sans-serif";
    const urlLines = showUrl ? wrapText(context, url, 900, 12) : [];
    const padding = 44;
    const linkHeight = showUrl ? 42 + urlLines.length * 26 : 0;
    const cardHeight = qrSize + padding * 2 + linkHeight;
    const cardTop = isMiddle ? 850 - cardHeight / 2 : CANVAS_HEIGHT - 78 - cardHeight;
    const cardWidth = qrSize + padding * 2;
    const cardLeft = (CANVAS_WIDTH - cardWidth) / 2;
    const qrLeft = (CANVAS_WIDTH - qrSize) / 2;
    const qrTop = cardTop + padding;

    context.save();
    context.shadowColor = "rgba(31, 16, 43, 0.25)";
    context.shadowBlur = 34;
    context.shadowOffsetY = 12;
    context.fillStyle = "#ffffff";
    drawRoundedRect(context, cardLeft, cardTop, cardWidth, cardHeight, 34);
    context.fill();
    context.restore();

    const moduleCount = currentQr.getModuleCount();
    const quietZone = 4;
    const totalModules = moduleCount + quietZone * 2;
    const moduleSize = Math.floor(qrSize / totalModules);
    const actualQrSize = moduleSize * totalModules;
    const matrixLeft = Math.round(CANVAS_WIDTH / 2 - actualQrSize / 2);
    const matrixTop = Math.round(qrTop + (qrSize - actualQrSize) / 2);
    context.fillStyle = "#17131b";
    for (let row = 0; row < moduleCount; row += 1) {
        for (let column = 0; column < moduleCount; column += 1) {
            if (!currentQr.isDark(row, column)) continue;
            context.fillRect(
                matrixLeft + (column + quietZone) * moduleSize,
                matrixTop + (row + quietZone) * moduleSize,
                moduleSize,
                moduleSize
            );
        }
    }

    if (showUrl) {
        context.fillStyle = "#66556e";
        context.font = "500 18px 'Be Vietnam Pro', sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        const firstLineY = qrTop + qrSize + 42;
        urlLines.forEach((line, index) => {
            context.fillText(line, CANVAS_WIDTH / 2, firstLineY + index * 26, 900);
        });
    }
}

function drawFooter() {
    const isMiddle = document.querySelector('input[name="qr-position"]:checked').value === "middle";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "rgba(255,255,255,0.92)";
    context.font = "700 24px 'Be Vietnam Pro', sans-serif";
    context.fillText(
        isMiddle ? "QUÉT MÃ ĐỂ MỞ HỒ SƠ" : "THÔNG TIN CÁ NHÂN",
        CANVAS_WIDTH / 2,
        isMiddle ? 1530 : 430
    );
    context.fillStyle = "rgba(255,255,255,0.75)";
    context.font = "500 20px 'Be Vietnam Pro', sans-serif";
    context.fillText("Tỏa sáng theo cách của bạn  ✨", CANVAS_WIDTH / 2, isMiddle ? 1580 : 475);
}

function drawCard() {
    drawBackground();
    drawHeader();
    drawQrCard();
    drawFooter();
}

function updateLink() {
    const value = targetInput.value.trim();
    currentQr = null;
    downloadButton.disabled = true;
    if (!value) {
        setMessage(linkMessage, "Dán link chia sẻ từ trang hồ sơ để tạo mã QR.", false);
        drawCard();
        return;
    }

    try {
        const parsedUrl = new URL(value);
        if (!["http:", "https:", "file:"].includes(parsedUrl.protocol)) {
            throw new Error("Đường dẫn cần bắt đầu bằng http://, https:// hoặc file://.");
        }
        currentQr = qrcode(0, "M");
        currentQr.addData(value);
        currentQr.make();
        downloadButton.disabled = false;
        setMessage(
            linkMessage,
            parsedUrl.protocol === "file:"
                ? "Link đang trỏ tới file trên máy này; cần hosting để chia sẻ với người khác."
                : "Link hợp lệ. Mã QR đã sẵn sàng.",
            false
        );
    } catch (error) {
        currentQr = null;
        setMessage(linkMessage, `Không thể tạo mã QR: ${error.message}`, true);
    }
    drawCard();
}

function updateControlLabels() {
    document.querySelector("#qr-size-value").value = `${document.querySelector("#qr-size").value} mm`;
    document.querySelector("#zoom-value").value = `${zoomInput.value}%`;
    document.querySelector("#x-value").value = `${xInput.value}%`;
    document.querySelector("#y-value").value = `${yInput.value}%`;
    document.querySelector("#tint-value").value = `${document.querySelector("#background-tint").value}%`;

    const isMiddle = document.querySelector('input[name="qr-position"]:checked').value === "middle";
    showUrlOption.hidden = !isMiddle;
}

function updatePreview() {
    updateControlLabels();
    drawCard();
}

function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function writeUint32(bytes, offset, value) {
    bytes[offset] = (value >>> 24) & 0xff;
    bytes[offset + 1] = (value >>> 16) & 0xff;
    bytes[offset + 2] = (value >>> 8) & 0xff;
    bytes[offset + 3] = value & 0xff;
}

async function addPrintResolution(pngBlob) {
    const png = new Uint8Array(await pngBlob.arrayBuffer());
    const type = new TextEncoder().encode("pHYs");
    const chunk = new Uint8Array(21);
    writeUint32(chunk, 0, 9);
    chunk.set(type, 4);
    writeUint32(chunk, 8, 20000);
    writeUint32(chunk, 12, 20000);
    chunk[16] = 1;
    writeUint32(chunk, 17, crc32(chunk.subarray(4, 17)));

    let insertAt = 8;
    while (insertAt + 8 < png.length) {
        const length = (
            (png[insertAt] << 24) |
            (png[insertAt + 1] << 16) |
            (png[insertAt + 2] << 8) |
            png[insertAt + 3]
        ) >>> 0;
        if (String.fromCharCode(...png.subarray(insertAt + 4, insertAt + 8)) === "IDAT") break;
        insertAt += length + 12;
    }
    if (insertAt + 8 >= png.length) throw new Error("Không đọc được dữ liệu PNG.");

    const result = new Uint8Array(png.length + chunk.length);
    result.set(png.subarray(0, insertAt), 0);
    result.set(chunk, insertAt);
    result.set(png.subarray(insertAt), insertAt + chunk.length);
    return new Blob([result], { type: "image/png" });
}

document.querySelector("#target-url").addEventListener("input", updateLink);
document.querySelector("#card-title").addEventListener("input", updatePreview);
document.querySelector("#card-subtitle").addEventListener("input", updatePreview);
document.querySelector("#qr-size").addEventListener("input", updatePreview);
document.querySelector("#background-color").addEventListener("input", updatePreview);
document.querySelector("#background-tint").addEventListener("input", updatePreview);
zoomInput.addEventListener("input", updatePreview);
xInput.addEventListener("input", updatePreview);
yInput.addEventListener("input", updatePreview);
document.querySelectorAll('input[name="qr-position"]').forEach((input) => {
    input.addEventListener("change", updatePreview);
});
showUrlCheckbox.addEventListener("change", updatePreview);

backgroundFileInput.addEventListener("change", (event) => {
    const file = event.currentTarget.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        setMessage(backgroundMessage, "Chọn một tệp ảnh làm nền.", true);
        event.currentTarget.value = "";
        return;
    }
    if (file.size > 20 * 1024 * 1024) {
        setMessage(backgroundMessage, "Ảnh nền cần nhỏ hơn 20 MB.", true);
        event.currentTarget.value = "";
        return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
        if (backgroundObjectUrl) URL.revokeObjectURL(backgroundObjectUrl);
        backgroundObjectUrl = objectUrl;
        backgroundImage = image;
        [zoomInput, xInput, yInput].forEach((input) => {
            input.disabled = false;
        });
        clearBackgroundButton.disabled = false;
        setMessage(backgroundMessage, "Đã tải nền. Dùng thanh căn chỉnh để chọn vùng ảnh.", false);
        updatePreview();
    };
    image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        setMessage(backgroundMessage, "Không thể mở ảnh này. Hãy thử chọn tệp khác.", true);
    };
    image.src = objectUrl;
});

clearBackgroundButton.addEventListener("click", () => {
    if (backgroundObjectUrl) URL.revokeObjectURL(backgroundObjectUrl);
    backgroundObjectUrl = null;
    backgroundImage = null;
    backgroundFileInput.value = "";
    [zoomInput, xInput, yInput].forEach((input) => {
        input.disabled = true;
    });
    clearBackgroundButton.disabled = true;
    setMessage(backgroundMessage, "Đã xóa ảnh nền.", false);
    updatePreview();
});

document.querySelector("#download-png").addEventListener("click", async () => {
    if (!currentQr) return;
    downloadButton.disabled = true;
    setMessage(exportMessage, "Đang xuất ảnh PNG…", false);
    try {
        const canvasBlob = await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error("Trình duyệt không tạo được ảnh PNG."));
            }, "image/png");
        });
        const pngBlob = await addPrintResolution(canvasBlob);
        const downloadUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = "the-qr-ho-so-54x85mm.png";
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);
        setMessage(exportMessage, "Đã tải thẻ PNG 54 × 85 mm về máy.", false);
    } catch (error) {
        setMessage(exportMessage, `Không thể xuất PNG: ${error.message}`, true);
    } finally {
        downloadButton.disabled = false;
    }
});

const initialTarget = new URLSearchParams(window.location.search).get("target");
if (initialTarget) targetInput.value = initialTarget;
updateControlLabels();
updateLink();
