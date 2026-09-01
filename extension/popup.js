const API_BASE_URL = "https://api.sortai.dev/api";
const WEB_APP_URL = "https://sortai.dev";

// DOM Elements
const loginView = document.getElementById("login-view");
const saveView = document.getElementById("save-view");
const currentUrlEl = document.getElementById("current-url");
const saveBtn = document.getElementById("save-btn");
const openWebAppBtn = document.getElementById("open-webapp-btn");
const saveStatus = document.getElementById("save-status");

let authToken = null;
let currentTabUrl = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  checkLoginState();
});

// Check if user is logged in by reading the cookie from localhost
function checkLoginState() {
  chrome.cookies.get({ url: WEB_APP_URL, name: "sortai_token" }, (cookie) => {
    if (cookie && cookie.value) {
      authToken = cookie.value;
      showSaveView();
    } else {
      showLoginView();
    }
  });
}

function showLoginView() {
  loginView.style.display = "block";
  saveView.style.display = "none";
}

function showSaveView() {
  loginView.style.display = "none";
  saveView.style.display = "block";
  
  // Get active tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      currentTabUrl = tabs[0].url;
      currentUrlEl.textContent = currentTabUrl;
    }
  });
}

// Open Web App to login
openWebAppBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: WEB_APP_URL });
});

// Handle Save Link
saveBtn.addEventListener("click", async () => {
  if (!currentTabUrl || !authToken) return;

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";
  saveStatus.textContent = "";

  try {
    const response = await fetch(`${API_BASE_URL}/links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify({ url: currentTabUrl, savedFrom: 'extension' })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Session expired. Please log into the web app again.");
      }
      throw new Error("Failed to save link");
    }

    saveStatus.textContent = "✓ Link saved successfully!";
    saveStatus.className = "status-success";
    
    // Reset button after 2 seconds
    setTimeout(() => {
      saveStatus.textContent = "";
      saveBtn.disabled = false;
      saveBtn.textContent = "Save to Sort AI";
    }, 2000);

  } catch (error) {
    saveStatus.textContent = `✕ ${error.message}`;
    saveStatus.className = "status-error";
    saveBtn.disabled = false;
    saveBtn.textContent = "Save to Sort AI";
  }
});
