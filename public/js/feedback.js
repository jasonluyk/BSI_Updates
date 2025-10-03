// feedback.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("feedbackForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = {
      name: form.name.value,
      email: form.email.value,
      company: form.company.value,
      message: form.message.value,
      rating: form.rating.value ? Number(form.rating.value) : null
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
        alert(err.error || "Failed to submit feedback");
      }
    } catch (error) {
      console.error("❌ Error submitting feedback:", error);
      alert("Failed to submit feedback");
    }
  });
});
