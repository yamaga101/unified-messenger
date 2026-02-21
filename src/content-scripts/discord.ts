/**
 * Content script for discord.com
 * Observes DOM for unread badge changes and relays to service worker.
 */

(() => {
  function getUnreadCount(): number {
    const badges = document.querySelectorAll(
      '[class*="numberBadge"], [class*="badge"], [data-list-item-id] [class*="unread"]',
    );

    let total = 0;
    for (const badge of badges) {
      const text = badge.textContent?.trim() ?? "";
      const num = parseInt(text, 10);
      if (!isNaN(num) && num > 0) {
        total += num;
      }
    }

    // Also check the title for unread indicator: "Discord (3)"
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
      service: "discord",
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

  // Also watch title changes
  const titleObserver = new MutationObserver(() => {
    sendUpdate();
  });

  const titleElement = document.querySelector("title");
  if (titleElement) {
    titleObserver.observe(titleElement, {
      childList: true,
      characterData: true,
    });
  }

  // Periodic fallback
  setInterval(sendUpdate, 5000);
})();
