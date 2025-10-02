document.addEventListener("DOMContentLoaded", () => {
    const feedbackForm = document.getElementById("feedbackForm");
    const ratingBtns = document.querySelectorAll('.rating-btn');
    const ratingInput = document.getElementById("rating");

    console.log("Initializing Feedback Form");

    if (!feedbackForm) {
        console.error("Feedback form not found!");
        return;
    }

    // Rating button functionality
    ratingBtns.forEach(btn => {
        btn.addEventListener("click", function () {
            ratingBtns.forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            ratingInput.value = this.getAttribute("data-rating");
            console.log("Rating set to:", ratingInput.value);
        });
    });

    // Form submission
    feedbackForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        console.log("Form submit triggered");

        const formData = {
            name: this.name.value.trim(),
            email: this.email.value.trim(),
            company: this.company.value.trim(),
            message: this.message.value.trim(),
            rating: this.rating.value || null
        };

        if (!formData.message) {
            alert("Please enter your feedback.");
            return;
        }

        console.log("Submitting feedback:", formData);

        try {
            const response = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                console.log("Feedback submitted successfully");
                window.location.href = "/thankyou.html";
            } else {
                const err = await response.json();
                console.error("Server error:", err);
                alert(err.errors ? err.errors.join(", ") : err.error || "Failed to submit feedback");
            }
        } catch (error) {
            console.error("Error submitting feedback:", error);
            alert("Failed to submit feedback due to network error");
        }
    });
});