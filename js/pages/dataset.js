/**
 * CSV 합성 데이터 시연 화면
 */
(function () {
  "use strict";

  var Common = window.Harugyeol.Common;
  var Dataset = window.Harugyeol.Dataset;
  var PatternAnalysis = window.Harugyeol.PatternAnalysis;
  var PatternAnalysisUI = window.Harugyeol.PatternAnalysisUI;

  var session = Common.requireAuth();
  if (!session) {
    return;
  }
  Common.renderHeader("dataset", document.getElementById("site-header"));

  var integrationMount = document.getElementById("integration-mount");
  if (integrationMount) {
    integrationMount.innerHTML = Common.renderIntegrationTags();
  }

  var root = document.getElementById("dataset-root");
  var state = {
    allRows: [],
    scenarioMap: {},
    skipped: { count: 0, samples: [] },
    loadSource: "",
    loadError: "",
    filters: { dateKey: "all", scenario: "all", anomaly: "all" },
    page: 1,
    pageSize: 100,
    analysisLearnEnd: PatternAnalysis.DEFAULT_LEARN_END,
    analysisDate: "2026-10-14",
  };

  var TABLE_COLUMNS = [
    { key: "timestamp", label: "시각" },
    { key: "elderId", label: "대상자" },
    { key: "motion", label: "움직임" },
    { key: "powerW", label: "전력(W)" },
    { key: "doorOpen", label: "문 열림" },
    { key: "temperatureC", label: "온도(℃)" },
    { key: "humidityPct", label: "습도(%)" },
    { key: "gasAlert", label: "가스 경보" },
    { key: "medicationDue", label: "복약 예정" },
    { key: "medicationTaken", label: "복약 확인" },
    { key: "responseConfirmed", label: "안부 응답" },
    { key: "scenario", label: "시나리오" },
    { key: "anomalyLabel", label: "합성 이상 라벨" },
    { key: "dataOrigin", label: "데이터 출처" },
  ];

  /**
   * 필터 적용 후 행 목록
   * @returns {Object[]}
   */
  function getFilteredRows() {
    return Dataset.filterRows(state.allRows, state.filters);
  }

  /**
   * CSV에 포함된 날짜 목록
   * @returns {string[]}
   */
  function listDateKeys() {
    var keys = {};
    state.allRows.forEach(function (row) {
      keys[row.dateKey] = true;
    });
    return Object.keys(keys).sort();
  }

  /**
   * 규칙 분석 결과 HTML
   * @returns {string}
   */
  function buildAnalysisSection() {
    if (!state.allRows.length) {
      return "";
    }
    var dates = listDateKeys();
    if (dates.indexOf(state.analysisDate) < 0) {
      state.analysisDate = dates[dates.length - 1];
    }
    PatternAnalysis.clearCache();
    var analysis = PatternAnalysis.runFullAnalysis(state.allRows, {
      learnStart: PatternAnalysis.DEFAULT_LEARN_START,
      learnEnd: state.analysisLearnEnd,
      analyzeDate: state.analysisDate,
      noCache: true,
    });
    PatternAnalysisUI.markPatternAnalysisActive();
    if (integrationMount) {
      integrationMount.innerHTML = Common.renderIntegrationTags();
    }
    return PatternAnalysisUI.renderAnalysisPanel(analysis, {
      dates: dates,
      learnEnd: state.analysisLearnEnd,
      analyzeDate: state.analysisDate,
      showControls: true,
    });
  }

  /**
   * 시나리오 목록(데이터에 존재하는 키)
   * @returns {string[]}
   */
  function listScenarioKeys() {
    var keys = {};
    state.allRows.forEach(function (row) {
      keys[row.scenario] = true;
    });
    return Object.keys(keys).sort();
  }

  /**
   * 로딩·오류·파일 폴백 UI
   * @param {string} message
   * @param {boolean} showFileInput
   */
  function renderLoadingShell(message, showFileInput) {
    var fileBlock = "";
    if (showFileInput) {
      fileBlock =
        '<div class="dataset-file-fallback section">' +
        "<p><strong>로컬 파일로 불러오기</strong></p>" +
        "<p>브라우저가 <code>file://</code>에서 자동 로드를 막은 경우, 패키지 폴더의 CSV를 직접 선택하세요.</p>" +
        '<label class="dataset-file-label">시연 데이터 (02_demo_synthetic.csv)' +
        '<input type="file" id="file-demo-csv" accept=".csv,text/csv" /></label>' +
        '<label class="dataset-file-label">시나리오 설명 (03_scenarios.csv, 선택)' +
        '<input type="file" id="file-scen-csv" accept=".csv,text/csv" /></label>' +
        '<button type="button" class="btn" id="btn-load-files">선택한 파일 로드</button>' +
        "</div>";
    }
    root.innerHTML =
      '<div class="dataset-synthetic-warn" role="note">' +
      "본 화면의 CSV는 합성(synthetic) 시연 데이터입니다. 실제 어르신 기록이 아니며, " +
      "<code>anomaly_label</code>은 의료·응급 검증값이 아닙니다. 가스·복약 열은 시연 표시이며 센서 실연동을 의미하지 않습니다." +
      "</div>" +
      '<p class="dataset-status">' +
      Common.escapeHtml(message) +
      "</p>" +
      fileBlock;
    if (showFileInput) {
      bindFileFallback();
    }
  }

  /**
   * 파일 선택 폴백 이벤트
   */
  function bindFileFallback() {
    var btn = document.getElementById("btn-load-files");
    if (!btn) {
      return;
    }
    btn.addEventListener("click", function () {
      var demoInput = document.getElementById("file-demo-csv");
      var scenInput = document.getElementById("file-scen-csv");
      if (!demoInput || !demoInput.files || !demoInput.files[0]) {
        alert("02_demo_synthetic.csv 파일을 선택해 주세요.");
        return;
      }
      renderLoadingShell("파일을 읽는 중…", true);
      Dataset.readFileAsText(demoInput.files[0])
        .then(function (demoText) {
          var scenFile =
            scenInput && scenInput.files && scenInput.files[0] ? scenInput.files[0] : null;
          if (scenFile) {
            return Dataset.readFileAsText(scenFile).then(function (scenText) {
              return Dataset.combineParsed(demoText, scenText, "file");
            });
          }
          return Dataset.combineParsed(demoText, "", "file");
        })
        .then(applyBundle)
        .catch(function (err) {
          state.loadError = err.message || String(err);
          renderLoadingShell("파일 로드 실패: " + state.loadError, true);
        });
    });
  }

  /**
   * 로드 결과를 상태에 반영하고 화면을 갱신합니다.
   * @param {Object} bundle
   */
  function applyBundle(bundle) {
    if (!bundle.schemaOk) {
      state.loadError = bundle.schemaMessage || "스키마 검증 실패";
      renderLoadingShell(state.loadError, true);
      return;
    }
    state.allRows = bundle.rows;
    state.scenarioMap = bundle.scenarioMap || {};
    state.skipped = bundle.skipped || { count: 0, samples: [] };
    state.loadSource = bundle.loadSource || "";
    state.loadError = "";
    state.page = 1;
    renderMain();
  }

  /**
   * 숫자 포맷
   * @param {number} n
   * @param {number} digits
   * @returns {string}
   */
  function fmtNum(n, digits) {
    if (n == null || isNaN(n)) {
      return "—";
    }
    return n.toFixed(digits == null ? 1 : digits);
  }

  /**
   * 0/1 표시
   * @param {number} v
   * @returns {string}
   */
  function fmtBin(v) {
    return v === 1 ? "1" : "0";
  }

  /**
   * 시나리오 배지 HTML
   * @param {string} key
   * @returns {string}
   */
  function scenarioBadge(key) {
    var cls = "scenario-badge scenario-badge--" + key.replace(/[^a-z0-9_]/gi, "_");
    return (
      '<span class="' +
      cls +
      '">' +
      Common.escapeHtml(key) +
      "</span>"
    );
  }

  /**
   * 요약 카드 HTML
   * @param {Object} summary
   * @returns {string}
   */
  function buildSummaryHtml(summary) {
    var rangeText = summary.dateRange
      ? summary.dateRange.min + " ~ " + summary.dateRange.max
      : "—";
    var elderText = summary.elderIds.join(", ") || "—";
    var scenLines = Object.keys(summary.scenarioCounts)
      .sort()
      .map(function (key) {
        return (
          "<li>" +
          Common.escapeHtml(Dataset.scenarioLabel(key, state.scenarioMap)) +
          ": <strong>" +
          summary.scenarioCounts[key] +
          "</strong>행</li>"
        );
      })
      .join("");

    return (
      '<div class="dataset-summary-grid">' +
      '<div class="dataset-summary-card"><span class="dataset-summary-card__label">전체 로드</span><span class="dataset-summary-card__value">' +
      summary.totalLoaded +
      "행</span></div>" +
      '<div class="dataset-summary-card"><span class="dataset-summary-card__label">필터 결과</span><span class="dataset-summary-card__value">' +
      summary.filteredCount +
      "행</span></div>" +
      '<div class="dataset-summary-card"><span class="dataset-summary-card__label">대상자</span><span class="dataset-summary-card__value">' +
      Common.escapeHtml(elderText) +
      "</span></div>" +
      '<div class="dataset-summary-card"><span class="dataset-summary-card__label">기간</span><span class="dataset-summary-card__value">' +
      Common.escapeHtml(rangeText) +
      "</span></div>" +
      '<div class="dataset-summary-card"><span class="dataset-summary-card__label">합성 이상 라벨(필터)</span><span class="dataset-summary-card__value">' +
      summary.anomalyInFilter +
      "건</span></div>" +
      '<div class="dataset-summary-card"><span class="dataset-summary-card__label">로드 방식</span><span class="dataset-summary-card__value">' +
      Common.escapeHtml(state.loadSource || "—") +
      "</span></div>" +
      "</div>" +
      '<div class="dataset-scenario-list"><p class="dataset-section-title">시나리오별 행 수(필터 적용)</p><ul>' +
      scenLines +
      "</ul></div>"
    );
  }

  /**
   * 필터 폼 HTML
   * @param {Object} summary
   * @returns {string}
   */
  function buildFiltersHtml(summary) {
    var dateOpts =
      '<option value="all">전체 기간</option>' +
      (summary.dateRange
        ? summary.dateRange.dates
            .map(function (d) {
              var sel = state.filters.dateKey === d ? " selected" : "";
              return (
                '<option value="' + d + '"' + sel + ">" + Common.escapeHtml(d) + "</option>"
              );
            })
            .join("")
        : "");

    var scenOpts = '<option value="all">전체 시나리오</option>';
    listScenarioKeys().forEach(function (key) {
      var sel = state.filters.scenario === key ? " selected" : "";
      scenOpts +=
        '<option value="' +
        Common.escapeHtml(key) +
        '"' +
        sel +
        ">" +
        Common.escapeHtml(Dataset.scenarioLabel(key, state.scenarioMap)) +
        "</option>";
    });

    function anomSel(val) {
      return state.filters.anomaly === val ? " selected" : "";
    }

    return (
      '<form class="dataset-filters section" id="dataset-filters">' +
      '<div class="dataset-filters__row">' +
      '<label>날짜<select name="dateKey">' +
      dateOpts +
      "</select></label>" +
      '<label>시나리오<select name="scenario">' +
      scenOpts +
      "</select></label>" +
      '<label>합성 이상 라벨<select name="anomaly">' +
      '<option value="all"' +
      anomSel("all") +
      ">전체</option>" +
      '<option value="1"' +
      anomSel("1") +
      ">라벨 1만</option>" +
      '<option value="0"' +
      anomSel("0") +
      ">라벨 0만</option>" +
      "</select></label>" +
      '<button type="button" class="btn btn--secondary" id="btn-reset-filters">필터 초기화</button>' +
      "</div></form>"
    );
  }

  /**
   * 이벤트 건수 범례
   * @param {Object} eventCounts
   * @returns {string}
   */
  function buildEventLegend(eventCounts) {
    var items = [
      { key: "motionOn", label: "움직임 감지", color: "#2d6a4f" },
      { key: "doorOpen", label: "문 열림", color: "#1d4d3a" },
      { key: "gasAlert", label: "가스 경보(시연)", color: "#c1121f" },
      { key: "medicationDue", label: "복약 예정(시연)", color: "#e85d04" },
      { key: "medicationMissed", label: "복약 미확인(시연)", color: "#dc2f02" },
      { key: "responseNotConfirmed", label: "안부 미응답(시연)", color: "#6a040f" },
    ];
    return (
      '<div class="dataset-event-legend">' +
      items
        .map(function (it) {
          return (
            '<span class="dataset-event-legend__item"><span class="dataset-event-legend__swatch" style="background:' +
            it.color +
            '"></span>' +
            Common.escapeHtml(it.label) +
            ": <strong>" +
            eventCounts[it.key] +
            "</strong></span>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  /**
   * 추이 차트를 Canvas에 그립니다.
   * @param {HTMLCanvasElement} canvas
   * @param {Object[]} rows
   */
  function drawTrendChart(canvas, rows) {
    if (!canvas || !rows.length) {
      return;
    }
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(rect.width, 280);
    var h = Math.max(rect.height, 160);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var padL = 44;
    var padR = 44;
    var padT = 16;
    var padB = 28;
    var innerW = w - padL - padR;
    var innerH = h - padT - padB;

    var powerVals = rows.map(function (r) {
      return r.powerW;
    });
    var tempVals = rows.map(function (r) {
      return r.temperatureC;
    });
    var humVals = rows.map(function (r) {
      return r.humidityPct;
    });

    function minMax(arr) {
      var min = arr[0];
      var max = arr[0];
      for (var i = 1; i < arr.length; i++) {
        if (arr[i] < min) {
          min = arr[i];
        }
        if (arr[i] > max) {
          max = arr[i];
        }
      }
      if (min === max) {
        min -= 1;
        max += 1;
      }
      return { min: min, max: max };
    }

    var pRange = minMax(powerVals);
    var tRange = minMax(tempVals);
    var hRange = minMax(humVals);

    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + innerH);
    ctx.lineTo(padL + innerW, padT + innerH);
    ctx.stroke();

    function yScale(val, range) {
      return padT + innerH - ((val - range.min) / (range.max - range.min)) * innerH;
    }

    function drawLine(vals, color, range) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      vals.forEach(function (v, i) {
        var x = padL + (i / Math.max(vals.length - 1, 1)) * innerW;
        var y = yScale(v, range);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    drawLine(powerVals, "#2d6a4f", pRange);
    drawLine(tempVals, "#e85d04", tRange);
    drawLine(humVals, "#0077b6", hRange);

    ctx.fillStyle = "#666";
    ctx.font = "11px sans-serif";
    ctx.fillText("전력(W)", 4, padT + 10);
    ctx.fillStyle = "#e85d04";
    ctx.fillText("온도", 4, padT + 24);
    ctx.fillStyle = "#0077b6";
    ctx.fillText("습도", 4, padT + 38);
    ctx.fillStyle = "#888";
    ctx.fillText(rows.length + "점", padL, h - 6);
  }

  /**
   * 이진 이벤트 마커 차트
   * @param {HTMLCanvasElement} canvas
   * @param {Object[]} rows
   */
  function drawEventChart(canvas, rows) {
    if (!canvas || !rows.length) {
      return;
    }
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(rect.width, 280);
    var h = Math.max(rect.height, 72);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var lanes = [
      { field: "motion", color: "#2d6a4f", test: function (r) { return r.motion === 1; } },
      { field: "door", color: "#1d4d3a", test: function (r) { return r.doorOpen === 1; } },
      { field: "gas", color: "#c1121f", test: function (r) { return r.gasAlert === 1; } },
      {
        field: "med",
        color: "#e85d04",
        test: function (r) { return r.medicationDue === 1 && r.medicationTaken === 0; },
      },
      {
        field: "resp",
        color: "#6a040f",
        test: function (r) { return r.responseConfirmed === 0; },
      },
    ];
    var laneH = h / lanes.length;
    rows.forEach(function (row, i) {
      var x = (i / Math.max(rows.length - 1, 1)) * (w - 4) + 2;
      lanes.forEach(function (lane, li) {
        if (lane.test(row)) {
          var y = li * laneH + laneH * 0.2;
          ctx.fillStyle = lane.color;
          ctx.fillRect(x, y, Math.max(2, w / rows.length), laneH * 0.6);
        }
      });
    });
  }

  /**
   * 데이터 테이블과 페이지네이션 HTML
   * @param {Object[]} rows
   * @returns {string}
   */
  function buildTableHtml(rows) {
    var totalPages = Math.max(1, Math.ceil(rows.length / state.pageSize));
    if (state.page > totalPages) {
      state.page = totalPages;
    }
    if (state.page < 1) {
      state.page = 1;
    }
    var start = (state.page - 1) * state.pageSize;
    var pageRows = rows.slice(start, start + state.pageSize);

    var head =
      "<tr>" +
      TABLE_COLUMNS
        .map(function (col) {
          return "<th>" + Common.escapeHtml(col.label) + "</th>";
        })
        .join("") +
      "</tr>";

    var body = pageRows
      .map(function (row) {
        return (
          "<tr>" +
          "<td>" +
          Common.escapeHtml(row.timestamp) +
          "</td>" +
          "<td>" +
          Common.escapeHtml(row.elderId) +
          "</td>" +
          "<td>" +
          fmtBin(row.motion) +
          "</td>" +
          "<td>" +
          fmtNum(row.powerW, 1) +
          "</td>" +
          "<td>" +
          fmtBin(row.doorOpen) +
          "</td>" +
          "<td>" +
          fmtNum(row.temperatureC, 1) +
          "</td>" +
          "<td>" +
          fmtNum(row.humidityPct, 1) +
          "</td>" +
          "<td>" +
          fmtBin(row.gasAlert) +
          "</td>" +
          "<td>" +
          fmtBin(row.medicationDue) +
          "</td>" +
          "<td>" +
          fmtBin(row.medicationTaken) +
          "</td>" +
          "<td>" +
          fmtBin(row.responseConfirmed) +
          "</td>" +
          "<td>" +
          scenarioBadge(row.scenario) +
          "</td>" +
          "<td>" +
          fmtBin(row.anomalyLabel) +
          "</td>" +
          "<td>" +
          Common.escapeHtml(row.dataOrigin) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    var skipNote = "";
    if (state.skipped.count > 0) {
      var sampleText = state.skipped.samples
        .map(function (s) {
          return "줄 " + s.line + ": " + s.reason;
        })
        .join("; ");
      skipNote =
        '<p class="dataset-skip-note">건너뛴 행: <strong>' +
        state.skipped.count +
        "</strong> — " +
        Common.escapeHtml(sampleText) +
        "</p>";
    }

    return (
      skipNote +
      '<div class="table-scroll dataset-table-scroll">' +
      '<table class="data-table dataset-data-table"><thead>' +
      head +
      "</thead><tbody>" +
      (body || '<tr><td colspan="14">표시할 행이 없습니다.</td></tr>') +
      "</tbody></table></div>" +
      '<div class="dataset-pagination">' +
      '<button type="button" class="btn btn--secondary btn--small" id="btn-page-prev"' +
      (state.page <= 1 ? " disabled" : "") +
      ">이전</button>" +
      "<span>페이지 " +
      state.page +
      " / " +
      totalPages +
      " (총 " +
      rows.length +
      "행, 페이지당 " +
      state.pageSize +
      "행)</span>" +
      '<button type="button" class="btn btn--secondary btn--small" id="btn-page-next"' +
      (state.page >= totalPages ? " disabled" : "") +
      ">다음</button>" +
      "</div>"
    );
  }

  /**
   * 메인 화면 렌더
   */
  function renderMain() {
    var filtered = getFilteredRows();
    var summary = Dataset.buildSummary(state.allRows, filtered);

    root.innerHTML =
      '<div class="dataset-synthetic-warn" role="note">' +
      "본 화면의 CSV는 합성(synthetic) 시연 데이터입니다. 실제 어르신 기록이 아니며, " +
      "<code>anomaly_label</code>은 의료·응급 검증값이 아닙니다. 가스·복약 열은 시연 표시이며 센서 실연동을 의미하지 않습니다." +
      "</div>" +
      buildSummaryHtml(summary) +
      buildFiltersHtml(summary) +
      buildAnalysisSection() +
      '<section class="section dataset-chart-card">' +
      '<h2 class="dataset-section-title">전력·온습도 추이 (필터 적용)</h2>' +
      '<div class="dataset-canvas-wrap"><canvas id="chart-trend" class="dataset-canvas" aria-label="전력 온도 습도 추이"></canvas></div>' +
      "</section>" +
      '<section class="section dataset-chart-card">' +
      '<h2 class="dataset-section-title">이벤트 마커 (필터 적용)</h2>' +
      buildEventLegend(summary.eventCounts) +
      '<div class="dataset-canvas-wrap dataset-canvas-wrap--events"><canvas id="chart-events" class="dataset-canvas dataset-canvas--events" aria-label="이진 이벤트 마커"></canvas></div>' +
      "</section>" +
      '<section class="section">' +
      '<h2 class="dataset-section-title">원본 데이터 (14열)</h2>' +
      buildTableHtml(filtered) +
      "</section>";

    bindMainEvents(filtered);
    var trend = document.getElementById("chart-trend");
    var events = document.getElementById("chart-events");
    drawTrendChart(trend, filtered);
    drawEventChart(events, filtered);

    if (!window.__datasetResizeBound) {
      window.__datasetResizeBound = true;
      window.addEventListener("resize", function () {
        if (!state.allRows.length) {
          return;
        }
        var f = getFilteredRows();
        var t = document.getElementById("chart-trend");
        var e = document.getElementById("chart-events");
        drawTrendChart(t, f);
        drawEventChart(e, f);
      });
    }
  }

  /**
   * 필터·페이지 이벤트 바인딩
   * @param {Object[]} filtered
   */
  function bindMainEvents(filtered) {
    var form = document.getElementById("dataset-filters");
    if (form) {
      form.addEventListener("change", function (ev) {
        var target = ev.target;
        if (!target || !target.name) {
          return;
        }
        state.filters[target.name] = target.value;
        state.page = 1;
        renderMain();
      });
    }
    var resetBtn = document.getElementById("btn-reset-filters");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        state.filters = { dateKey: "all", scenario: "all", anomaly: "all" };
        state.page = 1;
        renderMain();
      });
    }
    var prev = document.getElementById("btn-page-prev");
    var next = document.getElementById("btn-page-next");
    if (prev) {
      prev.addEventListener("click", function () {
        state.page--;
        renderMain();
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        state.page++;
        renderMain();
      });
    }
    var learnEndInput = document.getElementById("analysis-learn-end");
    var analyzeSelect = document.getElementById("analysis-analyze-date");
    var refreshBtn = document.getElementById("analysis-refresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", function () {
        if (learnEndInput) {
          state.analysisLearnEnd = learnEndInput.value || state.analysisLearnEnd;
        }
        if (analyzeSelect) {
          state.analysisDate = analyzeSelect.value || state.analysisDate;
        }
        renderMain();
      });
    }
    if (analyzeSelect) {
      analyzeSelect.addEventListener("change", function () {
        state.analysisDate = analyzeSelect.value;
      });
    }
  }

  if (window.location.protocol === "file:") {
    renderLoadingShell(
      "로컬 파일(file://)에서는 CSV 자동 로드가 불가합니다. 아래에서 02_demo_synthetic.csv를 선택해 주세요.",
      true
    );
  } else {
    renderLoadingShell("합성 CSV를 불러오는 중…", false);
    Dataset.fetchDefaultBundle(Common)
      .then(applyBundle)
      .catch(function (err) {
        state.loadError = err.message || String(err);
        renderLoadingShell(
          "자동 로드 실패: " +
            state.loadError +
            " — 상대 경로: " +
            Dataset.DEMO_CSV_REL +
            " — 아래에서 파일을 선택할 수 있습니다.",
          true
        );
      });
  }
})();
