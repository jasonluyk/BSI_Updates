// admin.js
async function loadFeedback() {
  const container = document.getElementById("feedbackContainer");
  container.innerHTML = "<p>Loading feedback...</p>";

  try {
    const response = await fetch("/api/feedback");
    if (!response.ok) throw new Error(`Server responded ${response.status}`);

    const feedbackList = await response.json();
    container.innerHTML = "";

    if (!feedbackList.length) {
      container.innerHTML = "<p>No feedback found.</p>";
      return;
    }

    feedbackList.forEach(item => {
      const div = document.createElement("div");
      div.classList.add("feedback-item");
      div.innerHTML = `
        <h4>${item.name} (${item.email})</h4>
        <p>${item.message}</p>
        <small>${new Date(item.createdAt).toLocaleString()}</small>
        <button class="delete-btn" data-id="${item._id}">Delete</button>
        <hr>
      `;
      container.appendChild(div);
    });

    // Add delete listeners
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.getAttribute("data-id");
        if (!confirm("Are you sure you want to delete this feedback?")) return;

        try {
          const delResponse = await fetch(`/api/feedback/${id}`, {
            method: "DELETE"
          });

          if (delResponse.ok) {
            loadFeedback(); // refresh
          } else {
            alert("Failed to delete feedback");
          }
        } catch (err) {
          console.error("❌ Error deleting feedback:", err);
          alert("Error deleting feedback");
        }
      });
    });

  } catch (err) {
    console.error("❌ Error loading feedback:", err);
    container.innerHTML = "<p>Failed to load feedback. Try again later.</p>";
  }
}

document.addEventListener("DOMContentLoaded", loadFeedback);
