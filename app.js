const STORAGE_KEY = "student-profile";
const DEFAULT_PROFILE = {
    name: "",
    className: "",
    school: "",
    birthday: "",
    gender: "",
    hobbies: "",
    subjects: "",
    email: "",
    phone: "",
    photo: ""
};

// Chữ nhắc hiển thị khi mục còn trống (chỉ trên trang của chính mình, không hiện trong link chia sẻ)
const PLACEHOLDERS = {
    name: "Vui lòng nhập tên",
    className: "Vui lòng nhập lớp",
    school: "Vui lòng nhập trường",
    birthday: "Vui lòng nhập ngày sinh",
    gender: "Vui lòng chọn giới tính",
    hobbies: "Vui lòng nhập sở thích",
    subjects: "Vui lòng nhập môn yêu thích",
    email: "Vui lòng nhập email",
    phone: "Vui lòng nhập số điện thoại"
};

const form = document.querySelector("#profile-form");
const editToggle = document.querySelector("#edit-toggle");
const formMessage = document.querySelector("#form-message");
const formFields = form.elements;
const photoPreview = document.querySelector("#photo-preview");
const clearPhotoButton = document.querySelector("#clear-photo");
const portrait = document.querySelector("#portrait");
const portraitPlaceholder = document.querySelector("#portrait-placeholder");
const portraitBadge = document.querySelector("#portrait-badge");
const shareToggle = document.querySelector("#share-toggle");
const sharePanel = document.querySelector("#share-panel");
const shareMessage = document.querySelector("#share-message");
const shareResult = document.querySelector("#share-result");
const shareUrlInput = document.querySelector("#share-url");
const openDesignerLink = document.querySelector("#open-qr-designer");
const nativeShareButton = document.querySelector("#native-share");
const heartButton = document.querySelector("#heart-button");
const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
const smoothScroll = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
const shareableFields = Object.keys(DEFAULT_PROFILE);
let pendingPhoto = null;
let photoCleared = false;

function setFieldVisibility(fields, profile, isOwner) {
    // Trang của mình: hiện mọi mục (mục trống hiện chữ nhắc). Trang chia sẻ: chỉ hiện mục có dữ liệu.
    const hasValue = (field) => fields.has(field) && (isOwner || Boolean(profile[field].trim()));
    const show = (selector, field) => {
        document.querySelector(selector).hidden = !hasValue(field);
    };

    show("#student-class", "className");
    show("#student-school", "school");
    document.querySelector(".portrait-wrap").hidden = !fields.has("photo");
    show("#email-link", "email");
    show("#phone-link", "phone");
    ["birthday", "gender", "hobbies", "subjects"].forEach((field) => {
        document.querySelector(`#student-${field}`).closest(".info-row").hidden = !hasValue(field);
    });

    const hasClass = hasValue("className");
    const hasSchool = hasValue("school");
    document.querySelector("#meta-separator").hidden = !(hasClass && hasSchool);
    document.querySelector(".student-meta").hidden = !(hasClass || hasSchool);
    document.querySelector(".info-section").hidden = !["birthday", "gender", "hobbies", "subjects"]
        .some(hasValue);
    document.querySelector(".contact-section").hidden = !(hasValue("email") || hasValue("phone"));
}

function showMessage(message, isError) {
    formMessage.textContent = message;
    formMessage.classList.toggle("is-error", isError);
}

function getProfile() {
    const savedProfile = localStorage.getItem(STORAGE_KEY);
    if (!savedProfile) return DEFAULT_PROFILE;

    const profile = JSON.parse(savedProfile);
    const hasAllFields = Object.keys(DEFAULT_PROFILE).every(
        (key) => typeof profile[key] === "string"
    );
    if (!hasAllFields) throw new Error("Dữ liệu hồ sơ đã lưu không hợp lệ.");

    return profile;
}

function setText(selector, field, text) {
    const element = document.querySelector(selector);
    const isEmpty = !text;
    element.textContent = isEmpty ? PLACEHOLDERS[field] : text;
    element.classList.toggle("is-empty", isEmpty);
}

function setLink(selector, href) {
    const link = document.querySelector(selector);
    if (href) link.href = href;
    else link.removeAttribute("href");
}

