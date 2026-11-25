const STORAGE_KEY = "student-profile";
const DEFAULT_PROFILE = {
    name: "Nguyễn Minh Anh",
    className: "10A2",
    school: "THPT Ánh Dương",
    birthday: "2009-05-12",
    gender: "Nữ",
    hobbies: "Đọc sách, vẽ và nghe nhạc",
    subjects: "Văn, Sinh học",
    email: "minhanh@example.com",
    phone: "090 123 4567",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&h=500&q=85"
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
const shareableFields = Object.keys(DEFAULT_PROFILE);
let pendingPhoto = null;
let photoCleared = false;

function setFieldVisibility(fields, profile) {
    const hasValue = (field) => fields.has(field) && Boolean(profile[field].trim());
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

function renderProfile(profile, visibleFields) {
    const displayName = profile.name.trim();
    const nameParts = displayName.split(/\s+/);
    const fields = visibleFields || new Set(shareableFields);
    const nameIsVisible = fields.has("name") && Boolean(displayName);
    document.title = nameIsVisible ? `Hồ sơ học sinh | ${displayName}` : "Hồ sơ học sinh";
    document.querySelector("#greeting-name").textContent = nameIsVisible
        ? nameParts.slice(-2).join(" ")
        : fields.has("name") ? "bạn" : "học sinh";
    document.querySelector("#student-name").textContent = nameIsVisible ? displayName : "Hồ sơ học sinh";
    document.querySelector("#student-class").textContent = `Lớp ${profile.className}`;
    document.querySelector("#student-school").textContent = `Trường ${profile.school}`;
    const birthday = profile.birthday.trim();
    const birthdayDate = birthday ? new Date(`${birthday}T00:00:00`) : null;
    document.querySelector("#student-birthday").textContent = birthdayDate && !Number.isNaN(birthdayDate.getTime())
        ? new Intl.DateTimeFormat("vi-VN", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(birthdayDate)
        : birthday;
    document.querySelector("#student-gender").textContent = profile.gender;
    document.querySelector("#student-hobbies").textContent = profile.hobbies;
    document.querySelector("#student-email").textContent = profile.email;
    document.querySelector("#email-link").href = `mailto:${profile.email}`;
    document.querySelector("#student-phone").textContent = profile.phone;
    document.querySelector("#phone-link").href = `tel:${profile.phone.replace(/[^\d+]/g, "")}`;

    const subjects = document.querySelector("#student-subjects");
    subjects.replaceChildren();
    profile.subjects.split(",").map((subject) => subject.trim()).filter(Boolean).forEach((subject) => {
        const pill = document.createElement("span");
        pill.className = "subject-pill";
        pill.textContent = subject;
        subjects.append(pill);
    });

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

    setFieldVisibility(fields, profile);
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

function decodeSharedProfile() {
    if (!window.location.hash.startsWith("#share=")) return null;

    const encoded = window.location.hash.slice("#share=".length);
    const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
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
    formFields.namedItem("name").focus();
});

document.querySelector("#cancel-edit").addEventListener("click", closeEditor);

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

    const publicProfile = fields.reduce((result, field) => {
        result[field] = profile[field];
        return result;
    }, {});
    const payload = { version: 1, fields, profile: publicProfile };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    const encoded = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    const url = new URL(window.location.href);
    url.hash = `share=${encoded}`;

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
});
