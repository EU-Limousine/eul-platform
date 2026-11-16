// Runs before the app (no flash of the wrong theme). Light is the default.
// The choice is a UI preference only, so localStorage is fine here (never tokens).
(function () {
  try {
    if (localStorage.getItem('eul.theme') === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {
    /* storage blocked: stay light */
  }
})();
