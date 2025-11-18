(function(){
  const report = {};
  const selectors = {
    loginForm: '#login-form, [data-auth="login-form"], #loginForm',
    emailInput: '#login-email, input[name="email"], input[type="email"]',
    passwordInput: '#login-password, input[name="password"], input[type="password"]',
    guestMenu: '#auth-menu-guest, [data-auth="signed-out"]',
    userMenu: '#auth-menu-user, [data-auth="signed-in"]',
    logoutBtn: '#logout-btn, #logoutBtn, [data-action="logout"]',
  };
  for (const [key, sel] of Object.entries(selectors)) {
    const el = document.querySelector(sel);
    report[key] = !!el;
  }
  console.group('[Auth Selector Diagnostic]');
  console.table(report);
  console.groupEnd();
  window.__AUTH_SELECTOR_REPORT = report;
})();