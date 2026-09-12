(function () {
  const API_BASE_URL = "https://api.sortai.dev/api";
  const WEB_APP_URL = "https://sortai.dev";

  // Prevent running on internal extension/sortai pages or inside iframes
  if (window.top !== window.self) return;
  const currentUrl = window.location.href;
  if (currentUrl.includes("sortai.dev") || currentUrl.includes("localhost") || currentUrl.startsWith("chrome://")) return;

  // Check login cookie from sortai.dev
  chrome.runtime.sendMessage({ action: "CHECK_CONTEXT_SURFACE", url: currentUrl, title: document.title });
})();
