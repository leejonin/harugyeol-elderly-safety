/**
 * 하루결 시연용 웹 공통 유틸리티
 * @namespace Harugyeol
 */
(function (global) {
  "use strict";

  var SESSION_KEY = "harugyeol_session";

  /**
   * GitHub Pages 등 하위 경로에서도 동작하도록 상대 경로를 만듭니다.
   * @param {string} relative - 예: login.html, css/style.css
   * @returns {string}
   */
  function appPath(relative) {
    if (global.location.protocol === "file:") {
      return relative;
    }
    var path = global.location.pathname || "/";
    var base = path.endsWith("/") ? path : path.replace(/\/[^/]*$/, "/");
    return base + relative.replace(/^\//, "");
  }

  /**
   * 상태 코드별 표시 문구와 배지 클래스
   * @type {Object.<string, {label: string, badgeClass: string}>}
   */
  var STATUS_MAP = {
    no_anomaly_observed: {
      label: "현재 확인된 이상 변화 없음",
      badgeClass: "status-badge--ok",
    },
    check_needed: {
      label: "안부 확인 필요",
      badgeClass: "status-badge--alert",
    },
    voice_pending: {
      label: "음성 안부 확인 진행 중",
      badgeClass: "status-badge--watch",
    },
    guardian_pending: {
      label: "보호자 확인 요청됨",
      badgeClass: "status-badge--watch",
    },
    agency_pending: {
      label: "관리기관 연결 요청됨",
      badgeClass: "status-badge--watch",
    },
    insufficient_data: {
      label: "개인별 비교 데이터 부족",
      badgeClass: "status-badge--neutral",
    },
    motion_none: {
      label: "움직임 미감지(데이터 수신됨)",
      badgeClass: "status-badge--neutral",
    },
    data_not_received: {
      label: "센서 데이터 수신 안 됨",
      badgeClass: "status-badge--device",
    },
    device_disconnected: {
      label: "기기 연결 이상",
      badgeClass: "status-badge--device",
    },
  };

  /**
   * 전달 상태 표시
   * @type {Object.<string, string>}
   */
  var DELIVERY_LABELS = {
    requested: "요청함",
    delivered: "전달됨",
    acknowledged: "확인함",
  };

  /**
   * URL 쿼리 파라미터를 읽습니다.
   * @param {string} name - 파라미터 이름
   * @returns {string|null}
   */
  function getQueryParam(name) {
    var params = new URLSearchParams(global.location.search);
    return params.get(name);
  }

  /**
   * ISO 시각 문자열을 한국어 로컬 형식으로 표시합니다.
   * @param {string|null|undefined} iso - ISO 8601 시각
   * @returns {string}
   */
  function formatDateTime(iso) {
    if (!iso) {
      return "—";
    }
    try {
      var d = new Date(iso);
      return d.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return iso;
    }
  }

  /**
   * 상태 배지 HTML을 반환합니다.
   * @param {string} statusCode - STATUS_MAP 키
   * @returns {string}
   */
  function renderStatusBadge(statusCode) {
    var info = STATUS_MAP[statusCode] || {
      label: statusCode,
      badgeClass: "status-badge--neutral",
    };
    return (
      '<span class="status-badge ' +
      info.badgeClass +
      '" role="status">' +
      escapeHtml(info.label) +
      "</span>"
    );
  }

  /**
   * HTML 이스케이프
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (str == null) {
      return "";
    }
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * 현재 로그인 세션을 반환합니다.
   * @returns {{userId: string, name: string, role: string}|null}
   */
  function getSession() {
    try {
      var raw = global.localStorage.getItem(SESSION_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /**
   * 로그인 세션을 저장합니다.
   * @param {{userId: string, name: string, role: string}} session
   */
  function setSession(session) {
    global.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  /**
   * 로그아웃합니다.
   */
  function clearSession() {
    global.localStorage.removeItem(SESSION_KEY);
  }

  /**
   * 인증이 필요한 페이지에서 세션 없으면 login.html로 이동합니다.
   * @returns {{userId: string, name: string, role: string}|null}
   */
  function requireAuth() {
    var session = getSession();
    if (!session) {
      global.location.href = appPath("login.html");
      return null;
    }
    return session;
  }

  /**
   * 시연 배너 HTML
   * @returns {string}
   */
  function renderDemoBanner() {
    return (
      '<div class="demo-banner" role="note">' +
      "시연 화면입니다. 표시 데이터는 예시이며, 센서·AI·스피커·외부 알림은 실제 연동되지 않았습니다." +
      "</div>"
    );
  }

  /**
   * 연동 미연동 태그 HTML
   * @returns {string}
   */
  /**
   * GPT API 키가 저장되어 있는지 확인합니다.
   * @returns {boolean}
   */
  function isGptChatConfigured() {
    try {
      var raw = global.localStorage.getItem("harugyeol_llm_config");
      if (!raw) {
        return false;
      }
      var c = JSON.parse(raw);
      return !!(c.apiKey && !c.forceMock);
    } catch (e) {
      return false;
    }
  }

  function renderIntegrationTags() {
    var items = [
      { name: "센서", on: false },
      { name: "AI 분석", on: false },
      { name: "스피커", on: false },
      { name: "외부 알림", on: false },
      { name: "AI 대화(GPT)", on: isGptChatConfigured() },
    ];
    var html = '<div class="integration-tags">';
    items.forEach(function (item) {
      var cls = item.on ? "integration-tag" : "integration-tag integration-tag--off";
      var label = item.name + (item.on ? " 연동" : " 미연동");
      html += '<span class="' + cls + '">' + escapeHtml(label) + "</span>";
    });
    html += "</div>";
    return html;
  }

  /**
   * 모바일 하단 빠른 이동 메뉴 HTML
   * @param {string} activePage
   * @returns {string}
   */
  function renderMobileBottomNav(activePage) {
    return (
      '<nav class="mobile-bottom-nav" aria-label="빠른 이동">' +
      bottomNavLink("dashboard.html", "대시보드", activePage === "dashboard") +
      bottomNavLink("pattern.html", "생활패턴", activePage === "pattern") +
      bottomNavLink("alerts.html", "알림", activePage === "alerts") +
      bottomNavLink("settings.html", "설정", activePage === "settings") +
      "</nav>"
    );
  }

  /**
   * @param {string} href
   * @param {string} label
   * @param {boolean} current
   * @returns {string}
   */
  function bottomNavLink(href, label, current) {
    var attr = current ? ' aria-current="page"' : "";
    return (
      '<a class="mobile-bottom-nav__item" href="' +
      appPath(href) +
      '"' +
      attr +
      ">" +
      escapeHtml(label) +
      "</a>"
    );
  }

  /**
   * 모바일 메뉴 토글 바인딩
   * @param {HTMLElement} mountEl
   */
  function bindMobileNavToggle(mountEl) {
    var toggle = mountEl.querySelector("#nav-toggle");
    var nav = mountEl.querySelector("#site-nav-primary");
    if (!toggle || !nav) {
      return;
    }
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /**
   * 기존 하단 네비 제거 후 필요 시 다시 붙입니다.
   * @param {string|null} bottomNavHtml
   */
  function mountMobileBottomNav(bottomNavHtml) {
    var existing = global.document.getElementById("harugyeol-bottom-nav");
    if (existing) {
      existing.remove();
    }
    global.document.body.classList.remove("has-bottom-nav");
    if (!bottomNavHtml) {
      return;
    }
    var wrap = global.document.createElement("div");
    wrap.id = "harugyeol-bottom-nav";
    wrap.innerHTML = bottomNavHtml;
    global.document.body.appendChild(wrap);
    global.document.body.classList.add("has-bottom-nav");
  }

  /**
   * 공통 헤더를 렌더링합니다.
   * @param {string} activePage - dashboard | pattern | alerts | settings | dataset | chat | help | intro | login
   * @param {HTMLElement} mountEl
   */
  function renderHeader(activePage, mountEl) {
    if (!mountEl) {
      return;
    }
    var session = getSession();
    var nav = "";
    var navToggle =
      '<button type="button" class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="site-nav-primary">메뉴</button>';
    if (session) {
      nav =
        '<nav class="site-nav" id="site-nav-primary" aria-label="주요 메뉴">' +
        navLink("dashboard.html", "대시보드", activePage === "dashboard") +
        navLink("pattern.html", "생활패턴", activePage === "pattern") +
        navLink("alerts.html", "알림·대응", activePage === "alerts") +
        navLink("settings.html", "설정", activePage === "settings") +
        navLink("chat.html", "AI 대화", activePage === "chat") +
        navLink("dataset.html", "CSV 시연", activePage === "dataset") +
        navLink("help.html", "도움", activePage === "help") +
        '<a href="' + appPath("index.html") + '">서비스 소개</a>' +
        '<button type="button" class="btn btn--secondary btn--small" id="btn-logout">로그아웃</button>' +
        "</nav>";
    } else {
      nav =
        '<nav class="site-nav site-nav--compact" id="site-nav-primary">' +
        '<a href="' + appPath("index.html") + '">서비스 소개</a>' +
        '<a href="' + appPath("login.html") + '">로그인</a>' +
        "</nav>";
      navToggle = "";
    }
    var userLine = session
      ? '<span class="user-meta">' +
        escapeHtml(session.name) +
        " (" +
        escapeHtml(session.role) +
        ")</span>"
      : "";
    mountEl.innerHTML =
      renderDemoBanner() +
      '<header class="site-header">' +
      '<div class="site-header__inner">' +
      '<div class="site-header__row">' +
      '<a class="site-logo" href="' +
      appPath(session ? "dashboard.html" : "index.html") +
      '">하루결</a>' +
      navToggle +
      "</div>" +
      userLine +
      nav +
      "</div></header>";

    bindMobileNavToggle(mountEl);

    var logoutBtn = mountEl.querySelector("#btn-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        clearSession();
        global.location.href = appPath("login.html");
      });
    }

    if (session && activePage !== "intro" && activePage !== "login" && activePage !== "help") {
      mountMobileBottomNav(renderMobileBottomNav(activePage));
    } else {
      mountMobileBottomNav(null);
    }
  }

  /**
   * 대상자별 AI 대화 요약 스레드를 읽습니다.
   * @param {string} elderId
   * @returns {{ lastSummary: string|null, updatedAt: string|null }|null}
   */
  function getChatThreadSummary(elderId) {
    try {
      var raw = global.localStorage.getItem("harugyeol_chat_" + elderId);
      if (!raw) {
        return null;
      }
      var t = JSON.parse(raw);
      if (!t.lastSummary) {
        return null;
      }
      return { lastSummary: t.lastSummary, updatedAt: t.updatedAt };
    } catch (e) {
      return null;
    }
  }

  /**
   * @param {string} href
   * @param {string} label
   * @param {boolean} current
   * @returns {string}
   */
  function navLink(href, label, current) {
    var attr = current ? ' aria-current="page"' : "";
    return (
      '<a href="' + appPath(href) + '"' + attr + ">" + escapeHtml(label) + "</a>"
    );
  }

  /**
   * 로그인 사용자가 접근 가능한 어르신 ID 목록
   * @param {Object} store - Harugyeol.Data.getStore()
   * @param {string} userId
   * @returns {string[]}
   */
  function getAccessibleElderIds(store, userId) {
    var user = store.users.find(function (u) {
      return u.id === userId;
    });
    if (!user) {
      return [];
    }
    return user.elderIds || [];
  }

  /**
   * 접근 가능한 어르신만 필터
   * @param {Object} store
   * @param {string} userId
   * @returns {Object[]}
   */
  function getAccessibleElders(store, userId) {
    var ids = getAccessibleElderIds(store, userId);
    return store.elders.filter(function (e) {
      return ids.indexOf(e.id) >= 0;
    });
  }

  global.Harugyeol = global.Harugyeol || {};
  global.Harugyeol.Common = {
    STATUS_MAP: STATUS_MAP,
    DELIVERY_LABELS: DELIVERY_LABELS,
    getQueryParam: getQueryParam,
    formatDateTime: formatDateTime,
    renderStatusBadge: renderStatusBadge,
    escapeHtml: escapeHtml,
    getSession: getSession,
    setSession: setSession,
    clearSession: clearSession,
    requireAuth: requireAuth,
    renderDemoBanner: renderDemoBanner,
    renderIntegrationTags: renderIntegrationTags,
    renderHeader: renderHeader,
    getAccessibleElderIds: getAccessibleElderIds,
    getAccessibleElders: getAccessibleElders,
    isGptChatConfigured: isGptChatConfigured,
    getChatThreadSummary: getChatThreadSummary,
    appPath: appPath,
  };
})(window);
