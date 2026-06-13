const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const previewContainer = document.getElementById("previewContainer");
const uploadBtn = document.getElementById("uploadBtn");
const status = document.getElementById("status");
const gallery = document.getElementById("gallery");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxPrev = document.getElementById("lightboxPrev");
const lightboxNext = document.getElementById("lightboxNext");
const lightboxDelete = document.getElementById("lightboxDelete");
const nameInput = document.getElementById("nameInput");
const lightboxUploader = document.getElementById("lightboxUploader");

// Supabase setup
const supabaseUrl = "https://spauexdntavolspackhm.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwYXVleGRudGF2b2xzcGFja2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMDAzNjQsImV4cCI6MjA5NTY3NjM2NH0.IQ1fHQZbXaNvpWuc5AQIXLqiLHD2INgQqiC5VBlB0fE";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let selectedFiles = [];
let galleryImages = [];
let currentImageIndex = 0;
let currentUser = null;
let touchStartX = 0;
let touchCurrentX = 0;
let isTouching = false;
let isSliding = false;

/* ---------------- AUTH ---------------- */

async function ensureUser() {
    const { data: sessionData } = await supabaseClient.auth.getSession();

    if (sessionData.session) {
        currentUser = sessionData.session.user;
        return currentUser;
    }

    const { data, error } = await supabaseClient.auth.signInAnonymously();

    if (error) {
        console.error("Anoniem inloggen mislukt:", error);
        status.textContent = "Kan gebruiker niet voorbereiden voor upload.";
        return null;
    }

    currentUser = data.user;
    return currentUser;
}

async function getCurrentUser() {
    const { data } = await supabaseClient.auth.getSession();
    currentUser = data.session?.user || null;
}

/* ---------------- FILE SELECT ---------------- */

uploadArea.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    selectedFiles = Array.from(files);
    renderPreviews();
}

function renderPreviews() {
    previewContainer.innerHTML = "";

    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const div = document.createElement("div");
            div.className = "preview";

            const img = document.createElement("img");
            img.src = e.target.result;

            const removeBtn = document.createElement("button");
            removeBtn.className = "preview-remove";
            removeBtn.type = "button";
            removeBtn.innerHTML = "&times;";
            removeBtn.title = "Foto verwijderen";

            removeBtn.addEventListener("click", () => {
                removeSelectedFile(index);
            });

            div.appendChild(img);
            div.appendChild(removeBtn);
            previewContainer.appendChild(div);
        };

        reader.readAsDataURL(file);
    });
}

function removeSelectedFile(index) {
    selectedFiles.splice(index, 1);
    renderPreviews();

    if (!selectedFiles.length) {
        fileInput.value = "";
    }
}

/* ---------------- DRAG & DROP ---------------- */

uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");

    handleFiles(e.dataTransfer.files);
});

/* ---------------- UPLOAD ---------------- */

uploadBtn.addEventListener("click", async () => {
    if (!selectedFiles.length) {
        status.textContent = "Kies eerst een of meer foto's.";
        return;
    }

    const user = await ensureUser();

    if (!user) {
        return;
    }

    status.textContent = "Uploaden...";

    for (const file of selectedFiles) {
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fullPath = `uploads/${Date.now()}-${safeFileName}`;
        const uploaderName = nameInput.value.trim();

        const { error: uploadError } = await supabaseClient
            .storage
            .from("wedding-photos")
            .upload(fullPath, file, {
                contentType: file.type
            });

        if (uploadError) {
            console.error(uploadError);
            status.textContent = "Upload fout: " + uploadError.message;
            return;
        }

        const { error: databaseError } = await supabaseClient
            .from("wedding_photos")
            .insert({
                file_path: fullPath,
                uploader_name: uploaderName || null,
                user_id: user.id
            });

        if (databaseError) {
            console.error(databaseError);
            status.textContent = "Foto geüpload, maar naam opslaan ging mis.";
            return;
        }
    }

    status.textContent = "Klaar!";
    selectedFiles = [];
    fileInput.value = "";
    previewContainer.innerHTML = "";

    await loadImages();
});

/* ---------------- LIGHTBOX ---------------- */

function openLightbox(index) {
    if (!galleryImages.length) return;
    if (!galleryImages[index]) return;

    currentImageIndex = index;

    lightboxImage.style.transform = "";
    lightboxImage.style.transition = "";
    lightboxImage.src = galleryImages[currentImageIndex].url;

    showUploaderName();
    updateDeleteButton();

    lightbox.classList.add("active");
}

function closeLightbox() {
    lightbox.classList.remove("active");
    lightboxImage.src = "";
    lightboxUploader.textContent = "";
    lightboxDelete.classList.remove("visible");
    lightboxDelete.hidden = true;

    const lightboxInfo = document.querySelector(".lightbox-info");
    lightboxInfo.classList.remove("has-delete");
}

function showUploaderName() {
    const uploaderName = galleryImages[currentImageIndex]?.uploaderName;

    lightboxUploader.textContent = uploaderName
        ? `Geüpload door ${uploaderName}`
        : "";
}

function updateDeleteButton() {
    const photo = galleryImages[currentImageIndex];
    const canDelete = currentUser && photo?.userId === currentUser.id;

    lightboxDelete.classList.toggle("visible", canDelete);
    lightboxDelete.hidden = !canDelete;

    const lightboxInfo = document.querySelector(".lightbox-info");
    lightboxInfo.classList.toggle("has-delete", canDelete);
}

