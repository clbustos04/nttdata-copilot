document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // pequeña función para escapar texto y evitar XSS
  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Small helper to show messages consistently
  function showMessage(text, success = true) {
    messageDiv.textContent = text;
    // keep the base `message` class for consistent styling
    messageDiv.className = "message " + (success ? "success" : "error");
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset select to avoid duplicate options when refetching
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Construir la lista de participantes (DOM) para poder añadir control de borrado
        const participants = Array.isArray(details.participants) ? details.participants : [];
        const participantsContainer = document.createElement("div");
        participantsContainer.className = participants.length > 0 ? "participants" : "participants empty";

        if (participants.length > 0) {
          const title = document.createElement("strong");
          title.textContent = "Participants:";
          participantsContainer.appendChild(title);

          const ul = document.createElement("ul");

          participants.forEach((p) => {
            const li = document.createElement("li");

            // iniciales
            const initials = escapeHtml((p.split("@")[0] || "").slice(0, 2).toUpperCase());
            const initialsSpan = document.createElement("span");
            initialsSpan.className = "participant-initials";
            initialsSpan.textContent = initials;

            // email text
            const textSpan = document.createElement("span");
            textSpan.textContent = p;

            // remove button (icon)
            const removeBtn = document.createElement("button");
            removeBtn.className = "participant-remove";
            removeBtn.setAttribute("aria-label", `Unregister ${p}`);
            removeBtn.dataset.email = p;
            removeBtn.textContent = "✖";

            removeBtn.addEventListener("click", async (ev) => {
              ev.stopPropagation();
              try {
                removeBtn.disabled = true;
                const resp = await fetch(
                  `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(p)}`,
                  { method: "DELETE" }
                );
                const resJson = await resp.json();
                if (resp.ok) {
                  showMessage(resJson.message || `Removed ${p}`, true);
                  // refresh list
                  fetchActivities();
                } else {
                  showMessage(resJson.detail || "Failed to remove participant", false);
                }
              } catch (error) {
                console.error("Error removing participant:", error);
                showMessage("Failed to remove participant", false);
              } finally {
                removeBtn.disabled = false;
              }
            });

            li.appendChild(initialsSpan);
            li.appendChild(textSpan);
            li.appendChild(removeBtn);
            ul.appendChild(li);
          });

          participantsContainer.appendChild(ul);
        } else {
          participantsContainer.textContent = "No participants yet";
        }

        activityCard.appendChild(participantsContainer);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        signupForm.reset();
        showMessage(result.message || "Signed up successfully", true);
        // Refresh activities so the new participant appears immediately
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", false);
      }

      // message shown by showMessage
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", false);
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