function renderProfile(profile, visibleFields) {
    const isOwner = !visibleFields;
    const displayName = profile.name.trim();
    const nameParts = displayName.split(/\s+/);
    const fields = visibleFields || new Set(shareableFields);
    const nameIsVisible = fields.has("name") && Boolean(displayName);
    document.title = nameIsVisible ? `Hồ sơ học sinh | ${displayName}` : "Hồ sơ học sinh";
    document.querySelector("#greeting-name").textContent = nameIsVisible
        ? nameParts.slice(-2).join(" ")
        : fields.has("name") ? "bạn" : "học sinh";
    if (nameIsVisible || isOwner) {
        setText("#student-name", "name", displayName);
    } else {
        document.querySelector("#student-name").textContent = "Hồ sơ học sinh";
        document.querySelector("#student-name").classList.remove("is-empty");
    }
    const className = profile.className.trim();
    const school = profile.school.trim();
    setText("#student-class", "className", className && `Lớp ${className}`);
    setText("#student-school", "school", school && `Trường ${school}`);
    const birthday = profile.birthday.trim();
    const birthdayDate = birthday ? new Date(`${birthday}T00:00:00`) : null;
    setText("#student-birthday", "birthday", birthdayDate && !Number.isNaN(birthdayDate.getTime())
        ? new Intl.DateTimeFormat("vi-VN", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(birthdayDate)
        : birthday);
    setText("#student-gender", "gender", profile.gender.trim());
    setText("#student-hobbies", "hobbies", profile.hobbies.trim());
    const email = profile.email.trim();
    const phone = profile.phone.trim();
    setText("#student-email", "email", email);
    setLink("#email-link", email && `mailto:${email}`);
    setText("#student-phone", "phone", phone);
    setLink("#phone-link", phone && `tel:${phone.replace(/[^\d+]/g, "")}`);

    const subjects = document.querySelector("#student-subjects");
    subjects.replaceChildren();
    const subjectList = profile.subjects.split(",").map((subject) => subject.trim()).filter(Boolean);
    subjects.classList.toggle("is-empty", !subjectList.length);
    if (!subjectList.length) subjects.textContent = PLACEHOLDERS.subjects;
    subjectList.forEach((subject) => {
        const pill = document.createElement("span");
        pill.className = "subject-pill";
        pill.textContent = subject;
        subjects.append(pill);
    });

    // Hồ sơ còn trống hoàn toàn → làm nút "Sửa thông tin" nổi bật để nhắc điền
    document.body.classList.toggle(
        "profile-empty",
        isOwner && shareableFields.every((field) => !profile[field].trim())
    );

    const portrait = document.querySelector(".portrait");
    const hasPhoto = Boolean(profile.photo.trim());
    portrait.hidden = !hasPhoto;
    portraitPlaceholder.hidden = hasPhoto;
    portraitBadge.hidden = !hasPhoto;
    if (hasPhoto) {
        portrait.src = profile.photo;
    } else {
        portrait.removeAttribute("src");
    }
    portrait.alt = nameIsVisible ? `Ảnh chân dung của ${displayName}` : "Ảnh đại diện của học sinh";

    setFieldVisibility(fields, profile, isOwner);
}

function fillForm(profile) {
    Object.keys(DEFAULT_PROFILE).forEach((key) => {
        formFields.namedItem(key).value = key === "photo" && profile[key].startsWith("data:image/")
            ? ""
            : profile[key];
    });
    pendingPhoto = profile.photo.startsWith("data:image/") ? profile.photo : null;
    photoCleared = false;
    photoPreview.hidden = !profile.photo;
    if (profile.photo) photoPreview.src = profile.photo;
    else photoPreview.removeAttribute("src");
    clearPhotoButton.hidden = !profile.photo;
    formFields.namedItem("photoFile").value = "";
}

function closeEditor() {
    form.hidden = true;
    editToggle.hidden = false;
    editToggle.setAttribute("aria-expanded", "false");
    showMessage("", false);
}

function isValidPhotoUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            try {
                const maxDimension = 512;
                const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
                canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                const context = canvas.getContext("2d");
                if (!context) throw new Error("Không thể xử lý ảnh trên thiết bị này.");
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("Không thể chuyển ảnh sang định dạng lưu trữ."));
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                        if (typeof reader.result !== "string") {
                            reject(new Error("Không thể đọc dữ liệu ảnh."));
                            return;
                        }
                        resolve(reader.result);
                    };
                    reader.onerror = () => reject(new Error("Không thể đọc tệp ảnh."));
                    reader.readAsDataURL(blob);
                }, "image/jpeg", 0.82);
            } catch (error) {
                reject(error);
            }
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Tệp đã chọn không phải ảnh hợp lệ."));
        };
        image.src = objectUrl;
    });
}