/* ---------------- CAROUSEL ---------------- */

function slideToImage(newIndex, direction) {
    if (!galleryImages.length || isSliding) return;
    if (!galleryImages[newIndex]) return;

    isSliding = true;

    const slideOutClass = direction === "next"
        ? "slide-out-left"
        : "slide-out-right";

    const slideInClass = direction === "next"
        ? "slide-in-right"
        : "slide-in-left";

    lightboxImage.style.transform = "";
    lightboxImage.style.transition = "";
    lightboxImage.classList.add(slideOutClass);

    setTimeout(() => {
        currentImageIndex = newIndex;
        lightboxImage.src = galleryImages[currentImageIndex].url;

        showUploaderName();
        updateDeleteButton();

        lightboxImage.style.transform = "";
        lightboxImage.style.transition = "";

        lightboxImage.classList.remove(slideOutClass);
        lightboxImage.classList.add(slideInClass);

        requestAnimationFrame(() => {
            lightboxImage.classList.remove(slideInClass);
        });

        setTimeout(() => {
            lightboxImage.style.transform = "";
            lightboxImage.style.transition = "";
            isSliding = false;
        }, 230);
    }, 180);
}

function showNextImage() {
    if (!galleryImages.length) return;

    const nextIndex = (currentImageIndex + 1) % galleryImages.length;
    slideToImage(nextIndex, "next");
}

function showPreviousImage() {
    if (!galleryImages.length) return;

    const previousIndex =
        (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;

    slideToImage(previousIndex, "previous");
}

/* ---------------- LOAD GALLERY ---------------- */

async function loadImages() {
    const { data, error } = await supabaseClient
        .from("wedding_photos")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Galerij laden mislukt:", error);
        return;
    }

    gallery.innerHTML = "";
    galleryImages = [];

    data.forEach(photo => {
        const { data: urlData } = supabaseClient
            .storage
            .from("wedding-photos")
            .getPublicUrl(photo.file_path);

        const img = document.createElement("img");
        img.src = urlData.publicUrl;

        img.onload = () => {
            const imageIndex = galleryImages.length;

            galleryImages.push({
                id: photo.id,
                url: urlData.publicUrl,
                filePath: photo.file_path,
                uploaderName: photo.uploader_name,
                userId: photo.user_id
            });

            img.addEventListener("click", () => {
                openLightbox(imageIndex);
            });

            gallery.appendChild(img);
        };

        img.onerror = () => {
            img.remove();
        };
    });
}

/* ---------------- DELETE ---------------- */

lightboxDelete.addEventListener("click", async () => {
    const photo = galleryImages[currentImageIndex];

    if (!photo) return;
    if (!currentUser || photo.userId !== currentUser.id) return;

    const confirmDelete = confirm("Weet je zeker dat je deze foto wilt verwijderen?");

    if (!confirmDelete) return;

    const { error: storageError } = await supabaseClient
        .storage
        .from("wedding-photos")
        .remove([photo.filePath]);

    if (storageError) {
        console.error(storageError);
        status.textContent = "Foto verwijderen uit opslag mislukt.";
        return;
    }

    const { error: databaseError } = await supabaseClient
        .from("wedding_photos")
        .delete()
        .eq("id", photo.id);

    if (databaseError) {
        console.error(databaseError);
        status.textContent = "Foto verwijderen uit database mislukt.";
        return;
    }

    closeLightbox();
    await loadImages();

    status.textContent = "Foto verwijderd.";
});

/* ---------------- LIGHTBOX EVENTS ---------------- */

lightboxClose.addEventListener("click", closeLightbox);

lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) {
        closeLightbox();
    }
});

lightboxNext.addEventListener("click", showNextImage);
lightboxPrev.addEventListener("click", showPreviousImage);

/* ---------------- SWIPE EVENTS ---------------- */

lightboxImage.addEventListener("touchstart", (e) => {
    if (!lightbox.classList.contains("active")) return;
    if (!galleryImages.length) return;

    isTouching = true;
    touchStartX = e.touches[0].clientX;
    touchCurrentX = touchStartX;

    lightboxImage.style.transition = "none";
});

lightboxImage.addEventListener("touchmove", (e) => {
    if (!isTouching) return;
    if (!galleryImages.length) return;

    touchCurrentX = e.touches[0].clientX;
    const distance = touchCurrentX - touchStartX;

    lightboxImage.style.transform = `translateX(${distance}px) scale(0.98)`;
});

lightboxImage.addEventListener("touchend", () => {
    if (!isTouching) return;

    isTouching = false;

    if (!galleryImages.length) {
        lightboxImage.style.transform = "";
        lightboxImage.style.transition = "";
        return;
    }

    const swipeDistance = touchCurrentX - touchStartX;

    lightboxImage.style.transition = "";
    lightboxImage.style.transform = "";

    if (swipeDistance > 60) {
        showNextImage();
        return;
    }

    if (swipeDistance < -60) {
        showPreviousImage();
        return;
    }
});

/* ---------------- INIT ---------------- */

window.addEventListener("load", async () => {
    await getCurrentUser();
    await loadImages();
});

setInterval(loadImages, 10000);