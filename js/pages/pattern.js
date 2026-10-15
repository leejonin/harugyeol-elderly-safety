/**
 * 생활패턴 상세 — 기록 조회 및 SVG 비교
 */
(function () {
  "use strict";
  var Common = window.Harugyeol.Common;
  var Data = window.Harugyeol.Data;
  var Dataset = window.Harugyeol.Dataset;
  var PatternAnalysis = window.Harugyeol.PatternAnalysis;
  var PatternAnalysisUI = window.Harugyeol.PatternAnalysisUI;

  var session = Common.requireAuth();
  if (!session) {
    return;
  }
  Common.renderHeader("pattern", document.getElementById("site-header"));

  var store = Data.getStore();
  var elders = Common.getAccessibleElders(store, session.userId);
  var root = document.getElementById("pattern-root");

  var elderId = Common.getQueryParam("elder") || (elders[0] ? elders[0].id : "");
  var kindFilter = Common.getQueryParam("kind") || "all";

  var csvAnalysisOpts = {
    learnEnd: PatternAnalysis.DEFAULT_LEARN_END,
    analyzeDate: "2026-10-14",
  };

  /**
   * 센서 종류 한글
   * @param {string} kind
   * @returns {string}
   */
  function kindLabel(kind) {
    var map = { plug: "가전(플러그)", door: "문 열림", motion: "움직임", all: "전체" };
    return map[kind] || kind;
  }

  /**
   * 24시간 타임라인 SVG
   * @param {Object} baseline
   * @param {Object[]} events - { hour, kind }
   * @returns {string}
   */
  function buildTimelineSvg(baseline, events) {
    var w = 720;
    var h = 120;
    var pad = 40;
    var innerW = w - pad * 2;
    var svg =
      '<svg width="' +
      w +
      '" height="' +
      h +
      '" viewBox="0 0 ' +
      w +
      " " +
      h +
      '" role="img" aria-label="24시간 생활 신호 타임라인">';
    svg += '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#faf9f6"/>';
    svg += '<line x1="' + pad + '" y1="' + (h - 30) + '" x2="' + (w - pad) + '" y2="' + (h - 30) + '" stroke="#ccc"/>';

    for (var hour = 0; hour <= 24; hour += 6) {
      var x = pad + (hour / 24) * innerW;
      svg +=
        '<text x="' +
        x +
        '" y="' +
        (h - 10) +
        '" font-size="11" fill="#666" text-anchor="middle">' +
        hour +
        "시</text>";
    }

    if (baseline && baseline.usualWindows) {
      baseline.usualWindows.forEach(function (win) {
        var x1 = pad + (win.startHour / 24) * innerW;
        var x2 = pad + (win.endHour / 24) * innerW;
        svg +=
          '<rect x="' +
          x1 +
          '" y="20" width="' +
          (x2 - x1) +
          '" height="50" fill="#40916c" opacity="0.25" rx="4"/>';
      });
    }

    events.forEach(function (ev) {
      var x = pad + (ev.hour / 24) * innerW;
      var color = ev.kind === "plug" ? "#2d6a4f" : ev.kind === "door" ? "#1d4d3a" : "#52b788";
      svg += '<circle cx="' + x + '" cy="45" r="6" fill="' + color + '"/>';
    });

    svg +=
      '<text x="' +
      pad +
      '" y="14" font-size="12" fill="#2d6a4f">녹색 영역: 평소 패턴 · 점: 오늘 기록</text>';
    svg += "</svg>";
    return svg;
  }

  /**
   * 시각에서 시(hour) 추출 (UTC 단순화)
   * @param {string} at
   * @returns {number}
   */
  function hourFromIso(at) {
    var d = new Date(at);
    return d.getHours() + d.getMinutes() / 60;
  }

  /**
   * 페이지 렌더
   */
  function render() {
    var elderOptions = elders
      .map(function (e) {
        var sel = e.id === elderId ? " selected" : "";
        return (
          '<option value="' +
          Common.escapeHtml(e.id) +
          '"' +
          sel +
          ">" +
          Common.escapeHtml(e.name) +
          "</option>"
        );
      })
      .join("");

    var kinds = ["all", "plug", "door", "motion"];
    var kindOptions = kinds
      .map(function (k) {
        var sel = k === kindFilter ? " selected" : "";
        return (
          '<option value="' + k + '"' + sel + ">" + Common.escapeHtml(kindLabel(k)) + "</option>"
        );
      })
      .join("");

    var html = '<div class="section filter-bar">';
    html += '<div class="form-group"><label for="elder-select">대상자</label>';
    html += '<select id="elder-select">' + elderOptions + "</select></div>";
    html += '<div class="form-group"><label for="kind-select">센서 종류</label>';
    html += '<select id="kind-select">' + kindOptions + "</select></div>";
    html += "</div>";

    if (!elderId) {
      html += '<div class="section"><p>대상자를 선택할 수 없습니다.</p></div>';
      root.innerHTML = html;
      bindFilters();
      return;
    }

    var baseline = store.baselines.find(function (b) {
      return b.elderId === elderId;
    });
    var elder = store.elders.find(function (e) {
      return e.id === elderId;
    });

    var signals = store.signals.filter(function (s) {
      return s.elderId === elderId;
    });
    if (kindFilter !== "all") {
      signals = signals.filter(function (s) {
        return s.kind === kindFilter;
      });
    }
    signals.sort(function (a, b) {
      return new Date(a.at) - new Date(b.at);
    });

    var events = signals.map(function (s) {
      return { hour: hourFromIso(s.at), kind: s.kind };
    });

    html += '<div class="section"><h2>평소·현재 비교</h2>';
    if (baseline && baseline.analysisReady === "insufficient") {
      html += "<p>" + Common.renderStatusBadge("insufficient_data") + "</p>";
    }
    html += '<div class="chart-wrap">' + buildTimelineSvg(baseline, events) + "</div>";
    html += '<p class="muted">문 열림은 「외출」「귀가」로 단정하지 않고 「문 열림」으로만 표기합니다.</p>';
    html += "</div>";

    html += '<div class="section"><h2>시간순 기록</h2>';
    if (elder && elder.summaryStatus === "data_not_received") {
      html += "<p>" + Common.renderStatusBadge("data_not_received") + "</p>";
    }
    if (signals.length === 0) {
      html += '<p class="muted">조건에 맞는 기록이 없습니다.</p>';
    } else {
      html += '<div class="table-scroll"><table class="data-table"><thead><tr><th>시각</th><th>종류</th><th>내용</th></tr></thead><tbody>';
      signals.forEach(function (s) {
        html +=
          "<tr><td>" +
          Common.formatDateTime(s.at) +
          "</td><td>" +
          Common.escapeHtml(kindLabel(s.kind)) +
          "</td><td>" +
          Common.escapeHtml(s.summary) +
          "</td></tr>";
      });
      html += "</tbody></table></div>";
    }
    html += "</div>";

    var relatedAlerts = store.alerts.filter(function (a) {
      return a.elderId === elderId;
    });
    if (relatedAlerts.length > 0) {
      html += '<div class="section"><h2>판단 근거 (알림 연계)</h2>';
      relatedAlerts.forEach(function (a) {
        html += "<h3>" + Common.escapeHtml(a.title) + "</h3><ul>";
        a.reasons.forEach(function (r) {
          html += "<li>" + Common.escapeHtml(r) + "</li>";
        });
        html +=
          '</ul><p><a href="alerts.html?id=' +
          encodeURIComponent(a.id) +
          '">알림 상세</a></p>';
      });
      html += "</div>";
    }

    var devices = store.devices.filter(function (d) {
      return d.elderId === elderId;
    });
    html += '<div class="section"><h2>데이터 수신 상태</h2><ul class="signal-list">';
    devices.forEach(function (d) {
      if (d.type === "speaker") {
        return;
      }
      var status =
        d.lastReceivedAt == null
          ? Common.renderStatusBadge("data_not_received")
          : d.connection === "disconnected"
            ? Common.renderStatusBadge("device_disconnected")
            : '<span class="status-badge status-badge--ok">수신 정상</span>';
      html +=
        "<li>" +
        Common.escapeHtml(d.label) +
        " — " +
        status +
        " · " +
        Common.formatDateTime(d.lastReceivedAt) +
        "</li>";
    });
    html += "</ul></div>";

    html +=
      '<div class="section" id="pattern-csv-analysis-wrap">' +
      "<h2>E001 CSV AI 분석 시연</h2>" +
      '<p class="muted">아래는 합성 CSV 규칙 분석입니다. 위 시연 저장소 데이터와 별개입니다. ' +
      '<a href="' +
      Common.appPath("dataset.html") +
      '">CSV 시연</a>에서 전체 데이터를 볼 수 있습니다.</p>' +
      '<div id="pattern-csv-analysis-mount" aria-live="polite"></div>' +
      "</div>";

    root.innerHTML = html;
    bindFilters();
    loadPatternCsvAnalysis();
  }

  /**
   * CSV 규칙 분석 섹션 로드
   */
  function loadPatternCsvAnalysis() {
    var mount = document.getElementById("pattern-csv-analysis-mount");
    if (!mount) {
      return;
    }
    function renderFromRows(rows) {
      var dates = [];
      rows.forEach(function (r) {
        if (dates.indexOf(r.dateKey) < 0) {
          dates.push(r.dateKey);
        }
      });
      dates.sort();
      PatternAnalysis.clearCache();
      var analysis = PatternAnalysis.runFullAnalysis(rows, {
        learnStart: PatternAnalysis.DEFAULT_LEARN_START,
        learnEnd: csvAnalysisOpts.learnEnd,
        analyzeDate: csvAnalysisOpts.analyzeDate,
        noCache: true,
      });
      PatternAnalysisUI.markPatternAnalysisActive();
      if (window.Harugyeol.ChatCsvContext) {
        window.Harugyeol.ChatCsvContext.persistFromRows(rows, {
          source: "pattern",
          analyzeDate: csvAnalysisOpts.analyzeDate,
          learnEnd: csvAnalysisOpts.learnEnd,
        });
      }
      mount.innerHTML = PatternAnalysisUI.renderAnalysisPanel(analysis, {
        dates: dates,
        learnEnd: csvAnalysisOpts.learnEnd,
        analyzeDate: csvAnalysisOpts.analyzeDate,
        showControls: true,
      });
      bindPatternAnalysisControls(rows, dates);
    }

    if (window.location.protocol === "file:") {
      mount.innerHTML =
        '<p class="dataset-status">file://에서는 CSV를 직접 선택하거나 ' +
        '<a href="' +
        Common.appPath("dataset.html") +
        '">CSV 시연</a> 화면을 이용하세요.</p>' +
        '<label class="dataset-file-label">02_demo_synthetic.csv' +
        '<input type="file" id="pattern-csv-file" accept=".csv,text/csv" /></label>' +
        '<button type="button" class="btn btn--small" id="pattern-csv-load">로드 후 분석</button>';
      var btn = document.getElementById("pattern-csv-load");
      if (btn) {
        btn.addEventListener("click", function () {
          var input = document.getElementById("pattern-csv-file");
          if (!input || !input.files || !input.files[0]) {
            alert("CSV 파일을 선택해 주세요.");
            return;
          }
          Dataset.readFileAsText(input.files[0])
            .then(function (text) {
              var parsed = Dataset.parseDemoCsv(text);
              if (!parsed.schemaOk) {
                throw new Error(parsed.schemaMessage);
              }
              renderFromRows(parsed.rows);
            })
            .catch(function (err) {
              mount.innerHTML =
                '<p class="dataset-status">로드 실패: ' +
                Common.escapeHtml(err.message || String(err)) +
                "</p>";
            });
        });
      }
      return;
    }

    mount.innerHTML = '<p class="muted">합성 CSV를 불러오는 중…</p>';
    Dataset.fetchDefaultBundle(Common)
      .then(function (bundle) {
        if (!bundle.schemaOk) {
          throw new Error(bundle.schemaMessage);
        }
        renderFromRows(bundle.rows);
      })
      .catch(function (err) {
        mount.innerHTML =
          '<p class="dataset-status">자동 로드 실패: ' +
          Common.escapeHtml(err.message || String(err)) +
          ' — <a href="' +
          Common.appPath("dataset.html") +
          '">CSV 시연</a></p>';
      });
  }

  /**
   * CSV 분석 컨트롤 바인딩
   * @param {Object[]} rows
   * @param {string[]} dates
   */
  function bindPatternAnalysisControls(rows, dates) {
    var refreshBtn = document.getElementById("analysis-refresh");
    var learnEndInput = document.getElementById("analysis-learn-end");
    var analyzeSelect = document.getElementById("analysis-analyze-date");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", function () {
        if (learnEndInput) {
          csvAnalysisOpts.learnEnd = learnEndInput.value || csvAnalysisOpts.learnEnd;
        }
        if (analyzeSelect) {
          csvAnalysisOpts.analyzeDate = analyzeSelect.value || csvAnalysisOpts.analyzeDate;
        }
        PatternAnalysis.clearCache();
        var analysis = PatternAnalysis.runFullAnalysis(rows, {
          learnStart: PatternAnalysis.DEFAULT_LEARN_START,
          learnEnd: csvAnalysisOpts.learnEnd,
          analyzeDate: csvAnalysisOpts.analyzeDate,
          noCache: true,
        });
        var mount = document.getElementById("pattern-csv-analysis-mount");
        if (mount) {
          mount.innerHTML = PatternAnalysisUI.renderAnalysisPanel(analysis, {
            dates: dates,
            learnEnd: csvAnalysisOpts.learnEnd,
            analyzeDate: csvAnalysisOpts.analyzeDate,
            showControls: true,
          });
          bindPatternAnalysisControls(rows, dates);
        }
      });
    }
  }

  /**
   * 필터 변경 시 URL 갱신
   */
  function bindFilters() {
    var elderSelect = document.getElementById("elder-select");
    var kindSelect = document.getElementById("kind-select");
    if (!elderSelect || !kindSelect) {
      return;
    }
    function go() {
      var e = elderSelect.value;
      var k = kindSelect.value;
      window.location.href =
        "pattern.html?elder=" + encodeURIComponent(e) + "&kind=" + encodeURIComponent(k);
    }
    elderSelect.addEventListener("change", go);
    kindSelect.addEventListener("change", go);
  }

  render();
})();
