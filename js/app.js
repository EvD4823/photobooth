const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const previewContainer = document.getElementById("previewContainer");
const uploadBtn = document.getElementById("uploadBtn");
const status = document.getElementById("status");

let selectedFiles = [];

uploadArea.addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
});

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

function handleFiles(files) {
    selectedFiles = [...selectedFiles, ...files];

    previewContainer.innerHTML = "";

    selectedFiles.forEach(file => {
        const reader = new FileReader();

        reader.onload = function(event) {
            const div = document.createElement("div");
            div.classList.add("preview");

            div.innerHTML =
                `<img src="${event.target.result}" alt="">`;

            previewContainer.appendChild(div);
        };

        reader.readAsDataURL(file);
    });
}

uploadBtn.addEventListener("click", async () => {

    if(selectedFiles.length === 0){
        alert("Selecteer eerst foto's.");
        return;
    }

    const formData = new FormData();

    selectedFiles.forEach(file => {
        formData.append("photos", file);
    });

    try {

        status.textContent = "Uploaden...";

        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        if(response.ok){
            status.textContent = "✅ Bedankt! De foto's zijn ontvangen.";
            selectedFiles = [];
            previewContainer.innerHTML = "";
        } else {
            status.textContent = "❌ Upload mislukt.";
        }

    } catch(error) {
        status.textContent = "❌ Server niet bereikbaar.";
        console.error(error);
    }
});