/**
 * 안전관리 대시보드 페이지
 */
(function () {
  "use strict";
  var Common = window.Harugyeol.Common;
  var Data = window.Harugyeol.Data;

  var session = Common.requireAuth();
  if (!session) {
    return;
  }

  Common.renderHeader("dashboard", document.getElementById("site-header"));

  var integrationMount = document.getElementById("integration-mount");
  integrationMount.innerHTML = Common.renderIntegrationTags();

  var helpBannerHtml = "";
  if (!localStorage.getItem("harugyeol_help_banner_dismissed")) {
    helpBannerHtml =
      '<div class="dashboard-help-banner" id="dashboard-help-banner">' +
      "<span>처음이신가요? <strong>사용자 도움</strong>에서 AI 대화와 대시보드 사용법을 안내합니다.</span>" +
      '<span><a class="btn btn--small btn--secondary" href="' +
      Common.appPath("dataset.html") +
      '">CSV 시연</a> ' +
      '<a class="btn btn--small" href="help.html">도움 보기</a> ' +
      '<button type="button" class="btn btn--secondary btn--small" id="btn-dismiss-help">닫기</button></span>' +
      "</div>";
  }
  integrationMount.insertAdjacentHTML("afterend", helpBannerHtml);
  var dismissBtn = document.getElementById("btn-dismiss-help");
  if (dismissBtn) {
    dismissBtn.addEventListener("click", function () {
      localStorage.setItem("harugyeol_help_banner_dismissed", "1");
      var banner = document.getElementById("dashboard-help-banner");
      if (banner) {
        banner.remove();
      }
    });
  }

  var store = Data.getStore();
  var elders = Common.getAccessibleElders(store, session.userId);

  elders.sort(function (a, b) {
    if (a.needsAttention && !b.needsAttention) {
      return -1;
    }
    if (!a.needsAttention && b.needsAttention) {
      return 1;
    }
    return a.name.localeCompare(b.name, "ko");
  });

  var elderParam = Common.getQueryParam("elder");
  var selectedId =
    elderParam && elders.some(function (e) {
      return e.id === elderParam;
    })
      ? elderParam
      : elders[0] ? elders[0].id : null;

  /**
   * 대상자 목록 HTML
   * @returns {string}
   */
  function renderElderList() {
    var html =
      '<aside class="section" aria-labelledby="elder-list-title"><h2 id="elder-list-title">담당 어르신 (' +
      elders.length +
      "명)</h2>" +
      '<ul class="elder-list">';
    elders.forEach(function (e) {
      var info = Common.getStatusInfo(e.summaryStatus);
      var cls = e.needsAttention ? " needs-attention" : "";
      var isSel = e.id === selectedId;
      var stateCls = e.needsAttention ? " elder-card__state--alert" : "";
      html +=
        '<li class="' +
        cls +
        '"><a class="' +
        (isSel ? " is-selected" : "") +
        '" href="dashboard.html?elder=' +
        encodeURIComponent(e.id) +
        '"' +
        (isSel ? ' aria-current="true"' : "") +
        ">" +
        '<span class="elder-avatar" aria-hidden="true">' +
        Common.escapeHtml(e.name.charAt(0)) +
        '<span class="elder-avatar__dot elder-avatar__dot--' +
        (info.tone || "neutral") +
        '"></span></span>' +
        '<span class="elder-card__text"><span class="elder-card__name">' +
        Common.escapeHtml(e.name) +
        " 어르신</span>" +
        '<span class="elder-card__state' +
        stateCls +
        '">' +
        (info.icon ? '<span aria-hidden="true">' + info.icon + "</span> " : "") +
        Common.escapeHtml(e.needsAttention ? "확인 필요" : info.easy || info.label) +
        "</span></span></a></li>";
    });
    html += "</ul></aside>";
    return html;
  }

  /**
   * 선택 대상자 상세
   * @param {string} elderId
   * @returns {string}
   */
  function renderDetail(elderId) {
    if (!elderId) {
      return '<div class="section"><p>연결된 대상자가 없습니다.</p></div>';
    }
    var elder = store.elders.find(function (e) {
      return e.id === elderId;
    });
    if (!elder) {
      return '<div class="section"><p>대상자를 찾을 수 없습니다.</p></div>';
    }

    var signals = store.signals
      .filter(function (s) {
        return s.elderId === elderId;
      })
      .slice(0, 5);

    var alerts = store.alerts.filter(function (a) {
      return a.elderId === elderId;
    });
    var unread = alerts.filter(function (a) {
      return !a.read;
    });

    var devices = store.devices.filter(function (d) {
      return d.elderId === elderId;
    });

    var baseline = store.baselines.find(function (b) {
      return b.elderId === elderId;
    });

    var motionStatus =
      elder.summaryStatus === "data_not_received"
        ? "data_not_received"
        : elder.summaryStatus === "check_needed"
          ? "motion_none"
          : elder.summaryStatus;

    var info = Common.getStatusInfo(elder.summaryStatus);
    var html = "<div>";

    // 1) 한눈에 보는 상태 카드 (신호등)
    html +=
      '<section class="status-hero status-hero--' +
      (info.tone || "neutral") +
      '" aria-labelledby="status-hero-name" aria-live="polite">' +
      '<div class="status-hero__icon" aria-hidden="true">' +
      (info.icon || "ℹ️") +
      "</div>" +
      "<div>" +
      '<h2 class="status-hero__name" id="status-hero-name">' +
      Common.escapeHtml(elder.name) +
      " 어르신</h2>" +
      '<p class="status-hero__easy">' +
      Common.escapeHtml(info.easy || info.label) +
      "</p>" +
      '<p class="status-hero__meta">' +
      Common.renderStatusBadge(elder.summaryStatus) +
      "</p>" +
      "</div>" +
      '<div class="status-hero__actions">';
    if (unread.length > 0) {
      html +=
        '<a class="btn btn--large btn--danger" href="alerts.html?id=' +
        encodeURIComponent(unread[0].id) +
        '"><span aria-hidden="true">🔔</span> 알림 확인하기 (' +
        unread.length +
        "건)</a>";
    }
    html +=
      '<a class="btn btn--large' +
      (unread.length > 0 ? " btn--secondary" : "") +
      '" href="chat.html?elder=' +
      encodeURIComponent(elderId) +
      '"><span aria-hidden="true">💬</span> 안부 대화하기</a>' +
      '<a class="btn btn--large btn--secondary" href="pattern.html?elder=' +
      encodeURIComponent(elderId) +
      '"><span aria-hidden="true">📈</span> 생활 기록 보기</a>' +
      "</div></section>";

    // 2) 요약 타일
    var disconnected = devices.filter(function (d) {
      return d.connection === "disconnected";
    }).length;
    html += '<div class="quick-tiles">';
    html += quickTile("🗣️", "마지막 안부 확인", Common.formatRelative(elder.lastCheckAt), Common.formatDateTime(elder.lastCheckAt));
    html += quickTile("📥", "마지막 소식(데이터)", Common.formatRelative(elder.lastDataAt), Common.formatDateTime(elder.lastDataAt));
    html += quickTile(
      "🔔",
      "확인 안 한 알림",
      unread.length + "건",
      null,
      unread.length > 0 ? "alerts.html?id=" + encodeURIComponent(unread[0].id) : "alerts.html",
      unread.length > 0
    );
    html += quickTile(
      disconnected > 0 ? "🔌" : "✅",
      "기기 연결",
      disconnected > 0 ? disconnected + "개 확인 필요" : "모두 연결됨",
      devices.length + "개 등록",
      "settings.html",
      disconnected > 0
    );
    html += "</div>";

    html += '<div class="section"><h2>자세히 보기</h2>';

    if (baseline) {
      html += "<h3>분석 준비</h3><p class=\"muted\">" + Common.escapeHtml(baseline.note) + "</p>";
      if (baseline.analysisReady === "insufficient") {
        html += "<p>" + Common.renderStatusBadge("insufficient_data") + "</p>";
      }
    }

    var chatSummary = Common.getChatThreadSummary(elderId);
    if (chatSummary && chatSummary.lastSummary) {
      html += "<h3>AI 대화 요약 (시연)</h3>";
      html +=
        '<p class="muted">갱신: ' + Common.formatDateTime(chatSummary.updatedAt) + "</p>";
      html +=
        '<pre class="chat-summary-pre">' +
        Common.escapeHtml(chatSummary.lastSummary) +
        "</pre>";
      html +=
        '<p><a href="chat.html?elder=' +
        encodeURIComponent(elderId) +
        '">AI 대화 화면</a></p>';
      html +=
        '<p class="muted">대화 요약만 표시합니다. 안전·정상 여부는 단정하지 않습니다.</p>';
    }

    html += "<h3>최근 생활 신호</h3>";
    if (elder.summaryStatus === "data_not_received") {
      html += "<p>" + Common.renderStatusBadge("data_not_received") + "</p>";
    } else if (signals.length === 0) {
      html += "<p class=\"muted\">표시할 기록이 없습니다.</p>";
    } else {
      html += '<ul class="signal-list">';
      signals.forEach(function (s) {
        html +=
          '<li><span class="signal-list__time">' +
          Common.escapeHtml(Common.formatRelative(s.at)) +
          "</span><span>" +
          Common.escapeHtml(s.summary) +
          '</span><span class="signal-list__sub">' +
          Common.formatDateTime(s.at) +
          "</span></li>";
      });
      html += "</ul>";
      html +=
        '<p><a href="pattern.html?elder=' +
        encodeURIComponent(elderId) +
        '">생활패턴 상세 보기</a></p>';
    }

    html += "<h3>대응 요약</h3>";
    if (unread.length > 0) {
      html += "<p>미확인 알림 " + unread.length + "건</p>";
      unread.forEach(function (a) {
        html +=
          '<div class="alert-card alert-card--unread"><a href="alerts.html?id=' +
          encodeURIComponent(a.id) +
          '"><strong>' +
          Common.escapeHtml(a.title) +
          "</strong></a><ul>";
        a.reasons.forEach(function (r) {
          html += "<li>" + Common.escapeHtml(r) + "</li>";
        });
        html += "</ul></div>";
      });
    } else {
      html += "<p class=\"muted\">미확인 알림이 없습니다.</p>";
    }

    var active = alerts.find(function (a) {
      return !a.resolution;
    });
    if (active) {
      html += "<p>진행 중 대응: " + Common.renderStatusBadge(active.status) + "</p>";
      if (active.guardianRequest) {
        var gl = Common.DELIVERY_LABELS[active.guardianRequest.state] || active.guardianRequest.state;
        html += "<p class=\"muted\">보호자 확인 — " + Common.escapeHtml(gl) + "</p>";
      }
    }

    html += "<h3>기기 상태</h3><ul class=\"signal-list\">";
    devices.forEach(function (d) {
      var conn =
        d.connection === "disconnected"
          ? Common.renderStatusBadge("device_disconnected")
          : '<span class="status-badge status-badge--ok">연결됨</span>';
      html +=
        "<li>" +
        Common.escapeHtml(d.label) +
        " (" +
        Common.escapeHtml(d.location) +
        ") — " +
        conn +
        " · 마지막 수신 " +
        Common.formatDateTime(d.lastReceivedAt) +
        "</li>";
    });
    html += "</ul>";

    html += "<h3>활동 상태 참고</h3>";
    html += "<p>" + Common.renderStatusBadge(motionStatus) + "</p>";
    html += "<p class=\"muted\">이상 신호가 없다는 이유만으로 안전이 확정된 것은 아닙니다.</p>";

    html += "</div></div>";
    return html;
  }

  /**
   * 요약 타일 HTML
   * @param {string} icon
   * @param {string} label
   * @param {string} value
   * @param {string|null} sub
   * @param {string} [href]
   * @param {boolean} [isAlert]
   * @returns {string}
   */
  function quickTile(icon, label, value, sub, href, isAlert) {
    var tag = href ? "a" : "div";
    return (
      "<" +
      tag +
      ' class="quick-tile' +
      (isAlert ? " quick-tile--alert" : "") +
      '"' +
      (href ? ' href="' + href + '"' : "") +
      ">" +
      '<span class="quick-tile__icon" aria-hidden="true">' +
      icon +
      "</span>" +
      '<span class="quick-tile__label">' +
      Common.escapeHtml(label) +
      "</span>" +
      '<span class="quick-tile__value">' +
      Common.escapeHtml(value) +
      "</span>" +
      (sub ? '<span class="signal-list__sub">' + Common.escapeHtml(sub) + "</span>" : "") +
      "</" +
      tag +
      ">"
    );
  }

  document.getElementById("dashboard-root").innerHTML =
    renderElderList() + renderDetail(selectedId);
})();
