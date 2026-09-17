const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : "https://rentworth.onrender.com/api";

let reviews = [];
let isEmailVerified = false;

// Apartment dictionary with alias mapping
let apartmentsList = [
    {
        canonicalName: "One12 Courtland",
        defaultUniversity: "Georgia State University",
        aliases: ["112", "one12", "112 courtland", "one 12", "courtland"]
    },
    {
        canonicalName: "The Mix",
        defaultUniversity: "Georgia State University",
        aliases: ["mix", "the mix atlanta"]
    },
    {
        canonicalName: "Reflection",
        defaultUniversity: "Georgia State University",
        aliases: ["reflection atlanta", "reflections"]
    },
    {
        canonicalName: "The Standard at Atlanta",
        defaultUniversity: "Georgia Institute of Technology",
        aliases: ["standard", "the standard", "standard atlanta"]
    },
    {
        canonicalName: "The Mark Atlanta",
        defaultUniversity: "Georgia Institute of Technology",
        aliases: ["the mark", "mark atlanta"]
    },
    {
        canonicalName: "Hub Atlanta",
        defaultUniversity: "Georgia Institute of Technology",
        aliases: ["hub", "hub midtown"]
    },
    {
        canonicalName: "The Castilian",
        defaultUniversity: "University of Texas at Austin",
        aliases: ["castilian", "the castilian austin"]
    },
    {
        canonicalName: "Villas on Rio",
        defaultUniversity: "University of Texas at Austin",
        aliases: ["villas", "rio", "villas on rio west campus"]
    },
    {
        canonicalName: "The Standard",
        defaultUniversity: "University of Florida",
        aliases: ["standard gainesville", "standard uf"]
    },
    {
        canonicalName: "Hub on Campus",
        defaultUniversity: "University of Michigan",
        aliases: ["hub ann arbor", "hub umich"]
    }
];

let allUniversities = [
    "Georgetown University",
    "George Washington University",
    "George Mason University",
    "Georgia Institute of Technology",
    "Georgia State University",
    "University of Georgia",
    "Georgia Southern University",
    "Georgia Gwinnett College",
    "University of Texas at Austin",
    "Texas A&M University",
    "University of Florida",
    "Florida State University",
    "University of Michigan",
    "Penn State University",
    "Ohio State University",
    "New York University (NYU)",
    "University of California, Los Angeles (UCLA)",
    "University of California, Berkeley (UC Berkeley)"
];

async function loadFullCollegeList() {
    try {
        const res = await fetch("https://cdn.jsdelivr.net/gh/Hipo/university-domains-list@master/world_universities_and_domains.json");
        if (!res.ok) throw new Error("CDN request failed");
        const data = await res.json();
        
        const usSchools = data
            .filter(item => item.country === "United States")
            .map(item => item.name.trim());
        
        allUniversities = [...new Set([...usSchools, ...allUniversities])].sort();
    } catch (err) {
        console.warn("Using fallback university dataset:", err);
    }
}
loadFullCollegeList();

// DOM Elements
const reviewsStream = document.getElementById("reviews-stream");
const searchInput = document.getElementById("search-input");
const searchAutocompleteList = document.getElementById("search-autocomplete-list");
const reviewCount = document.getElementById("review-count");
const viewTitle = document.getElementById("view-title");
const navBestRated = document.getElementById("nav-best-rated");

// Filters
const filterSchoolSelect = document.getElementById("filter-school");
const filterComplexSelect = document.getElementById("filter-complex");
const filterRatingSelect = document.getElementById("filter-rating");
const clearFiltersBtn = document.getElementById("clear-filters-btn");

