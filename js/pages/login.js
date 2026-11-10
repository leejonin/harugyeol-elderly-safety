/**
 * 로그인 페이지 — 시연 계정 선택
 */
(function () {
  "use strict";
  var Common = window.Harugyeol.Common;
  var Data = window.Harugyeol.Data;

  Common.renderHeader("login", document.getElementById("site-header"));

  var session = Common.getSession();
  if (session) {
    window.location.href = Common.appPath("dashboard.html");
    return;
  }

  var store = Data.getStore();
  var mount = document.getElementById("login-cards");

  /**
   * 계정 카드 HTML 생성
   * @param {Object} user
   * @returns {string}
   */
  function cardHtml(user) {
    var elders = Common.getAccessibleElders(store, user.id);
    var names = elders.map(function (e) {
      return e.name;
    }).join(", ");
    return (
      '<div class="login-card">' +
      '<div class="login-card__icon" aria-hidden="true">' +
      (user.loginKey === "facility" ? "🏥" : "👨‍👩‍👧") +
      "</div>" +
      "<h2>" +
      Common.escapeHtml(user.name) +
      "</h2>" +
      '<p class="muted">' +
      Common.escapeHtml(user.role) +
      "</p>" +
      '<p>담당 어르신: <strong>' +
      Common.escapeHtml(names || "없음") +
      "</strong></p>" +
      '<button type="button" class="btn btn--large" data-login="' +
      Common.escapeHtml(user.loginKey) +
      '">' +
      Common.escapeHtml(user.name) +
      " 님으로 들어가기</button>" +
      "</div>"
    );
  }

  mount.innerHTML = store.users.map(cardHtml).join("");

  mount.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-login]");
    if (!btn) {
      return;
    }
    var key = btn.getAttribute("data-login");
    var user = Data.findUserByLoginKey(store, key);
    if (!user) {
      return;
    }
    Common.setSession({
      userId: user.id,
      name: user.name,
      role: user.role,
    });
    window.location.href = Common.appPath("dashboard.html");
  });

  document.getElementById("btn-reset-demo").addEventListener("click", function () {
    if (window.confirm("localStorage에 저장한 시연 입력을 지우고 예시 데이터로 돌아갑니다. 계속할까요?")) {
      Data.resetDemoData();
      Common.clearSession();
      window.location.reload();
    }
  });
})();