// Định dạng link gọn (#s=): mã base36 cho biết các mục được chọn, theo sau là giá trị từng mục,
// ngăn cách bằng ký tự \u001f, rồi mã hóa base64url. Không chứa tên trường nên ngắn hơn nhiều.
const SHARE_SEPARATOR = "\u001f";

function toBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(encoded) {
    const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function encodeCompactShare(fields, sourceProfile) {
    const mask = shareableFields.reduce(
        (result, field, index) => (fields.includes(field) ? result | (1 << index) : result),
        0
    );
    const values = shareableFields.filter((field) => fields.includes(field)).map((field) => {
        const value = sourceProfile[field];
        // Bỏ "https://" ở ảnh để link ngắn thêm; khi đọc sẽ tự thêm lại
        return field === "photo" ? value.replace(/^https:\/\//, "") : value;
    });
    return toBase64Url([mask.toString(36), ...values].join(SHARE_SEPARATOR));
}

function decodeCompactShare(encoded) {
    const [maskText, ...values] = fromBase64Url(encoded).split(SHARE_SEPARATOR);
    const mask = Number.parseInt(maskText, 36);
    if (!Number.isInteger(mask) || mask <= 0 || mask >= 1 << shareableFields.length) {
        throw new Error("Đường dẫn chia sẻ không hợp lệ.");
    }
    const fields = shareableFields.filter((field, index) => mask & (1 << index));
    if (values.length !== fields.length) throw new Error("Đường dẫn chia sẻ không hợp lệ.");
    const sharedProfile = {};
    fields.forEach((field, index) => {
        const value = values[index];
        sharedProfile[field] = field === "photo" && value && !/^https?:\/\//.test(value)
            ? `https://${value}`
            : value;
    });
    return { version: 1, fields, profile: sharedProfile };
}

function decodeSharedProfile() {
    const hash = window.location.hash;
    let payload;
    if (hash.startsWith("#s=")) {
        payload = decodeCompactShare(hash.slice("#s=".length));
    } else if (hash.startsWith("#share=")) {
        // Link kiểu cũ vẫn mở được
        payload = JSON.parse(fromBase64Url(hash.slice("#share=".length)));
    } else {
        return null;
    }
    const fields = payload.fields;

    if (
        payload.version !== 1 ||
        !Array.isArray(fields) ||
        !fields.length ||
        new Set(fields).size !== fields.length ||
        fields.some((field) => !shareableFields.includes(field)) ||
        !payload.profile ||
        typeof payload.profile !== "object" ||
        Object.keys(payload.profile).some((field) => !fields.includes(field))
    ) {
        throw new Error("Đường dẫn chia sẻ không hợp lệ.");
    }

    const validValues = fields.every(
        (field) => typeof payload.profile[field] === "string" && payload.profile[field].length > 0
    );
    if (!validValues) throw new Error("Đường dẫn chia sẻ thiếu thông tin.");
    if (fields.includes("photo") && !isValidPhotoUrl(payload.profile.photo)) {
        throw new Error("Đường dẫn chia sẻ có ảnh không hợp lệ.");
    }

    return { fields: new Set(fields), profile: { ...DEFAULT_PROFILE, ...payload.profile } };
}

let profile;
const pageNote = document.querySelector(".page-note");
try {
    const sharedProfile = decodeSharedProfile();
    if (sharedProfile) {
        profile = sharedProfile.profile;
        renderProfile(profile, sharedProfile.fields);
        editToggle.hidden = true;
        shareToggle.hidden = true;
        heartButton.hidden = false;
        document.body.classList.add("is-shared");
        pageNote.textContent = "Bạn đang xem hồ sơ được chia sẻ. Chỉ các thông tin được chọn mới hiển thị.";
    } else {
        profile = getProfile();
        renderProfile(profile);
    }
} catch (error) {
    profile = DEFAULT_PROFILE;
    renderProfile(profile);
    fillForm(profile);
    form.hidden = false;
    editToggle.hidden = true;
    editToggle.setAttribute("aria-expanded", "true");
    showMessage(`Không thể đọc hồ sơ đã lưu: ${error.message}`, true);
}

editToggle.addEventListener("click", () => {
    fillForm(profile);
    form.hidden = false;
    editToggle.hidden = true;
    editToggle.setAttribute("aria-expanded", "true");
    showMessage("", false);
    if (isTouchDevice) {
        // Trên điện thoại: cuộn tới form, không bật bàn phím ngay
        form.scrollIntoView({ behavior: smoothScroll, block: "start" });
    } else {
        formFields.namedItem("name").focus();
    }
});

document.querySelector("#cancel-edit").addEventListener("click", closeEditor);

document.querySelector("#reset-profile").addEventListener("click", () => {
    if (!window.confirm("Xóa toàn bộ thông tin đã lưu trên trình duyệt này? Không thể hoàn tác.")) return;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        showMessage(`Không thể xóa hồ sơ: ${error.message}`, true);
        return;
    }
    profile = { ...DEFAULT_PROFILE };
    renderProfile(profile);
    closeEditor();
    window.scrollTo({ top: 0, behavior: smoothScroll });
});

portrait.addEventListener("error", () => {
    portrait.hidden = true;
    portraitPlaceholder.hidden = false;
    portraitBadge.hidden = true;
});

photoPreview.addEventListener("error", () => {
    photoPreview.hidden = true;
    showMessage("Không thể xem ảnh này. Hãy kiểm tra lại đường dẫn hoặc chọn tệp ảnh khác.", true);
});

formFields.namedItem("photo").addEventListener("input", (event) => {
    pendingPhoto = null;
    formFields.namedItem("photoFile").value = "";
    const url = event.currentTarget.value.trim();
    photoCleared = !url;
    clearPhotoButton.hidden = !url;
    if (url && isValidPhotoUrl(url)) {
        photoPreview.hidden = false;
        photoPreview.src = url;
    } else {
        photoPreview.hidden = true;
        photoPreview.removeAttribute("src");
    }
});

clearPhotoButton.addEventListener("click", () => {
    pendingPhoto = null;
    photoCleared = true;
    formFields.namedItem("photo").value = "";
    formFields.namedItem("photoFile").value = "";
    photoPreview.hidden = true;
    photoPreview.removeAttribute("src");
    clearPhotoButton.hidden = true;
    showMessage("Ảnh sẽ được gỡ khi bạn lưu hồ sơ.", false);
});

formFields.namedItem("photoFile").addEventListener("change", async (event) => {
    const file = event.currentTarget.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        showMessage("Hãy chọn một tệp ảnh.", true);
        event.currentTarget.value = "";
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showMessage("Ảnh cần nhỏ hơn 10 MB.", true);
        event.currentTarget.value = "";
        return;
    }

    const saveButton = form.querySelector('[type="submit"]');
    saveButton.disabled = true;
    showMessage("Đang xử lý ảnh…", false);
    try {
        pendingPhoto = await compressImage(file);
        photoCleared = false;
        formFields.namedItem("photo").value = "";
        photoPreview.src = pendingPhoto;
        photoPreview.hidden = false;
        clearPhotoButton.hidden = false;
        showMessage("Đã chọn ảnh. Bấm Lưu thông tin để áp dụng.", false);
    } catch (error) {
        showMessage(`Không thể xử lý ảnh: ${error.message}`, true);
    } finally {
        saveButton.disabled = false;
    }
});