// Modals
const reviewModal = document.getElementById("review-modal");
const openModalBtn = document.getElementById("open-modal-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const reviewForm = document.getElementById("review-form");

// Email Verification Elements
const studentEmailInput = document.getElementById("student-email");
const sendOtpBtn = document.getElementById("send-otp-btn");
const otpContainer = document.getElementById("otp-container");
const otpInput = document.getElementById("email-otp-input");
const verifyOtpBtn = document.getElementById("verify-otp-btn");
const otpStatus = document.getElementById("otp-status");

const modalComplexInput = document.getElementById("property-name");
const modalComplexAutocompleteList = document.getElementById("modal-complex-autocomplete-list");
const modalUniInput = document.getElementById("property-uni");
const modalUniAutocompleteList = document.getElementById("modal-uni-autocomplete-list");

const managerModal = document.getElementById("manager-modal");
const navClaimBtn = document.getElementById("nav-claim-btn");
const closeManagerModalBtn = document.getElementById("close-manager-modal-btn");
const managerForm = document.getElementById("manager-form");

// Canvas Redactor DOM Elements
const redactorModal = document.getElementById("redactor-modal");
const redactionCanvas = document.getElementById("redaction-canvas");
const ctx = redactionCanvas ? redactionCanvas.getContext("2d") : null;
const fileInput = document.getElementById("lease-proof");
const uploadStatusText = document.getElementById("upload-status-text");
const redactionBadgeContainer = document.getElementById("redaction-badge-container");
const reEditBtn = document.getElementById("re-edit-btn");
const undoRedactBtn = document.getElementById("undo-redact-btn");
const clearRedactBtn = document.getElementById("clear-redact-btn");
const cancelRedactBtn = document.getElementById("cancel-redact-btn");
const closeRedactorBtn = document.getElementById("close-redactor-btn");
const saveRedactBtn = document.getElementById("save-redact-btn");

// Canvas Redaction State
let baseImage = null;
let redactionBoxes = [];
let isDrawing = false;
let startX = 0;
let startY = 0;
let finalRedactedBlob = null;

// Manager Response Modal Elements
const replyModal = document.getElementById("reply-modal");
const closeReplyModalBtn = document.getElementById("close-reply-modal-btn");
const replyForm = document.getElementById("reply-form");
const replyReviewIdInput = document.getElementById("reply-review-id");
const replyModalSubtitle = document.getElementById("reply-modal-subtitle");

function getScoreColorClass(score) {
    if (score >= 4.0) return "score-green";
    if (score >= 3.0) return "score-yellow";
    return "score-red";
}

// 1. Fetch Reviews
async function fetchReviews() {
    if (!reviewsStream) return;
    reviewsStream.innerHTML = `
        <div style="text-align: center; padding: 45px 20px; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <p style="color: var(--accent-gold); font-weight: 700; margin-bottom: 6px;">Loading verified reviews...</p>
            <p style="color: var(--text-muted); font-size: 0.82rem;">Please allow 20-30 seconds if the free cloud backend is waking up.</p>
        </div>
    `;
    try {
        const response = await fetch(`${API_BASE_URL}/reviews`);
        if (!response.ok) throw new Error("Failed to fetch reviews");
        reviews = await response.json();
        populateFilterDropdowns();
        applyAllFilters();
    } catch (error) {
        console.error("Error loading reviews:", error);
        reviewsStream.innerHTML = `
            <div style="text-align: center; padding: 45px 20px; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                <p style="color: var(--score-red); font-weight: 700; margin-bottom: 6px;">Unable to load reviews.</p>
                <p style="color: var(--text-muted); font-size: 0.85rem;">The backend server may still be spinning up. Please refresh the page in a moment.</p>
            </div>
        `;
    }
}

// 2. Populate Dropdowns
function populateFilterDropdowns() {
    if (!filterSchoolSelect || !filterComplexSelect) return;

    const currentSchool = filterSchoolSelect.value;
    const currentComplex = filterComplexSelect.value;

    const schools = [...new Set(reviews.map(r => r.university).filter(Boolean))].sort();
    filterSchoolSelect.innerHTML = `<option value="all">All Universities (${schools.length})</option>`;
    schools.forEach(school => {
        const opt = document.createElement("option");
        opt.value = school;
        opt.textContent = school;
        filterSchoolSelect.appendChild(opt);
    });
    if (schools.includes(currentSchool)) filterSchoolSelect.value = currentSchool;

    const complexes = [...new Set(reviews.map(r => r.complex_name).filter(Boolean))].sort();
    filterComplexSelect.innerHTML = `<option value="all">All Complexes (${complexes.length})</option>`;
    complexes.forEach(complex => {
        const opt = document.createElement("option");
        opt.value = complex;
        opt.textContent = complex;
        filterComplexSelect.appendChild(opt);
    });
    if (complexes.includes(currentComplex)) filterComplexSelect.value = currentComplex;
}

// 3. Filter Engine
function applyAllFilters() {
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const selectedSchool = filterSchoolSelect ? filterSchoolSelect.value : "all";
    const selectedComplex = filterComplexSelect ? filterComplexSelect.value : "all";
    const selectedRating = filterRatingSelect ? filterRatingSelect.value : "all";

    const matchedApartment = apartmentsList.find(apt =>
        apt.canonicalName.toLowerCase().includes(searchQuery) || 
        (apt.aliases && apt.aliases.some(a => a.includes(searchQuery)))
    );

    const filtered = reviews.filter(rev => {
        let matchesSearch = true;
        if (searchQuery) {
            const direct = (rev.complex_name && rev.complex_name.toLowerCase().includes(searchQuery)) ||
                           (rev.university && rev.university.toLowerCase().includes(searchQuery)) ||
                           (rev.tag && rev.tag.toLowerCase().includes(searchQuery)) ||
                           (rev.comment && rev.comment.toLowerCase().includes(searchQuery));

            const alias = matchedApartment && rev.complex_name &&
                          rev.complex_name.toLowerCase().includes(matchedApartment.canonicalName.toLowerCase());

            matchesSearch = direct || alias;
        }

        let matchesSchool = true;
        if (selectedSchool !== "all") {
            matchesSchool = rev.university === selectedSchool;
        }

        let matchesComplex = true;
        if (selectedComplex !== "all") {
            matchesComplex = rev.complex_name === selectedComplex;
        }

        let matchesRating = true;
        if (selectedRating !== "all") {
            const num = Number(rev.rating);
            if (selectedRating === "4.5") matchesRating = num >= 4.5;
            else if (selectedRating === "4.0") matchesRating = num >= 4.0;
            else if (selectedRating === "3.0") matchesRating = num >= 3.0;
            else if (selectedRating === "2.0") matchesRating = num < 3.0;
        }

        return matchesSearch && matchesSchool && matchesComplex && matchesRating;
    });

    let titleLabel = "Recent Verified Tenant Reviews";
    if (selectedSchool !== "all" && selectedComplex !== "all") {
        titleLabel = `${selectedComplex} near ${selectedSchool}`;
    } else if (selectedSchool !== "all") {
        titleLabel = `Housing near ${selectedSchool}`;
    } else if (selectedComplex !== "all") {
        titleLabel = `Reviews for ${selectedComplex}`;
    } else if (searchQuery) {
        titleLabel = `Reviews matching "${searchQuery}"`;
    }

    renderReviews(filtered, titleLabel);
}

// 4. Render Reviews Feed
function renderReviews(items, filterLabel = "") {
    if (!reviewsStream) return;
    reviewsStream.innerHTML = "";
    if (viewTitle) viewTitle.textContent = filterLabel || "Recent Verified Tenant Reviews";
    if (reviewCount) reviewCount.textContent = `Showing ${items.length} ${items.length === 1 ? "verified review" : "verified reviews"}`;

    if (items.length === 0) {
        reviewsStream.innerHTML = `
            <div style="text-align: center; padding: 45px 20px; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
                <p style="color: var(--text-main); font-weight: 700; margin-bottom: 6px;">No reviews match this filter.</p>
                <p style="color: var(--text-muted); font-size: 0.88rem;">Try clearing your filters or be the first student to submit a review.</p>
            </div>
        `;
        return;
    }

    items.forEach(rev => {
        const item = document.createElement("div");
        item.className = "review-item-card";
        const score = rev.rating ? Number(rev.rating).toFixed(1) : "N/A";
        const colorClass = getScoreColorClass(Number(rev.rating));

        let displayTag = rev.tag || "VerifiedLiving";
        if (!displayTag.startsWith("#")) displayTag = "#" + displayTag.replace(/\s+/g, '');

        let managerResponseHtml = "";
        if (rev.response_text) {
            managerResponseHtml = `
                <div class="manager-response-card">
                    <div class="manager-response-header">
                        <div class="manager-responder-meta">
                            <span class="official-badge">Verified Management</span>
                            <span class="manager-name">${rev.responder_name}</span>
                            <span class="manager-title">• ${rev.responder_title}</span>
                        </div>
                        <div class="review-date">${rev.response_date ? new Date(rev.response_date).toLocaleDateString() : ""}</div>
                    </div>
                    <p class="manager-response-text">"${rev.response_text}"</p>
                </div>
            `;
        } else {
            managerResponseHtml = `
                <button type="button" class="reply-btn-action" onclick="openReplyModal(${rev.id}, '${rev.complex_name.replace(/'/g, "\\'")}')">
                    💬 Respond as Property Manager
                </button>
            `;
        }

        item.innerHTML = `
            <div class="review-header-row">
                <div class="reviewer-meta">
                    <span class="score-badge ${colorClass}">
                        ${score}
                    </span>
                    <div>
                        <div class="review-place">${rev.complex_name}</div>
                        <div class="review-uni">Near ${rev.university}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <span class="verified-badge">✓ Verified Lease</span>
                    <div class="review-date">${rev.created_at ? new Date(rev.created_at).toLocaleDateString() : "Recent"}</div>
                </div>
            </div>

            <p class="review-body">"${rev.comment}"</p>

            <div class="review-footer-chips">
                <span class="review-chip">${rev.floorplan}</span>
                <span class="review-chip">$${rev.rent}/mo</span>
                <span class="tag-pill">${displayTag}</span>
            </div>

            ${managerResponseHtml}
        `;
        reviewsStream.appendChild(item);
    });
}

// 5. Student Email OTP Verification Flow
if (sendOtpBtn) {
    sendOtpBtn.addEventListener("click", async () => {
        const email = studentEmailInput ? studentEmailInput.value.trim().toLowerCase() : "";
        if (!email || !email.endsWith(".edu")) {
            alert("Please enter a valid university email address ending in .edu before requesting a code.");
            return;
        }

        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = "Sending...";
        if (otpStatus) otpStatus.textContent = "";

        try {
            const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to send code");

            if (otpContainer) otpContainer.style.display = "block";
            if (otpStatus) {
                otpStatus.style.color = "var(--accent-gold)";
                otpStatus.textContent = data.devOtp 
                    ? `Dev mode code: ${data.devOtp}` 
                    : "Verification code sent to your .edu inbox. Please check your email.";
            }
        } catch (err) {
            alert(err.message);
        } finally {
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = "Resend Code";
        }
    });
}

if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener("click", async () => {
        const email = studentEmailInput ? studentEmailInput.value.trim().toLowerCase() : "";
        const otp_code = otpInput ? otpInput.value.trim() : "";

        if (otp_code.length !== 6) {
            alert("Please enter the 6-digit code received in your email.");
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp_code })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Verification failed");

            isEmailVerified = true;
            if (studentEmailInput) {
                studentEmailInput.readOnly = true;
                studentEmailInput.style.borderColor = "#22C55E";
            }
            if (otpContainer) otpContainer.style.display = "none";
            if (sendOtpBtn) sendOtpBtn.style.display = "none";
            alert("Student .edu email verified successfully!");
        } catch (err) {
            if (otpStatus) {
                otpStatus.style.color = "var(--score-red)";
                otpStatus.textContent = err.message;
            }
        }
    });
}

