// navbarModals.js

export function attachNavbarModals() {
  const modals = {
    login: () => document.getElementById("loginModal"),
    tracker: () => document.getElementById("orderTrackerModal"),
    signup: () => document.getElementById("signupModal")
  };

  function showModal(modal) {
    if (!modal) return;
    modal.hidden = false;
    modal.classList.remove("hidden");
    requestAnimationFrame(() => modal.classList.add("visible"));
    const first = modal.querySelector("input, select, textarea, button, a[href]");
    setTimeout(() => first?.focus?.(), 80);
  }

  function hideModal(modal) {
    if (!modal) return;
    modal.classList.remove("visible");
    setTimeout(() => {
      modal.classList.add("hidden");
      modal.hidden = true;
    }, 250);
  }

  function openNamedModal(name = "login") {
    const getModal = modals[name] || modals.login;
    showModal(getModal());
  }

  window.PP_openAuthModal = openNamedModal;
  window.PP_closeAuthModal = (id = "loginModal") => hideModal(document.getElementById(id));

  if (document.documentElement.dataset.ppNavbarModalsDelegated === "1") return;
  document.documentElement.dataset.ppNavbarModalsDelegated = "1";

  document.addEventListener("click", e => {
    const login = e.target.closest('[data-toggle="login-modal"]');
    if (login) {
      e.preventDefault();
      showModal(modals.login());
      return;
    }

    const tracker = e.target.closest('[data-toggle="order-tracker-modal"]');
    if (tracker) {
      e.preventDefault();
      showModal(modals.tracker());
      return;
    }

    const signup = e.target.closest('[data-toggle="signup-modal"]');
    if (signup) {
      e.preventDefault();
      showModal(modals.signup());
      return;
    }

    const close = e.target.closest("[data-close]");
    if (close) {
      const target = close.getAttribute("data-close");
      hideModal(document.getElementById(target));
    }
  });

  // ESC key closes all modals
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      Object.values(modals).forEach(getModal => hideModal(getModal()));
    }
  });

  // Click outside modal content closes modal
  document.addEventListener("click", e => {
    const modal = e.target.closest?.(".custom-modal");
    if (modal && e.target === modal) hideModal(modal);
  });

  // Optional mobile swipe down to close
  let startY = 0;
  document.addEventListener("touchstart", e => {
    if (!e.target.closest?.(".custom-modal")) return;
    startY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchend", e => {
    const modal = e.target.closest?.(".custom-modal");
    if (!modal) return;
    const endY = e.changedTouches[0].clientY;
    if (endY - startY > 100) hideModal(modal);
  });

  // Order tracker form redirect
  document.getElementById("orderTrackerForm")?.addEventListener("submit", e => {
    e.preventDefault();
    window.location.href = "/order-tracker.html";
  });
}
