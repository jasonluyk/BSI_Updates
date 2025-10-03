document.addEventListener("DOMContentLoaded", () => {
    const ratingBtns = document.querySelectorAll('.rating-btn');
    const ratingInput = document.getElementById('rating');
    const feedbackForm = document.getElementById('feedbackForm');

    ratingBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            ratingBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            ratingInput.value = this.getAttribute('data-rating');
        });
    });

    feedbackForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = {
            name: this.name.value.trim() || null,
            email: this.email.value.trim() || null,
            company: this.company.value.trim() || null,
            message: this.message.value.trim(),
            rating: this.rating.value || null
        };

        try {
            const response = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                window.location.href = "/thankyou.html";
            } else {
                const err = await response.json();
                alert(err.errors ? err.errors.join(", ") : err.error || "Failed to submit feedback");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Failed to submit feedback");
        }
    });
});
