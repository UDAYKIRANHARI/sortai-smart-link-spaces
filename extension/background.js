const API_BASE_URL = "https://api.sortai.dev/api";
const WEB_APP_URL = "https://sortai.dev";

// Listen for messages from content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "CHECK_CONTEXT_SURFACE") {
    handleContextSurface(request.url, request.title, sender.tab?.id);
    return true;
  }
});

async function handleContextSurface(url, title, tabId) {
  if (!tabId) return;

  chrome.cookies.get({ url: WEB_APP_URL, name: "sortai_token" }, async (cookie) => {
    const token = cookie?.value;
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/context-surface`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ url, title })
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.hasMatches && data.highlights.length > 0) {
        chrome.tabs.sendMessage(tabId, {
          action: "RENDER_CONTEXT_SURFACE",
          data: data
        }).catch(() => {
          // Fallback: execute UI injection directly
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: renderContextSurfaceWidget,
            args: [data]
          });
        });
      }
    } catch (e) {
      console.warn("[SortAI Extension] Context surface fetch error:", e);
    }
  });
}

function renderContextSurfaceWidget(data) {
  if (document.getElementById("sortai-context-widget")) return;

  const container = document.createElement("div");
  container.id = "sortai-context-widget";
  container.innerHTML = `
    <style>
      #sortai-context-widget {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-sizing: border-box;
      }
      .sortai-card {
        width: 320px;
        background: rgba(17, 17, 17, 0.92);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(106, 106, 106, 0.3);
        border-radius: 16px;
        padding: 16px;
        color: #F7F7F7;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(52, 211, 153, 0.1);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        animation: sortaiSlideUp 0.4s ease-out;
      }
      @keyframes sortaiSlideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .sortai-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .sortai-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 600;
        color: #34D399;
        background: rgba(52, 211, 153, 0.12);
        padding: 4px 10px;
        border-radius: 20px;
        border: 1px solid rgba(52, 211, 153, 0.2);
      }
      .sortai-close {
        background: none;
        border: none;
        color: #6A6A6A;
        font-size: 16px;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 50%;
        line-height: 1;
      }
      .sortai-close:hover { color: #F7F7F7; background: rgba(255,255,255,0.1); }
      .sortai-title {
        font-size: 13px;
        font-weight: 500;
        color: #B5B5B5;
        margin-bottom: 12px;
        line-height: 1.4;
      }
      .sortai-list {
        display: flex;
        flex-col: column;
        gap: 8px;
      }
      .sortai-item {
        display: block;
        text-decoration: none;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.06);
        padding: 10px 12px;
        border-radius: 10px;
        transition: background 0.2s, border-color 0.2s;
      }
      .sortai-item:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(52, 211, 153, 0.3);
      }
      .sortai-item-title {
        font-size: 12px;
        font-weight: 600;
        color: #F7F7F7;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sortai-item-space {
        font-size: 10px;
        color: #34D399;
        font-weight: 500;
      }
    </style>
    <div class="sortai-card">
      <div class="sortai-header">
        <span class="sortai-badge">✨ Related Saved Links</span>
        <button class="sortai-close" id="sortai-widget-close">&times;</button>
      </div>
      <div class="sortai-title">You saved <strong>${data.matchCount} related link${data.matchCount > 1 ? 's' : ''}</strong> on this topic:</div>
      <div class="sortai-list">
        ${data.highlights.map(item => `
          <a href="${item.url}" target="_blank" class="sortai-item">
            <div class="sortai-item-title">${item.title}</div>
            <div class="sortai-item-space">${item.space} • View saved highlight →</div>
          </a>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(container);

  document.getElementById("sortai-widget-close")?.addEventListener("click", () => {
    container.remove();
  });
}
