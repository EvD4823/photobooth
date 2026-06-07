const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const previewContainer = document.getElementById("previewContainer");
const uploadBtn = document.getElementById("uploadBtn");
const status = document.getElementById("status");
const gallery = document.getElementById("gallery");

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
    }

    status.textContent = "Klaar!";
    selectedFiles = [];
    fileInput.value = "";
    previewContainer.innerHTML = "";

    await loadImages();
});

/* ---------------- LOAD GALLERY ---------------- */

async function loadImages() {
    status.textContent = "Galerij laden...";

    const { data, error } = await supabaseClient
        .storage
        .from("wedding-photos")
        .list("uploads", {
            limit: 100,
            sortBy: {
                column: "created_at",
                order: "desc"
            }
        });

    if (error) {
        console.error("Galerij laden mislukt:", error);
        status.textContent = `Galerij laden mislukt: ${error.message}`;
        return;
    }

    console.log("Bestanden in Supabase:", data);

    gallery.innerHTML = "";

    if (!data || data.length === 0) {
        status.textContent = "Nog geen foto's gevonden in de galerij.";
        return;
    }

    data.forEach(file => {
        const { data: urlData } = supabaseClient
            .storage
            .from("wedding-photos")
            .getPublicUrl(`uploads/${file.name}`);

const imageTypes = ["jpg", "jpeg", "png", "gif", "webp"];
const extension = file.name.split(".").pop().toLowerCase();

if (!imageTypes.includes(extension)) {
    return;
}

const img = document.createElement("img");
img.src = urlData.publicUrl;

img.onerror = () => {
    img.remove();
};

img.style.width = "200px";
img.style.height = "200px";
img.style.objectFit = "cover";
img.style.margin = "5px";
img.style.borderRadius = "10px";

gallery.appendChild(img);
    });

    status.textContent = "";
}

window.addEventListener("load", loadImages);
setInterval(loadImages, 10000);