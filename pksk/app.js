/*
  REQOO PKSK LANDING V1
  Payment remains in the existing Reqoo order system.
  Do NOT replace backend/Code.gs wholesale.
*/
const CONFIG = {
  ORDER_URL: "/pksk/payment/",
  VERIFY_URL: "", // Fill only after the PKSK access-code endpoint is added to the existing Reqoo backend.
  SIMULATOR_URL: "/pksk/simulator/"
};

document.getElementById("buyBtn").href = CONFIG.ORDER_URL;
document.getElementById("buyBtn2").href = CONFIG.ORDER_URL;

const form = document.getElementById("accessForm");
const message = document.getElementById("accessMessage");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = document.getElementById("accessCode").value.trim().toUpperCase();

  if (!code) return;

  if (!CONFIG.VERIFY_URL) {
    message.textContent = "Sistem akses sedang disediakan. Selepas pembelian disahkan, gunakan kod akses yang diberikan oleh Reqoo.";
    return;
  }

  message.textContent = "Menyemak kod…";

  try {
    const response = await fetch(CONFIG.VERIFY_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ action:"verifyAccessCode", code })
    });

    const data = await response.json();

    if (data.ok && data.active) {
      window.location.href = CONFIG.SIMULATOR_URL;
      return;
    }

    message.textContent = data.message || "Kod akses tidak sah atau belum diaktifkan.";
  } catch (error) {
    message.textContent = "Tidak dapat menyemak kod buat masa ini. Sila cuba lagi.";
  }
});