shareToggle.addEventListener("click", () => {
    sharePanel.hidden = false;
    shareToggle.hidden = true;
    shareToggle.setAttribute("aria-expanded", "true");
    shareResult.hidden = true;
    shareMessage.textContent = "";
    sharePanel.scrollIntoView({ behavior: smoothScroll, block: "start" });
});

sharePanel.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
        shareResult.hidden = true;
        shareMessage.textContent = "";
    });
});

document.querySelector("#close-share").addEventListener("click", () => {
    sharePanel.hidden = true;
    shareToggle.hidden = false;
    shareToggle.setAttribute("aria-expanded", "false");
});

document.querySelector("#create-share").addEventListener("click", () => {
    const selectedFields = Array.from(sharePanel.querySelectorAll('input[type="checkbox"]:checked'))
        .map((checkbox) => checkbox.value);
    const includesLocalPhoto = selectedFields.includes("photo") && profile.photo.startsWith("data:image/");
    const fields = selectedFields.filter((field) => (
        Boolean(profile[field].trim()) && !(field === "photo" && includesLocalPhoto)
    ));
    if (!fields.length) {
        shareMessage.textContent = includesLocalPhoto
            ? "Ảnh tải lên chỉ lưu trên máy; hãy chọn thêm thông tin khác hoặc dùng URL ảnh công khai."
            : "Chọn ít nhất một thông tin đã nhập để tạo link.";
        shareMessage.classList.add("is-error");
        shareResult.hidden = true;
        return;
    }

    const url = new URL(window.location.href);
    url.search = "";
    if (url.protocol !== "file:") url.pathname = url.pathname.replace(/index\.html$/, "");
    url.hash = `s=${encodeCompactShare(fields, profile)}`;

    try {
        const qr = qrcode(0, "M");
        qr.addData(url.href);
        qr.make();
        const qrImage = document.createElement("img");
        qrImage.src = qr.createDataURL(5, 4);
        qrImage.alt = "Mã QR dẫn đến hồ sơ đã chọn";
        const qrOutput = document.querySelector("#qr-output");
        qrOutput.replaceChildren(qrImage);
        shareUrlInput.value = url.href;
        const designerUrl = new URL("qr-designer.html", window.location.href);
        designerUrl.searchParams.set("target", url.href);
        openDesignerLink.href = designerUrl.href;
        shareResult.hidden = false;
        nativeShareButton.hidden = typeof navigator.share !== "function";
        shareResult.scrollIntoView({ behavior: smoothScroll, block: "nearest" });
        shareMessage.classList.remove("is-error");
        const notices = [];
        if (selectedFields.length !== fields.length) {
            notices.push("Thông tin để trống hoặc ảnh tải lên đã được bỏ khỏi link.");
        }
        notices.push(window.location.protocol === "file:"
            ? "Link/QR chỉ dùng trên máy này cho đến khi trang được đăng lên hosting."
            : "Đã tạo link và mã QR.");
        shareMessage.textContent = notices.join(" ");
    } catch (error) {
        shareMessage.textContent = `Không thể tạo mã QR: ${error.message}`;
        shareMessage.classList.add("is-error");
        shareResult.hidden = true;
    }
});