// 6. Document Redactor Logic
if (fileInput) {
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                baseImage = img;
                redactionBoxes = [];
                setupCanvas(img);
                if (redactorModal) redactorModal.style.display = "flex";
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function setupCanvas(img) {
    if (!redactionCanvas) return;
    let width = img.naturalWidth;
    let height = img.naturalHeight;
    const maxDimension = 1200;

    if (width > maxDimension || height > maxDimension) {
        if (width > height) {
            height = (height * maxDimension) / width;
            width = maxDimension;
        } else {
            width = (width * maxDimension) / height;
            height = maxDimension;
        }
    }

    redactionCanvas.width = width;
    redactionCanvas.height = height;
    redrawCanvas();
}

function redrawCanvas() {
    if (!baseImage || !ctx || !redactionCanvas) return;
    ctx.clearRect(0, 0, redactionCanvas.width, redactionCanvas.height);
    ctx.drawImage(baseImage, 0, 0, redactionCanvas.width, redactionCanvas.height);

    ctx.fillStyle = "#000000";
    redactionBoxes.forEach(box => {
        ctx.fillRect(box.x, box.y, box.w, box.h);
    });
}

function getCanvasCoords(e) {
    const rect = redactionCanvas.getBoundingClientRect();
    const scaleX = redactionCanvas.width / rect.width;
    const scaleY = redactionCanvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

if (redactionCanvas) {
    redactionCanvas.addEventListener("mousedown", (e) => {
        isDrawing = true;
        const coords = getCanvasCoords(e);
        startX = coords.x;
        startY = coords.y;
    });

    redactionCanvas.addEventListener("mousemove", (e) => {
        if (!isDrawing) return;
        const coords = getCanvasCoords(e);
        redrawCanvas();

        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.strokeStyle = "#FBBF24";
        ctx.lineWidth = 2;
        const w = coords.x - startX;
        const h = coords.y - startY;
        ctx.fillRect(startX, startY, w, h);
        ctx.strokeRect(startX, startY, w, h);
    });

    redactionCanvas.addEventListener("mouseup", (e) => {
        if (!isDrawing) return;
        isDrawing = false;
        const coords = getCanvasCoords(e);
        const w = coords.x - startX;
        const h = coords.y - startY;

        if (Math.abs(w) > 4 && Math.abs(h) > 4) {
            redactionBoxes.push({
                x: w < 0 ? startX + w : startX,
                y: h < 0 ? startY + h : startY,
                w: Math.abs(w),
                h: Math.abs(h)
            });
        }
        redrawCanvas();
    });
}

if (undoRedactBtn) undoRedactBtn.addEventListener("click", () => { redactionBoxes.pop(); redrawCanvas(); });
if (clearRedactBtn) clearRedactBtn.addEventListener("click", () => { redactionBoxes = []; redrawCanvas(); });
if (reEditBtn) reEditBtn.addEventListener("click", () => { if (redactorModal) redactorModal.style.display = "flex"; redrawCanvas(); });
if (closeRedactorBtn) closeRedactorBtn.addEventListener("click", () => { if (redactorModal) redactorModal.style.display = "none"; });
if (cancelRedactBtn) cancelRedactBtn.addEventListener("click", () => { if (redactorModal) redactorModal.style.display = "none"; });

if (saveRedactBtn && redactionCanvas) {
    saveRedactBtn.addEventListener("click", () => {
        redrawCanvas();
        redactionCanvas.toBlob((blob) => {
            finalRedactedBlob = blob;
            if (uploadStatusText) uploadStatusText.textContent = "✓ Image redacted & secured";
            if (redactionBadgeContainer) redactionBadgeContainer.style.display = "block";
            if (redactorModal) redactorModal.style.display = "none";
        }, "image/jpeg", 0.92);
    });
}

// 7. Autocomplete Engine
function setupUniversityAutocomplete(inputElement, dropdownElement, onSelectCallback, allowAddCustom = false) {
    if (!inputElement || !dropdownElement) return;
    inputElement.addEventListener("input", (e) => {
        const rawQuery = e.target.value.trim();
        const query = rawQuery.toLowerCase();
        dropdownElement.innerHTML = "";

        if (query.length < 1) {
            dropdownElement.style.display = "none";
            return;
        }

        const prefixMatches = [];
        const substringMatches = [];

        for (let i = 0; i < allUniversities.length; i++) {
            const name = allUniversities[i];
            const lower = name.toLowerCase();

            if (lower.startsWith(query)) {
                prefixMatches.push(name);
            } else if (lower.includes(query)) {
                substringMatches.push(name);
            }

            if (prefixMatches.length + substringMatches.length >= 25) break;
        }

        const matches = [...prefixMatches, ...substringMatches].slice(0, 15);

        matches.forEach(match => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";

            const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${safeQuery})`, "gi");
            const displayName = match.replace(regex, `<strong class="match-text">$1</strong>`);

            item.innerHTML = `<span class="school-icon">🏫</span><span class="school-name">${displayName}</span>`;

            item.addEventListener("click", () => {
                inputElement.value = match;
                dropdownElement.innerHTML = "";
                dropdownElement.style.display = "none";
                if (onSelectCallback) onSelectCallback(match);
            });

            dropdownElement.appendChild(item);
        });

        const exactMatchExists = allUniversities.some(u => u.toLowerCase() === query);
        if (allowAddCustom && !exactMatchExists && rawQuery.length >= 2) {
            const addItem = document.createElement("div");
            addItem.className = "autocomplete-item add-custom-item";
            addItem.innerHTML = `<span>➕</span><span>Add "<strong>${rawQuery}</strong>" as a new college</span>`;

            addItem.addEventListener("click", () => {
                inputElement.value = rawQuery;
                if (!allUniversities.includes(rawQuery)) {
                    allUniversities.unshift(rawQuery);
                }
                dropdownElement.innerHTML = "";
                dropdownElement.style.display = "none";
                if (onSelectCallback) onSelectCallback(rawQuery);
            });

            dropdownElement.appendChild(addItem);
        }

        dropdownElement.style.display = (matches.length > 0 || (allowAddCustom && rawQuery.length >= 2)) ? "block" : "none";
    });
}

function setupApartmentAutocomplete(inputElement, dropdownElement) {
    if (!inputElement || !dropdownElement) return;
    inputElement.addEventListener("input", (e) => {
        const rawQuery = e.target.value.trim();
        const query = rawQuery.toLowerCase();
        dropdownElement.innerHTML = "";

        if (query.length < 1) {
            dropdownElement.style.display = "none";
            return;
        }

        const matches = apartmentsList.filter(apt => {
            const nameMatch = apt.canonicalName.toLowerCase().includes(query);
            const aliasMatch = apt.aliases && apt.aliases.some(alias => alias.includes(query));
            return nameMatch || aliasMatch;
        }).slice(0, 6);

        matches.forEach(apt => {
            const item = document.createElement("div");
            item.className = "autocomplete-item";

            const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${safeQuery})`, "gi");
            const displayName = apt.canonicalName.replace(regex, `<strong class="match-text">$1</strong>`);

            item.innerHTML = `
                <span class="school-icon">🏢</span>
                <div>
                    <div class="school-name">${displayName}</div>
                    <small style="color: var(--text-muted); font-size: 0.75rem;">Near ${apt.defaultUniversity}</small>
                </div>
            `;

            item.addEventListener("click", () => {
                inputElement.value = apt.canonicalName;
                if (modalUniInput && !modalUniInput.value.trim()) {
                    modalUniInput.value = apt.defaultUniversity;
                }
                dropdownElement.innerHTML = "";
                dropdownElement.style.display = "none";
            });

            dropdownElement.appendChild(item);
        });

        const exactAptExists = apartmentsList.some(a => a.canonicalName.toLowerCase() === query);
        if (!exactAptExists && rawQuery.length >= 2) {
            const addAptItem = document.createElement("div");
            addAptItem.className = "autocomplete-item add-custom-item";
            addAptItem.innerHTML = `<span>➕</span><span>Add "<strong>${rawQuery}</strong>" as a new complex</span>`;

            addAptItem.addEventListener("click", () => {
                inputElement.value = rawQuery;
                dropdownElement.innerHTML = "";
                dropdownElement.style.display = "none";
            });

            dropdownElement.appendChild(addAptItem);
        }

        dropdownElement.style.display = "block";
    });
}

