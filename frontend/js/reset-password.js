async function getCsrfToken() {
  const res = await fetch("/api/csrf-token", { method: "GET" });
  return res.headers.get("X-CSRF-Token");
}

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");
const message = document.getElementById("message");

if (!token) {
  message.textContent = "Invalid or missing reset token.";
  message.style.color = "red";
  document.getElementById("resetForm").style.display = "none";
}

document
  .getElementById("resetForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      message.textContent = "Passwords do not match.";
      message.style.color = "red";
      return;
    }
    const csrfToken = await getCsrfToken();

    try {
      const res = await fetch("/api/v1/facilities/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      message.textContent = data.message || "Password updated.";
      message.style.color = "green";

      if (res.ok) {
        window.location.href = "/";
      }
    } catch (err) {
      message.textContent = "Error setting password.";
      message.style.color = "red";
    }
  });
