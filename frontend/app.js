const initialReviews = [
    {
        id: "rev-1",
        complexName: "The Castilian",
        university: "UT Austin",
        rating: 4.0,
        floorplan: "2B/2B",
        rent: 1150,
        tag: "Paper Thin Walls",
        comment: "Great spot for freshman year because you can literally roll out of bed and be on West Campus in 3 minutes. However, elevators are jammed during 9 AM class rush and you can hear your neighbor's alarm clock through the drywall.",
        date: "2 days ago",
        verified: true
    },
    {
        id: "rev-2",
        complexName: "The Standard",
        university: "University of Florida",
        rating: 5.0,
        floorplan: "1B/1B",
        rent: 980,
        tag: "Fast Maintenance",
        comment: "Had my AC break down in the middle of August and someone came within 3 hours to replace the capacitor. Amenities are kept clean and package lockers actually work.",
        date: "5 days ago",
        verified: true
    },
    {
        id: "rev-3",
        complexName: "Villas on Rio",
        university: "UT Austin",
        rating: 3.0,
        floorplan: "4B/4B",
        rent: 1380,
        tag: "Hidden Utility Fees",
        comment: "The rooftop pool and study pods look insane, but utility bills are unpredictable. Expect an extra $90-$120 in monthly 'administrative' and mandatory trash valet fees.",
        date: "1 week ago",
        verified: true
    },
    {
        id: "rev-4",
        complexName: "Hub on Campus",
        university: "University of Michigan",
        rating: 2.0,
        floorplan: "4B/4B",
        rent: 1450,
        tag: "Kept Security Deposit",
        comment: "Aesthetics look nice on the tour, but management hit our entire unit with a $400 deduction for normal paint scuffs. Don't expect to get your deposit back without a fight.",
        date: "2 weeks ago",
        verified: true
    }
];

let reviews = JSON.parse(localStorage.getItem("rentworth_reviews")) || initialReviews;

// DOM Elements
const reviewsStream = document.getElementById("reviews-stream");
const searchInput = document.getElementById("search-input");
const reviewCount = document.getElementById("review-count");
const viewTitle = document.getElementById("view-title");
const navBestRated = document.getElementById("nav-best-rated");

// Modals
const reviewModal = document.getElementById("review-modal");
const openModalBtn = document.getElementById("open-modal-btn");
const closeModalBtn = document.getElementById("close-modal-btn");
const reviewForm = document.getElementById("review-form");

const managerModal = document.getElementById("manager-modal");
const navClaimBtn = document.getElementById("nav-claim-btn");
const closeManagerModalBtn = document.getElementById("close-manager-modal-btn");
const managerForm = document.getElementById("manager-form");

function getScoreColorClass(score) {
    if (score >= 4.0) return "score-green";
    if (score >= 3.0) return "score-yellow";
    return "score-red";
}

// 1. Render Reviews Feed
function renderReviews(items, filterLabel = "") {
    reviewsStream.innerHTML = "";
    
    if (filterLabel) {
        viewTitle.textContent = filterLabel;
    } else {
        viewTitle.textContent = "Recent Verified Tenant Reviews";
    }

    reviewCount.textContent = `Showing ${items.length} ${items.length === 1 ? "verified review" : "verified reviews"}`;

    if (items.length === 0) {
        reviewsStream.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 40px 0;">No matching reviews found. Try searching for another complex, university, or tag.</p>`;
        return;
    }

    items.forEach(rev => {
        const item = document.createElement("div");
        item.className = "review-item-card";
        const colorClass = getScoreColorClass(Number(rev.rating));

        item.innerHTML = `
            <div class="review-header-row">
                <div class="reviewer-meta">
                    <span class="score-badge ${colorClass}">
                        ${Number(rev.rating).toFixed(1)}
                    </span>
                    <div>
                        <div class="review-place">${rev.complexName}</div>
                        <div class="review-uni">Near ${rev.university}</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <span class="verified-badge">✓ Verified Lease</span>
                    <div class="review-date">${rev.date}</div>
                </div>
            </div>

            <p class="review-body">"${rev.comment}"</p>

            <div class="review-footer-chips">
                <span class="review-chip">${rev.floorplan}</span>
                <span class="review-chip">$${rev.rent}/mo</span>
                <span class="tag-pill">#${rev.tag}</span>
            </div>
        `;
        reviewsStream.appendChild(item);
    });
}

// 2. Navbar "Best Rated" Filter
navBestRated.addEventListener("click", (e) => {
    e.preventDefault();
    const sorted = [...reviews].sort((a, b) => b.rating - a.rating);
    renderReviews(sorted, "Top Rated Verified Experiences");
});

// 3. Live Search Filter
searchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = reviews.filter(rev => 
        rev.complexName.toLowerCase().includes(q) ||
        rev.university.toLowerCase().includes(q) ||
        rev.tag.toLowerCase().includes(q) ||
        rev.comment.toLowerCase().includes(q)
    );
    renderReviews(filtered, q ? `Reviews matching "${e.target.value}"` : "");
});

// 4. Review Modal Handling
openModalBtn.addEventListener("click", () => {
    reviewModal.style.display = "flex";
});

closeModalBtn.addEventListener("click", () => {
    reviewModal.style.display = "none";
});

reviewForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("student-email").value.trim().toLowerCase();
    if (!email.endsWith(".edu")) {
        alert("Please use a university email (.edu) to confirm active student status.");
        return;
    }

    const complexNameVal = document.getElementById("property-name").value.trim();
    const uniVal = document.getElementById("property-uni").value.trim();
    const ratingVal = Number(document.getElementById("rating-overall").value);
    const chosenTag = document.getElementById("form-tag").value;
    const rentVal = Number(document.getElementById("rent-amount").value);
    const floorplanVal = document.getElementById("room-type").value.trim();
    const commentVal = document.getElementById("review-text").value.trim();

    const newReview = {
        id: "rev-" + Date.now(),
        complexName: complexNameVal,
        university: uniVal,
        rating: ratingVal,
        floorplan: floorplanVal,
        rent: rentVal,
        tag: chosenTag,
        comment: commentVal,
        date: "Just now",
        verified: true
    };

    reviews.unshift(newReview);
    localStorage.setItem("rentworth_reviews", JSON.stringify(reviews));

    renderReviews(reviews);
    alert("Review submitted and published with a verified tenancy badge!");

    reviewForm.reset();
    reviewModal.style.display = "none";
});

// 5. Manager Modal Handling
navClaimBtn.addEventListener("click", (e) => {
    e.preventDefault();
    managerModal.style.display = "flex";
});

closeManagerModalBtn.addEventListener("click", () => {
    managerModal.style.display = "none";
});

managerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Claim request received. Our team will verify your corporate credentials within 24 hours.");
    managerForm.reset();
    managerModal.style.display = "none";
});

// Window Backdrop Click
window.addEventListener("click", (e) => {
    if (e.target === reviewModal) reviewModal.style.display = "none";
    if (e.target === managerModal) managerModal.style.display = "none";
});

// Initial Render
renderReviews(reviews);