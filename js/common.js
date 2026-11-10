/**
 * 하루결 시연용 웹 공통 유틸리티
 * @namespace Harugyeol
 */
(function (global) {
  "use strict";

  var SESSION_KEY = "harugyeol_session";
  var VIEW_PREFS_KEY = "harugyeol_view_prefs";
  var TEXT_SIZES = ["normal", "large", "xlarge"];

  /**
   * 보기 설정(글자 크기·고대비)을 읽습니다.
   * @returns {{text: string, contrast: boolean}}
   */
  function getViewPrefs() {
    var prefs = { text: "normal", contrast: false };
    try {
      var raw = global.localStorage.getItem(VIEW_PREFS_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (TEXT_SIZES.indexOf(p.text) >= 0) {
          prefs.text = p.text;
        }
        prefs.contrast = !!p.contrast;
      }
    } catch (e) {
      /* 저장소를 쓸 수 없으면 기본값 */
    }
    return prefs;
  }

  /**
   * 보기 설정을 문서에 적용하고 저장합니다.
   * @param {{text: string, contrast: boolean}} prefs
   * @param {boolean} [persist]
   */
  function applyViewPrefs(prefs, persist) {
    var root = global.document.documentElement;
    root.setAttribute("data-text-size", prefs.text);
    root.setAttribute("data-contrast", prefs.contrast ? "high" : "normal");
    if (persist) {
      try {
        global.localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify(prefs));
      } catch (e) {
        /* ignore */
      }
    }
  }

  applyViewPrefs(getViewPrefs(), false);

  /**
   * 헤더의 보기 설정 버튼 HTML
   * @returns {string}
   */
  function renderViewBar() {
    var prefs = getViewPrefs();
    var sizeLabel = { normal: "보통", large: "크게", xlarge: "아주 크게" }[prefs.text];
    return (
      '<div class="view-bar" role="group" aria-label="보기 설정">' +
      '<button type="button" class="view-bar__btn" id="btn-text-size" aria-label="글자 크기 바꾸기, 지금 ' +
      sizeLabel +
      '">' +
      '<span class="view-bar__glyph" aria-hidden="true">가<span>가</span></span>' +
      '<span class="view-bar__text">글자 ' +
      sizeLabel +
      "</span></button>" +
      '<button type="button" class="view-bar__btn" id="btn-contrast" aria-pressed="' +
      (prefs.contrast ? "true" : "false") +
      '">' +
      '<span class="view-bar__glyph" aria-hidden="true">🌓</span>' +
      '<span class="view-bar__text">' +
      (prefs.contrast ? "선명하게 켜짐" : "선명하게") +
      "</span></button>" +
      "</div>"
    );
  }

  /**
   * 보기 설정 버튼 동작
   * @param {HTMLElement} mountEl
   */
  function bindViewBar(mountEl) {
    var sizeBtn = mountEl.querySelector("#btn-text-size");
    var contrastBtn = mountEl.querySelector("#btn-contrast");
    var labels = { normal: "보통", large: "크게", xlarge: "아주 크게" };
    if (sizeBtn) {
      sizeBtn.addEventListener("click", function () {
        var prefs = getViewPrefs();
        prefs.text = TEXT_SIZES[(TEXT_SIZES.indexOf(prefs.text) + 1) % TEXT_SIZES.length];
        applyViewPrefs(prefs, true);
        sizeBtn.querySelector(".view-bar__text").textContent = "글자 " + labels[prefs.text];
        sizeBtn.setAttribute("aria-label", "글자 크기 바꾸기, 지금 " + labels[prefs.text]);
      });
    }
    if (contrastBtn) {
      contrastBtn.addEventListener("click", function () {
        var prefs = getViewPrefs();
        prefs.contrast = !prefs.contrast;
        applyViewPrefs(prefs, true);
        contrastBtn.setAttribute("aria-pressed", prefs.contrast ? "true" : "false");
        contrastBtn.querySelector(".view-bar__text").textContent = prefs.contrast
          ? "선명하게 켜짐"
          : "선명하게";
      });
    }
  }
  var PATTERN_ANALYSIS_SESSION_KEY = "harugyeol_pattern_analysis_active";

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
      icon: "🙂",
      tone: "ok",
      easy: "평소와 다른 점이 보이지 않아요",
    },
    check_needed: {
      label: "안부 확인 필요",
      badgeClass: "status-badge--alert",
      icon: "🚨",
      tone: "alert",
      easy: "지금 안부를 확인해 주세요",
    },
    voice_pending: {
      label: "음성 안부 확인 진행 중",
      badgeClass: "status-badge--watch",
      icon: "🔊",
      tone: "watch",
      easy: "스피커로 안부를 묻고 있어요",
    },
    guardian_pending: {
      label: "보호자 확인 요청됨",
      badgeClass: "status-badge--watch",
      icon: "📞",
      tone: "watch",
      easy: "가족에게 확인을 부탁했어요",
    },
    agency_pending: {
      label: "관리기관 연결 요청됨",
      badgeClass: "status-badge--watch",
      icon: "🏥",
      tone: "watch",
      easy: "관리기관에 연결을 요청했어요",
    },
    insufficient_data: {
      label: "개인별 비교 데이터 부족",
      badgeClass: "status-badge--neutral",
      icon: "📊",
      tone: "neutral",
      easy: "아직 평소 생활을 배우는 중이에요",
    },
    motion_none: {
      label: "움직임 미감지(데이터 수신됨)",
      badgeClass: "status-badge--neutral",
      icon: "💤",
      tone: "neutral",
      easy: "최근 움직임이 감지되지 않았어요",
    },
    data_not_received: {
      label: "센서 데이터 수신 안 됨",
      badgeClass: "status-badge--device",
      icon: "📡",
      tone: "device",
      easy: "기기에서 소식이 오지 않아요",
    },
    device_disconnected: {
      label: "기기 연결 이상",
      badgeClass: "status-badge--device",
      icon: "🔌",
      tone: "device",
      easy: "기기 연결을 확인해 주세요",
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
      '">' +
      (info.icon
        ? '<span class="status-badge__icon" aria-hidden="true">' + info.icon + "</span>"
        : "") +
      escapeHtml(info.label) +
      "</span>"
    );
  }

  /**
   * 상태 정보(아이콘·쉬운 문구 포함)를 반환합니다.
   * @param {string} statusCode
   * @returns {{label: string, badgeClass: string, icon?: string, tone?: string, easy?: string}}
   */
  function getStatusInfo(statusCode) {
    return (
      STATUS_MAP[statusCode] || {
        label: statusCode,
        badgeClass: "status-badge--neutral",
        icon: "ℹ️",
        tone: "neutral",
        easy: statusCode,
      }
    );
  }

  /**
   * "2시간 전"처럼 읽기 쉬운 상대 시각을 반환합니다.
   * @param {string|null|undefined} iso
   * @returns {string}
   */
  function formatRelative(iso) {
    if (!iso) {
      return "기록 없음";
    }
    var t = new Date(iso).getTime();
    if (isNaN(t)) {
      return String(iso);
    }
    var diffMin = Math.round((Date.now() - t) / 60000);
    if (diffMin < 0) {
      return formatDateTime(iso);
    }
    if (diffMin < 1) {
      return "방금 전";
    }
    if (diffMin < 60) {
      return diffMin + "분 전";
    }
    var h = Math.floor(diffMin / 60);
    if (h < 24) {
      return h + "시간 전";
    }
    var d = Math.floor(h / 24);
    if (d < 7) {
      return d + "일 전";
    }
    return formatDateTime(iso);
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
    var extra = "";
    if (isPatternAnalysisAvailable()) {
      extra =
        " CSV 규칙 시연 분석이 활성화된 화면입니다(실제 센서·클라우드 AI 학습 모델 아님).";
    }
    return (
      '<div class="demo-banner" role="note">' +
      "시연 화면입니다. 표시 데이터는 예시이며, 센서·AI·스피커·외부 알림은 실제 연동되지 않았습니다." +
      extra +
      "</div>"
    );
  }

  /**
   * CSV 규칙 분석 시연이 이 세션에서 활성화되었는지 확인합니다.
   * @returns {boolean}
   */
  function isPatternAnalysisAvailable() {
    try {
      return global.sessionStorage.getItem(PATTERN_ANALYSIS_SESSION_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  /**
   * CSV 규칙 분석 연동 플래그를 설정합니다.
   * @param {boolean} active
   */
  function setPatternAnalysisActive(active) {
    try {
      if (active) {
        global.sessionStorage.setItem(PATTERN_ANALYSIS_SESSION_KEY, "1");
      } else {
        global.sessionStorage.removeItem(PATTERN_ANALYSIS_SESSION_KEY);
      }
    } catch (e) {
      /* ignore */
    }
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
      { name: "AI 분석(규칙·CSV)", on: isPatternAnalysisAvailable() },
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
      bottomNavLink("dashboard.html", "홈", activePage === "dashboard", "🏠") +
      bottomNavLink("pattern.html", "생활", activePage === "pattern", "📈") +
      bottomNavLink("alerts.html", "알림", activePage === "alerts", "🔔") +
      bottomNavLink("chat.html", "대화", activePage === "chat", "💬") +
      bottomNavLink("settings.html", "설정", activePage === "settings", "⚙️") +
      "</nav>"
    );
  }

  /**
   * @param {string} href
   * @param {string} label
   * @param {boolean} current
   * @returns {string}
   */
  function bottomNavLink(href, label, current, icon) {
    var attr = current ? ' aria-current="page"' : "";
    return (
      '<a class="mobile-bottom-nav__item" href="' +
      appPath(href) +
      '"' +
      attr +
      ">" +
      (icon ? '<span class="mobile-bottom-nav__icon" aria-hidden="true">' + icon + "</span>" : "") +
      '<span class="mobile-bottom-nav__label">' +
      escapeHtml(label) +
      "</span></a>"
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
        navLink("dashboard.html", "대시보드", activePage === "dashboard", "🏠") +
        navLink("pattern.html", "생활패턴", activePage === "pattern", "📈") +
        navLink("alerts.html", "알림·대응", activePage === "alerts", "🔔") +
        navLink("chat.html", "AI 대화", activePage === "chat", "💬") +
        navLink("settings.html", "설정", activePage === "settings", "⚙️") +
        navLink("dataset.html", "CSV 시연", activePage === "dataset", "🗂️") +
        navLink("help.html", "도움말", activePage === "help", "❓") +
        navLink("index.html", "서비스 소개", activePage === "intro", "ℹ️") +
        '<button type="button" class="btn btn--secondary btn--small" id="btn-logout">로그아웃</button>' +
        "</nav>";
    } else {
      nav =
        '<nav class="site-nav site-nav--compact" id="site-nav-primary">' +
        navLink("index.html", "서비스 소개", activePage === "intro", "ℹ️") +
        navLink("login.html", "로그인", activePage === "login", "🔑") +
        "</nav>";
      navToggle = "";
    }
    var userLine = session
      ? '<span class="user-meta"><span aria-hidden="true">👤</span> ' +
        escapeHtml(session.name) +
        " 님 · " +
        escapeHtml(session.role) +
        "</span>"
      : "";
    mountEl.innerHTML =
      '<a class="skip-link" href="#main-content">본문으로 바로가기</a>' +
      renderDemoBanner() +
      '<header class="site-header">' +
      '<div class="site-header__inner">' +
      '<div class="site-header__row">' +
      '<a class="site-logo" href="' +
      appPath(session ? "dashboard.html" : "index.html") +
      '"><span class="site-logo__mark" aria-hidden="true">🌿</span>하루결</a>' +
      renderViewBar() +
      navToggle +
      "</div>" +
      userLine +
      nav +
      "</div></header>";

    var mainEl = global.document.querySelector("main");
    if (mainEl && !mainEl.id) {
      mainEl.id = "main-content";
    }
    if (mainEl) {
      mainEl.setAttribute("tabindex", "-1");
    }

    bindMobileNavToggle(mountEl);
    bindViewBar(mountEl);

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
  function navLink(href, label, current, icon) {
    var attr = current ? ' aria-current="page"' : "";
    return (
      '<a href="' +
      appPath(href) +
      '"' +
      attr +
      ">" +
      (icon ? '<span class="nav-icon" aria-hidden="true">' + icon + "</span>" : "") +
      escapeHtml(label) +
      "</a>"
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
    getStatusInfo: getStatusInfo,
    formatRelative: formatRelative,
    getViewPrefs: getViewPrefs,
    applyViewPrefs: applyViewPrefs,
    escapeHtml: escapeHtml,
    getSession: getSession,
    setSession: setSession,
    clearSession: clearSession,
    requireAuth: requireAuth,
    renderDemoBanner: renderDemoBanner,
    isPatternAnalysisAvailable: isPatternAnalysisAvailable,
    setPatternAnalysisActive: setPatternAnalysisActive,
    renderIntegrationTags: renderIntegrationTags,
    renderHeader: renderHeader,
    getAccessibleElderIds: getAccessibleElderIds,
    getAccessibleElders: getAccessibleElders,
    isGptChatConfigured: isGptChatConfigured,
    getChatThreadSummary: getChatThreadSummary,
    appPath: appPath,
  };
})(window);
