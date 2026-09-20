const botTag = new MutationObserver(() => {
  document.querySelectorAll(".botText__82f07").forEach(el => {
    el.textContent = "BOT";
  });
});

botTag.observe(document.body, { childList: true, subtree: true });
