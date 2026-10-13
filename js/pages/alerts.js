/**
 * 알림 목록 및 상세·대응 이력
 */
(function () {
  "use strict";
  var Common = window.Harugyeol.Common;
  var Data = window.Harugyeol.Data;

  var session = Common.requireAuth();
  if (!session) {
    return;
  }
  Common.renderHeader("alerts", document.getElementById("site-header"));

  var store = Data.getStore();
  var elderIds = Common.getAccessibleElderIds(store, session.userId);
  var alertId = Common.getQueryParam("id");
  var root = document.getElementById("alerts-root");

  /**
   * 접근 가능 알림
   * @returns {Object[]}
   */
  function accessibleAlerts() {
    return store.alerts
      .filter(function (a) {
        return elderIds.indexOf(a.elderId) >= 0;
      })
      .sort(function (a, b) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }

  /**
   * 음성 응답 표시
   * @param {Object} voice
   * @returns {string}
   */
  function voiceLabel(voice) {
    if (!voice || !voice.questionSent) {
      return "질문 미실행";
    }
    if (voice.response === "ok") {
      return "응답 확인됨 (" + Common.formatDateTime(voice.responseAt) + ")";
    }
    if (voice.response === "no_response") {
      return "무응답";
    }
    return voice.response || "—";
  }

  /**
   * 알림 목록
   */
  function renderList() {
    var alerts = accessibleAlerts();
    var html = '<p><a href="alerts.html">← 목록</a></p>';
    html += '<div class="section"><h2>알림 목록</h2>';
    if (alerts.length === 0) {
      html += '<p class="muted">알림이 없습니다.</p>';
    } else {
      alerts.forEach(function (a) {
        var elder = store.elders.find(function (e) {
          return e.id === a.elderId;
        });
        var cls = a.read ? "alert-card" : "alert-card alert-card--unread";
        html +=
          '<div class="' +
          cls +
          '"><a href="alerts.html?id=' +
          encodeURIComponent(a.id) +
          '"><strong>' +
          Common.escapeHtml(a.title) +
          "</strong></a>";
        html +=
          '<p class="muted">' +
          Common.escapeHtml(elder ? elder.name : "") +
          " · " +
          Common.formatDateTime(a.createdAt) +
          "</p>";
        html += "<p>" + Common.renderStatusBadge(a.status) + "</p></div>";
      });
    }
    html += "</div>";
    root.innerHTML = html;
  }

  /**
   * 알림 상세
   * @param {string} id
   */
  function renderDetail(id) {
    var alert = store.alerts.find(function (a) {
      return a.id === id;
    });
    if (!alert || elderIds.indexOf(alert.elderId) < 0) {
      root.innerHTML =
        '<div class="section"><p>알림을 찾을 수 없거나 접근 권한이 없습니다.</p><p><a href="alerts.html">목록으로</a></p></div>';
      return;
    }

    if (!alert.read) {
      alert.read = true;
      Data.saveStore(store);
    }

    var elder = store.elders.find(function (e) {
      return e.id === alert.elderId;
    });

    var html = '<p><a href="alerts.html">← 알림 목록</a></p>';
    html += '<div class="section">';
    html += "<h2>" + Common.escapeHtml(alert.title) + "</h2>";
    html +=
      '<p class="muted">' +
      Common.escapeHtml(elder ? elder.name : "") +
      " · 발생 " +
      Common.formatDateTime(alert.createdAt) +
      "</p>";
    html += "<p>" + Common.renderStatusBadge(alert.status) + "</p>";

    html += "<h3>판단 근거</h3><ul>";
    alert.reasons.forEach(function (r) {
      html += "<li>" + Common.escapeHtml(r) + "</li>";
    });
    html += "</ul>";

    html += "<h3>음성 안부 확인</h3>";
    html +=
      "<p>질문 시각: " +
      Common.formatDateTime(alert.voice ? alert.voice.questionAt : null) +
      " (스피커: 시연 미연동)</p>";
    html += "<p>결과: " + Common.escapeHtml(voiceLabel(alert.voice)) + "</p>";
    if (alert.voice && alert.voice.response === "no_response") {
      html += "<p>" + Common.renderStatusBadge("voice_pending") + "</p>";
    }

    if (alert.guardianRequest) {
      html += "<h3>가족·보호자 확인</h3>";
      var gl =
        Common.DELIVERY_LABELS[alert.guardianRequest.state] ||
        alert.guardianRequest.state;
      html +=
        "<p>전달 상태: <strong>" +
        Common.escapeHtml(gl) +
        "</strong> · 요청 " +
        Common.formatDateTime(alert.guardianRequest.requestedAt) +
        "</p>";
      if (alert.guardianNote) {
        html += "<p>기록: " + Common.escapeHtml(alert.guardianNote) + "</p>";
      }
    }

    if (alert.agencyRequest) {
      html += "<h3>관리기관 연결</h3>";
      html += "<p class=\"muted\">시연 데이터에 연결 요청 없음</p>";
    }

    html += "<h3>단계별 대응 이력</h3><ul class=\"timeline-steps\">";
    alert.steps.forEach(function (step) {
      html +=
        "<li><strong>" +
        Common.formatDateTime(step.at) +
        "</strong> — " +
        Common.escapeHtml(step.label) +
        "<br><span class=\"muted\">" +
        Common.escapeHtml(step.detail) +
        "</span></li>";
    });
    html += "</ul>";

    if (alert.resolution) {
      html += "<h3>조치 완료</h3>";
      html +=
        "<p>" +
        Common.escapeHtml(alert.resolution.by) +
        " · " +
        Common.escapeHtml(alert.resolution.result) +
        " · " +
        Common.formatDateTime(alert.resolution.at) +
        "</p>";
    }

    html += "</div>";

    html += '<div class="section"><h2>보호자 확인 결과 입력</h2>';
    html +=
      '<form id="form-guardian-note"><div class="form-group"><label for="guardian-note">확인한 상황과 조치</label>';
    html +=
      '<textarea id="guardian-note" name="guardianNote">' +
      Common.escapeHtml(alert.guardianNote || "") +
      "</textarea></div>";
    html += '<button type="submit" class="btn">저장 (시연 localStorage)</button></form></div>';

    html += '<div class="section"><h2>조치 완료 기록</h2>';
    html += '<form id="form-resolution">';
    html += '<div class="form-group"><label for="res-by">확인 담당자</label><input id="res-by" name="by" value="' +
      Common.escapeHtml(alert.resolution ? alert.resolution.by : session.name) +
      '" /></div>';
    html += '<div class="form-group"><label for="res-result">조치 결과</label><input id="res-result" name="result" value="' +
      Common.escapeHtml(alert.resolution ? alert.resolution.result : "") +
      '" /></div>';
    html += '<button type="submit" class="btn">완료 기록 저장</button></form></div>';

    root.innerHTML = html;

    document.getElementById("form-guardian-note").addEventListener("submit", function (ev) {
      ev.preventDefault();
      alert.guardianNote = document.getElementById("guardian-note").value;
      if (alert.guardianRequest && alert.guardianNote) {
        alert.guardianRequest.state = "acknowledged";
      }
      Data.saveStore(store);
      window.location.reload();
    });

    document.getElementById("form-resolution").addEventListener("submit", function (ev) {
      ev.preventDefault();
      alert.resolution = {
        by: document.getElementById("res-by").value,
        result: document.getElementById("res-result").value,
        at: new Date().toISOString(),
      };
      alert.read = true;
      alert.status = "no_anomaly_observed";
      Data.saveStore(store);
      window.location.reload();
    });
  }

  if (alertId) {
    renderDetail(alertId);
  } else {
    renderList();
  }
})();
