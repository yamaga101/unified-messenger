/**
 * Content script for chat.line.me
 * Observes DOM for unread badge changes and relays to service worker.
 */

(() => {
  function getUnreadCount(): number {
    const badges = document.querySelectorAll(
      '[class*="badge"], [class*="unread"], [class*="count"]',
    );

    let total = 0;
    for (const badge of badges) {
      const text = badge.textContent?.trim() ?? "";
      const num = parseInt(text, 10);
      if (!isNaN(num) && num > 0) {
        total += num;
      }
    }

    // Check page title: "LINE (5)"
    const titleMatch = document.title.match(/\((\d+)\)/);
    if (titleMatch) {
      const titleCount = parseInt(titleMatch[1], 10);
      if (titleCount > total) {
        total = titleCount;
      }
    }

    return total;
  }

  function sendUpdate(): void {
    const count = getUnreadCount();
    chrome.runtime.sendMessage({
      type: "BADGE_UPDATE",
      service: "line",
      count,
    }).catch(() => {
      // Extension context invalidated
    });
  }

  // Initial check
  sendUpdate();

  // Observe DOM changes
  const observer = new MutationObserver(() => {
    sendUpdate();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  // Watch title
  const titleElement = document.querySelector("title");
  if (titleElement) {
    const titleObserver = new MutationObserver(() => {
      sendUpdate();
    });
    titleObserver.observe(titleElement, {
      childList: true,
      characterData: true,
    });
  }

  // Periodic fallback
  setInterval(sendUpdate, 5000);
})();