setupUniversityAutocomplete(searchInput, searchAutocompleteList, (selectedUni) => {
    if (filterSchoolSelect && [...filterSchoolSelect.options].some(o => o.value === selectedUni)) {
        filterSchoolSelect.value = selectedUni;
    }
    applyAllFilters();
}, false);

setupUniversityAutocomplete(modalUniInput, modalUniAutocompleteList, null, true);
setupApartmentAutocomplete(modalComplexInput, modalComplexAutocompleteList);

document.addEventListener("click", (e) => {
    if (searchInput && searchAutocompleteList && !searchInput.contains(e.target) && !searchAutocompleteList.contains(e.target)) {
        searchAutocompleteList.style.display = "none";
    }
    if (modalUniInput && modalUniAutocompleteList && !modalUniInput.contains(e.target) && !modalUniAutocompleteList.contains(e.target)) {
        modalUniAutocompleteList.style.display = "none";
    }
    if (modalComplexInput && modalComplexAutocompleteList && !modalComplexInput.contains(e.target) && !modalComplexAutocompleteList.contains(e.target)) {
        modalComplexAutocompleteList.style.display = "none";
    }
});

if (filterSchoolSelect) filterSchoolSelect.addEventListener("change", applyAllFilters);
if (filterComplexSelect) filterComplexSelect.addEventListener("change", applyAllFilters);
if (filterRatingSelect) filterRatingSelect.addEventListener("change", applyAllFilters);
if (searchInput) searchInput.addEventListener("input", applyAllFilters);