document.querySelector("#copy-share").addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(shareUrlInput.value);
        shareMessage.classList.remove("is-error");
        shareMessage.textContent = "Đã sao chép link.";
    } catch (error) {
        shareUrlInput.focus();
        shareUrlInput.select();
        shareMessage.textContent = `Không thể tự sao chép link (${error.message}); hãy sao chép đường dẫn trong ô phía trên.`;
        shareMessage.classList.add("is-error");
    }
});

nativeShareButton.addEventListener("click", async () => {
    try {
        await navigator.share({
            title: document.title,
            text: "Xem hồ sơ của mình nhé ✨",
            url: shareUrlInput.value
        });
    } catch (error) {
        if (error.name === "AbortError") return;
        shareMessage.textContent = `Không thể mở bảng chia sẻ (${error.message}); hãy dùng nút Sao chép link.`;
        shareMessage.classList.add("is-error");
    }
});

let heartTimer;
heartButton.addEventListener("click", () => {
    const label = document.querySelector("#heart-label");
    label.textContent = "Đã gửi tim! 💞";
    window.clearTimeout(heartTimer);
    heartTimer = window.setTimeout(() => {
        label.textContent = "Thả tim cho bạn ấy";
    }, 1600);
});

form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const updatedProfile = Object.keys(DEFAULT_PROFILE).reduce((result, key) => {
        result[key] = formFields.namedItem(key).value.trim();
        return result;
    }, {});

    updatedProfile.photo = photoCleared ? "" : pendingPhoto || updatedProfile.photo;
    if (
        updatedProfile.photo &&
        !updatedProfile.photo.startsWith("data:image/") &&
        !isValidPhotoUrl(updatedProfile.photo)
    ) {
        showMessage("Đường dẫn ảnh cần bắt đầu bằng http:// hoặc https://.", true);
        return;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfile));
    } catch (error) {
        showMessage(`Không thể lưu hồ sơ trong trình duyệt: ${error.message}`, true);
        return;
    }

    profile = updatedProfile;
    renderProfile(profile);
    closeEditor();
    document.querySelector(".profile-card").scrollIntoView({ behavior: smoothScroll, block: "start" });
    document.dispatchEvent(new CustomEvent("profile:saved"));
});
