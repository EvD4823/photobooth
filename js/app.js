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
const nameInput = document.getElementById("nameInput");
const lightboxUploader = document.getElementById("lightboxUploader");

let galleryImages = [];
let currentImageIndex = 0;
let touchStartX = 0;
let touchCurrentX = 0;
let isTouching = false;

// Supabase setup
const supabaseUrl = "https://spauexdntavolspackhm.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwYXVleGRudGF2b2xzcGFja2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMDAzNjQsImV4cCI6MjA5NTY3NjM2NH0.IQ1fHQZbXaNvpWuc5AQIXLqiLHD2INgQqiC5VBlB0fE";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let selectedFiles = [];

/* ---------------- FILE SELECT ---------------- */

uploadArea.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    selectedFiles = Array.from(files);
    previewContainer.innerHTML = "";

    selectedFiles.forEach(file => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const div = document.createElement("div");
            div.className = "preview";

            const img = document.createElement("img");
            img.src = e.target.result;

            div.appendChild(img);
            previewContainer.appendChild(div);
        };

        reader.readAsDataURL(file);
    });
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

    status.textContent = "Uploaden...";

    for (const file of selectedFiles) {

        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fullPath = `uploads/${Date.now()}-${safeFileName}`;

        const { error } = await supabaseClient
            .storage
            .from("wedding-photos")
            .upload(fullPath, file, {
                contentType: file.type
            });

        if (error) {
            console.error(error);
            status.textContent = "Upload fout: " + error.message;
            return;
        }
        const uploaderName = nameInput.value.trim();

const { error: databaseError } = await supabaseClient
    .from("wedding_photos")
    .insert({
        file_path: fullPath,
        uploader_name: uploaderName || null
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

/* ---------------- LOAD GALLERY ---------------- */

function openLightbox(index) {
    if (!galleryImages.length) return;
    if (!galleryImages[index]) return;

    currentImageIndex = index;

    lightboxImage.style.transform = "";
    lightboxImage.style.transition = "";
    lightboxImage.src = galleryImages[currentImageIndex].url;

    showUploaderName();

    lightbox.classList.add("active");
}

function closeLightbox() {
    lightbox.classList.remove("active");
    lightboxImage.src = "";
}

let isSliding = false;

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

        galleryImages.push({
            url: urlData.publicUrl,
            uploaderName: photo.uploader_name
        });

        const imageIndex = galleryImages.length - 1;

        const img = document.createElement("img");
        img.src = urlData.publicUrl;

        img.onerror = () => {
            img.remove();
        };

        img.addEventListener("click", () => {
            openLightbox(imageIndex);
        });

        gallery.appendChild(img);
    });
}

lightboxClose.addEventListener("click", closeLightbox);

lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) {
        closeLightbox();
    }
});

lightboxNext.addEventListener("click", showNextImage);
lightboxPrev.addEventListener("click", showPreviousImage);

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

function showUploaderName() {
    const uploaderName = galleryImages[currentImageIndex].uploaderName;

    lightboxUploader.textContent = uploaderName
        ? `Geüpload door ${uploaderName}`
        : "";
}

window.addEventListener("load", loadImages);
setInterval(loadImages, 10000);