if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (filterSchoolSelect) filterSchoolSelect.value = "all";
        if (filterComplexSelect) filterComplexSelect.value = "all";
        if (filterRatingSelect) filterRatingSelect.value = "all";
        applyAllFilters();
    });
}

if (navBestRated) {
    navBestRated.addEventListener("click", (e) => {
        e.preventDefault();
        if (filterRatingSelect) filterRatingSelect.value = "4.5";
        applyAllFilters();
    });
}

if (openModalBtn) openModalBtn.addEventListener("click", () => { if (reviewModal) reviewModal.style.display = "flex"; });
if (closeModalBtn) closeModalBtn.addEventListener("click", () => { if (reviewModal) reviewModal.style.display = "none"; });

// Review Submission
if (reviewForm) {
    reviewForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = studentEmailInput ? studentEmailInput.value.trim().toLowerCase() : "";
        if (!email.endsWith(".edu")) {
            alert("Please enter a valid university email ending in .edu");
            return;
        }

        if (!isEmailVerified) {
            alert("Please verify your .edu email with the 6-digit confirmation PIN before submitting.");
            return;
        }

        if (!finalRedactedBlob && (!fileInput || !fileInput.files || fileInput.files.length === 0)) {
            alert("Please upload your lease proof or resident portal screenshot.");
            return;
        }

        let finalComplexName = modalComplexInput ? modalComplexInput.value.trim() : "";
        const matchedApt = apartmentsList.find(apt => 
            apt.canonicalName.toLowerCase() === finalComplexName.toLowerCase() ||
            (apt.aliases && apt.aliases.includes(finalComplexName.toLowerCase()))
        );
        if (matchedApt) {
            finalComplexName = matchedApt.canonicalName;
        } else {
            apartmentsList.push({
                canonicalName: finalComplexName,
                defaultUniversity: modalUniInput ? modalUniInput.value.trim() : "",
                aliases: []
            });
        }

        let rawTag = document.getElementById("form-tag")?.value.trim() || "";
        rawTag = rawTag.replace(/^#+/, '').replace(/\s+/g, '');
        if (!rawTag) rawTag = "VerifiedLiving";

        const finalUni = modalUniInput ? modalUniInput.value.trim() : "";
        if (finalUni && !allUniversities.includes(finalUni)) {
            allUniversities.unshift(finalUni);
        }

        const formData = new FormData();
        formData.append("complex_name", finalComplexName);
        formData.append("university", finalUni);
        formData.append("student_email", email);
        formData.append("floorplan", document.getElementById("room-type")?.value.trim() || "");
        formData.append("rent", document.getElementById("rent-amount")?.value || "0");
        formData.append("rating", document.getElementById("rating-overall")?.value || "5.0");
        formData.append("tag", rawTag);
        formData.append("comment", document.getElementById("review-text")?.value.trim() || "");

        if (finalRedactedBlob) {
            formData.append("lease_proof", finalRedactedBlob, "redacted_lease.jpg");
        } else if (fileInput && fileInput.files[0]) {
            formData.append("lease_proof", fileInput.files[0]);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/reviews`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Submission failed");
            }

            alert("Review verified and published successfully!");
            reviewForm.reset();
            isEmailVerified = false;
            if (studentEmailInput) {
                studentEmailInput.readOnly = false;
                studentEmailInput.style.borderColor = "";
            }
            if (sendOtpBtn) {
                sendOtpBtn.style.display = "block";
                sendOtpBtn.textContent = "Send Code";
            }
            finalRedactedBlob = null;
            baseImage = null;
            redactionBoxes = [];
            if (uploadStatusText) uploadStatusText.textContent = "Click or drag lease screenshot to redact & attach";
            if (redactionBadgeContainer) redactionBadgeContainer.style.display = "none";
            if (reviewModal) reviewModal.style.display = "none";
            fetchReviews();
        } catch (err) {
            console.error(err);
            alert(`Error submitting review: ${err.message}`);
        }
    });
}

// Manager Response Modal Opening
window.openReplyModal = function(reviewId, complexName) {
    if (replyReviewIdInput) replyReviewIdInput.value = reviewId;
    if (replyModalSubtitle) replyModalSubtitle.textContent = `Official reply on behalf of ${complexName}`;
    if (replyModal) replyModal.style.display = "flex";
};

if (closeReplyModalBtn) closeReplyModalBtn.addEventListener("click", () => { if (replyModal) replyModal.style.display = "none"; });

// Manager Response Submission
if (replyForm) {
    replyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const reviewId = replyReviewIdInput ? replyReviewIdInput.value : "";
        const responder_name = document.getElementById("reply-manager-name")?.value.trim() || "";
        const responder_title = document.getElementById("reply-manager-title")?.value.trim() || "";
        const response_text = document.getElementById("reply-text")?.value.trim() || "";
        const corporate_email = document.getElementById("reply-manager-email")?.value.trim() || "";
        const access_code = document.getElementById("reply-access-code")?.value.trim() || "";

        try {
            const res = await fetch(`${API_BASE_URL}/reviews/${reviewId}/response`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    responder_name, 
                    responder_title, 
                    response_text,
                    corporate_email,
                    access_code
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to submit response");
            }

            alert("Official response published successfully!");
            replyForm.reset();
            if (replyModal) replyModal.style.display = "none";
            fetchReviews();
        } catch (err) {
            alert(err.message);
        }
    });
}

// Manager Claim Handlers
if (navClaimBtn) navClaimBtn.addEventListener("click", (e) => { e.preventDefault(); if (managerModal) managerModal.style.display = "flex"; });
if (closeManagerModalBtn) closeManagerModalBtn.addEventListener("click", () => { if (managerModal) managerModal.style.display = "none"; });

if (managerForm) {
    managerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const proofInput = document.getElementById("manager-proof");
        const formData = new FormData();
        formData.append("property_name", document.getElementById("manager-prop")?.value.trim() || "");
        formData.append("corporate_email", document.getElementById("manager-email")?.value.trim() || "");
        formData.append("role", document.getElementById("manager-role")?.value || "");
        if (proofInput && proofInput.files.length > 0) {
            formData.append("proof", proofInput.files[0]);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/claims`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Claim failed");
            }

            alert("Claim request received. Corporate credentials will be reviewed within 24 hours.");
            managerForm.reset();
            if (managerModal) managerModal.style.display = "none";
        } catch (err) {
            console.error(err);
            alert(`Error submitting claim: ${err.message}`);
        }
    });
}

// Modal outside click dismiss
window.addEventListener("click", (e) => {
    if (e.target === reviewModal) reviewModal.style.display = "none";
    if (e.target === managerModal) managerModal.style.display = "none";
    if (e.target === redactorModal) redactorModal.style.display = "none";
    if (e.target === replyModal) replyModal.style.display = "none";
});

fetchReviews();