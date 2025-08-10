async function getCsrfToken() {
    const res = await fetch("/api/csrf-token", { method: "GET" });
    return res.headers.get("X-CSRF-Token");
}

document.getElementById("forgotForm").addEventListener("submit", async function(e) {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const message = document.getElementById("message");
      const token = await getCsrfToken();


      try {
        const res = await fetch("/api/v1/facilities/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json","X-CSRF-Token": token },
          body: JSON.stringify({ email })
        });

        const data = await res.json();
        message.textContent = data.message || "Request processed.";
        message.style.color = "green";

        if (res.ok) {
          setTimeout(() => {
            window.location.href = "/";
          }, 3000);
        }
      } catch (err) {
        message.textContent = "Error sending request.";
        message.style.color = "red";
      }
    });