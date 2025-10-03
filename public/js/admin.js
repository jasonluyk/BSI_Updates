let allFeedback = [];

async function loadFeedback() {
    const container = document.getElementById("feedbackContainer");
    container.innerHTML = '<div class="loading">Loading feedback...</div>';

    try {
        const response = await fetch("/api/admin/feedback");
        const data = await response.json();

        allFeedback = data;
        updateStats();
        displayFeedback(data);
    } catch (error) {
        console.error("Error loading feedback:", error);
        container.innerHTML =
            '<div class="empty-state"><h2>Error loading feedback</h2><p>Please check your connection and try again.</p></div>';
    }
}

function updateStats() {
    const totalCount = allFeedback.length;
    document.getElementById("totalCount").textContent = totalCount;

    const ratingsOnly = allFeedback.filter((f) => f.rating).map((f) => f.rating);
    const avgRating =
        ratingsOnly.length > 0
            ? (ratingsOnly.reduce((a, b) => a + b, 0) / ratingsOnly.length).toFixed(1)
            : "-";
    document.getElementById("avgRating").textContent = avgRating;

    const today = new Date().toDateString();
    const todayCount = allFeedback.filter(
        (f) => new Date(f.created_at).toDateString() === today
    ).length;
    document.getElementById("todayCount").textContent = todayCount;
}

function displayFeedback(feedbackList) {
    const container = document.getElementById("feedbackContainer");

    if (feedbackList.length === 0) {
        container.innerHTML =
            '<div class="empty-state"><h2>No feedback yet</h2><p>Customer feedback will appear here once submitted.</p></div>';
        return;
    }

    container.innerHTML =
        '<div class="feedback-grid">' +
        feedbackList.map((feedback) => createFeedbackCard(feedback)).join("") +
        "</div>";
}

function createFeedbackCard(feedback) {
    const date = new Date(feedback.created_at);
    const formattedDate = date.toLocaleDateString() + " at " + date.toLocaleTimeString();

    const ratingHTML = feedback.rating
        ? `<div class="feedback-rating">${createStars(feedback.rating)}</div>`
        : "";

    const nameDisplay = feedback.name || "Anonymous";
    const emailDisplay = feedback.email ? `<div class="feedback-contact">📧 ${feedback.email}</div>` : "";
    const companyDisplay = feedback.company ? `<div class="feedback-contact">🏢 ${feedback.company}</div>` : "";

    return `
        <div class="feedback-card" data-id="${feedback._id}">
            <div class="feedback-header">
                <div class="feedback-meta">
                    <div class="feedback-name">${nameDisplay}</div>
                    ${emailDisplay}
                    ${companyDisplay}
                    <div class="feedback-date">${formattedDate}</div>
                </div>
            </div>
            ${ratingHTML}
            <div class="feedback-message">${escapeHtml(feedback.message)}</div>
            <div class="feedback-actions">
                <button class="delete-btn" data-id="${feedback._id}">🗑️ Delete</button>
            </div>
        </div>
    `;
}

function createStars(rating) {
    let stars = "";
    for (let i = 1; i <= 5; i++) {
        stars += `<span class="star ${i <= rating ? "" : "empty"}">★</span>`;
    }
    return stars;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

async function deleteFeedback(id) {
    if (!confirm("Are you sure you want to delete this feedback?")) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/feedback/${id}`, {
            method: "DELETE",
        });

        if (response.ok) {
            loadFeedback();
        } else {
            alert("Failed to delete feedback");
        }
    } catch (error) {
        console.error("Error deleting feedback:", error);
        alert("Failed to delete feedback");
    }
}

document.addEventListener("click", function (e) {
    if (e.target.classList.contains("delete-btn")) {
        const id = e.target.getAttribute("data-id");
        deleteFeedback(id);
    }
});

document.getElementById("ratingFilter").addEventListener("change", function () {
    const filterValue = this.value;

    let filteredFeedback = allFeedback;

    if (filterValue !== "all") {
        if (filterValue === "null") {
            filteredFeedback = allFeedback.filter((f) => !f.rating);
        } else {
            filteredFeedback = allFeedback.filter((f) => f.rating == filterValue);
        }
    }

    displayFeedback(filteredFeedback);
});

loadFeedback();
setInterval(loadFeedback, 30000);
