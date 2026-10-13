/**
 * 대상자·연락처·기기 설정
 */
(function () {
  "use strict";
  var Common = window.Harugyeol.Common;
  var Data = window.Harugyeol.Data;

  var session = Common.requireAuth();
  if (!session) {
    return;
  }
  Common.renderHeader("settings", document.getElementById("site-header"));

  var store = Data.getStore();
  var elderIds = Common.getAccessibleElderIds(store, session.userId);
  var root = document.getElementById("settings-root");

  /**
   * 기기 종류 표시
   * @param {string} type
   * @returns {string}
   */
  function deviceTypeLabel(type) {
    var map = {
      smart_plug: "스마트 플러그",
      door: "문 열림 센서",
      motion: "움직임 센서",
      speaker: "스피커",
    };
    return map[type] || type;
  }

  /**
   * 설정 화면 렌더
   */
  function render() {
    var elders = store.elders.filter(function (e) {
      return elderIds.indexOf(e.id) >= 0;
    });

    var html = Common.renderIntegrationTags();

    html += '<div class="section"><h2>어르신 정보</h2>';
    elders.forEach(function (elder) {
      html +=
        '<form class="elder-form" data-elder-id="' +
        Common.escapeHtml(elder.id) +
        '">';
      html += "<h3>" + Common.escapeHtml(elder.name) + "</h3>";
      html +=
        '<div class="form-group"><label>주소</label><input name="address" value="' +
        Common.escapeHtml(elder.address) +
        '" /></div>';
      html +=
        '<div class="form-group"><label>출생년도</label><input name="birthYear" type="number" value="' +
        Common.escapeHtml(String(elder.birthYear)) +
        '" /></div>';
      html += '<button type="submit" class="btn btn--small">저장</button></form>';
    });
    html += "</div>";

    html += '<div class="section"><h2>가족·보호자</h2>';
    var guardians = store.guardians.filter(function (g) {
      return elderIds.indexOf(g.elderId) >= 0;
    });
    if (guardians.length === 0) {
      html += '<p class="muted">등록된 보호자가 없습니다.</p>';
    }
    guardians.forEach(function (g) {
      var elder = store.elders.find(function (e) {
        return e.id === g.elderId;
      });
      html +=
        '<form class="guardian-form" data-guardian-id="' +
        Common.escapeHtml(g.id) +
        '">';
      html +=
        "<h3>" +
        Common.escapeHtml(elder ? elder.name : "") +
        " — " +
        Common.escapeHtml(g.name) +
        "</h3>";
      html +=
        '<div class="form-group"><label>관계</label><input name="relation" value="' +
        Common.escapeHtml(g.relation) +
        '" /></div>';
      html +=
        '<div class="form-group"><label>연락처</label><input name="phone" value="' +
        Common.escapeHtml(g.phone) +
        '" /></div>';
      html += '<button type="submit" class="btn btn--small">저장</button></form>';
    });
    html +=
      '<p class="muted"><button type="button" class="btn btn--secondary btn--small" id="btn-add-guardian">보호자 추가 (시연)</button></p>';
    html += "</div>";

    html += '<div class="section"><h2>관리기관</h2>';
    var agencies = store.agencies.filter(function (a) {
      return elderIds.indexOf(a.elderId) >= 0;
    });
    agencies.forEach(function (a) {
      var elder = store.elders.find(function (e) {
        return e.id === a.elderId;
      });
      html +=
        '<form class="agency-form" data-agency-id="' +
        Common.escapeHtml(a.id) +
        '">';
      html +=
        "<h3>" +
        Common.escapeHtml(elder ? elder.name : "") +
        " — " +
        Common.escapeHtml(a.name) +
        "</h3>";
      html +=
        '<div class="form-group"><label>연락처</label><input name="contact" value="' +
        Common.escapeHtml(a.contact) +
        '" /></div>';
      html += '<button type="submit" class="btn btn--small">저장</button></form>';
    });
    html += "</div>";

    html += '<div class="section"><h2>기기 구성</h2>';
    html += '<p class="muted">센서·스피커 실제 연결은 미연동 — 상태는 예시 데이터입니다.</p>';
    var devices = store.devices.filter(function (d) {
      return elderIds.indexOf(d.elderId) >= 0;
    });
    html +=
      '<div class="table-scroll"><table class="data-table"><thead><tr><th>대상</th><th>종류</th><th>위치</th><th>연결</th><th>마지막 수신</th></tr></thead><tbody>';
    devices.forEach(function (d) {
      var elder = store.elders.find(function (e) {
        return e.id === d.elderId;
      });
      var conn =
        d.connection === "disconnected"
          ? "연결 이상"
          : d.lastReceivedAt
            ? "연결됨"
            : "수신 없음";
      html +=
        "<tr><td>" +
        Common.escapeHtml(elder ? elder.name : "") +
        "</td><td>" +
        Common.escapeHtml(deviceTypeLabel(d.type)) +
        "</td><td>" +
        Common.escapeHtml(d.location) +
        "</td><td>" +
        Common.escapeHtml(conn) +
        "</td><td>" +
        Common.formatDateTime(d.lastReceivedAt) +
        "</td></tr>";
    });
    html += "</tbody></table></div>";

    devices.forEach(function (d) {
      html +=
        '<form class="device-form" data-device-id="' +
        Common.escapeHtml(d.id) +
        '" style="margin-top:1rem;">';
      html += "<h3>" + Common.escapeHtml(d.label) + " 수정</h3>";
      html +=
        '<div class="form-group"><label>설치 위치</label><input name="location" value="' +
        Common.escapeHtml(d.location) +
        '" /></div>';
      html +=
        '<div class="form-group"><label>표시 이름</label><input name="label" value="' +
        Common.escapeHtml(d.label) +
        '" /></div>';
      html += '<button type="submit" class="btn btn--small">저장</button></form>';
    });
    html += "</div>";

    root.innerHTML = html;

    root.querySelectorAll(".elder-form").forEach(function (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var id = form.getAttribute("data-elder-id");
        var elder = store.elders.find(function (e) {
          return e.id === id;
        });
        if (!elder) {
          return;
        }
        elder.address = form.address.value;
        elder.birthYear = parseInt(form.birthYear.value, 10) || elder.birthYear;
        Data.saveStore(store);
        alert("저장되었습니다.");
      });
    });

    root.querySelectorAll(".guardian-form").forEach(function (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var id = form.getAttribute("data-guardian-id");
        var g = store.guardians.find(function (x) {
          return x.id === id;
        });
        if (!g) {
          return;
        }
        g.relation = form.relation.value;
        g.phone = form.phone.value;
        Data.saveStore(store);
        alert("저장되었습니다.");
      });
    });

    root.querySelectorAll(".agency-form").forEach(function (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var id = form.getAttribute("data-agency-id");
        var a = store.agencies.find(function (x) {
          return x.id === id;
        });
        if (!a) {
          return;
        }
        a.contact = form.contact.value;
        Data.saveStore(store);
        alert("저장되었습니다.");
      });
    });

    root.querySelectorAll(".device-form").forEach(function (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var id = form.getAttribute("data-device-id");
        var d = store.devices.find(function (x) {
          return x.id === id;
        });
        if (!d) {
          return;
        }
        d.location = form.location.value;
        d.label = form.label.value;
        Data.saveStore(store);
        alert("저장되었습니다.");
      });
    });

    var addBtn = document.getElementById("btn-add-guardian");
    if (addBtn && elders[0]) {
      addBtn.addEventListener("click", function () {
        var newId = "g_" + Date.now();
        store.guardians.push({
          id: newId,
          elderId: elders[0].id,
          name: "새 보호자",
          relation: "가족",
          phone: "",
        });
        Data.saveStore(store);
        render();
      });
    }
  }

  document.getElementById("btn-reset-demo").addEventListener("click", function () {
    if (window.confirm("시연 입력을 초기화할까요?")) {
      Data.resetDemoData();
      window.location.reload();
    }
  });

  render();
})();
