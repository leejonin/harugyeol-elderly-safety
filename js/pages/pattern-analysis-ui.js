/**
 * CSV 규칙 분석 패널 공통 UI
 * @namespace Harugyeol.PatternAnalysisUI
 */
(function (global) {
  "use strict";

  var Common = global.Harugyeol.Common;
  var PatternAnalysis = global.Harugyeol.PatternAnalysis;

  /**
   * 분석 성공 시 연동 태그용 세션 플래그를 설정합니다.
   */
  function markPatternAnalysisActive() {
    try {
      global.sessionStorage.setItem("harugyeol_pattern_analysis_active", "1");
    } catch (e) {
      /* ignore */
    }
    if (Common && Common.setPatternAnalysisActive) {
      Common.setPatternAnalysisActive(true);
    }
  }

  /**
   * usualWindows 미니 타임라인 SVG
   * @param {Object} baseline
   * @returns {string}
   */
  function buildBaselineSvg(baseline) {
    if (!baseline || !baseline.usualWindows) {
      return "";
    }
    var w = 480;
    var h = 72;
    var pad = 28;
    var innerW = w - pad * 2;
    var svg =
      '<svg class="analysis-baseline-svg" width="100%" height="' +
      h +
      '" viewBox="0 0 ' +
      w +
      " " +
      h +
      '" role="img" aria-label="학습 기준 활동 시간대">';
    svg += '<rect width="' + w + '" height="' + h + '" fill="#faf9f6"/>';
    svg +=
      '<line x1="' +
      pad +
      '" y1="' +
      (h - 18) +
      '" x2="' +
      (w - pad) +
      '" y2="' +
      (h - 18) +
      '" stroke="#ccc"/>';
    baseline.usualWindows.forEach(function (win) {
      var x1 = pad + (win.startHour / 24) * innerW;
      var x2 = pad + (win.endHour / 24) * innerW;
      svg +=
        '<rect x="' +
        x1 +
        '" y="12" width="' +
        (x2 - x1) +
        '" height="36" fill="#40916c" opacity="0.35" rx="4"/>';
    });
    svg +=
      '<text x="' +
      pad +
      '" y="10" font-size="10" fill="#2d6a4f">녹색: 학습 기준 활동 구간(규칙)</text>';
    svg += "</svg>";
    return svg;
  }

  /**
   * 비교 상태 배지 클래스
   * @param {string} status
   * @returns {string}
   */
  function statusClass(status) {
    if (status === "alert") {
      return "analysis-status analysis-status--alert";
    }
    if (status === "watch") {
      return "analysis-status analysis-status--watch";
    }
    return "analysis-status analysis-status--ok";
  }

  /**
   * 분석 패널 HTML
   * @param {Object} analysis - runFullAnalysis 결과
   * @param {Object} opts
   * @param {string[]} opts.dates - 선택 가능 날짜
   * @param {string} opts.learnEnd
   * @param {string} opts.analyzeDate
   * @param {boolean} [opts.showControls]
   * @returns {string}
   */
  function renderAnalysisPanel(analysis, opts) {
    if (!analysis) {
      return "";
    }
    opts = opts || {};
    var baseline = analysis.baseline;
    var day = analysis.dayResult;
    var composite = analysis.composite;
    var meta = analysis.datasetMeta;
    var dates = opts.dates || [];
    var learnEnd = opts.learnEnd || baseline.learnEnd;
    var analyzeDate = opts.analyzeDate || analysis.meta.analyzeDate;

    var dateOpts = dates
      .map(function (d) {
        var sel = d === analyzeDate ? " selected" : "";
        return '<option value="' + d + '"' + sel + ">" + Common.escapeHtml(d) + "</option>";
      })
      .join("");

    var learnOpts = dates
      .filter(function (d) {
        return d <= "2026-10-10";
      })
      .map(function (d) {
        var sel = d === learnEnd ? " selected" : "";
        return '<option value="' + d + '"' + sel + ">" + Common.escapeHtml(d) + "</option>";
      })
      .join("");

    var readyBadge =
      baseline.analysisReady === "insufficient"
        ? Common.renderStatusBadge("insufficient_data")
        : '<span class="analysis-status analysis-status--ok">분석 준비: ready</span>';

    var compareRows =
      "<tr><th>항목</th><th>상태</th><th>설명</th></tr>" +
      "<tr><td>가전·전력 (4.2.1)</td><td><span class=\"" +
      statusClass(day.plug.status) +
      '">' +
      Common.escapeHtml(day.plug.status) +
      "</span></td><td>" +
      Common.escapeHtml(day.plug.message) +
      "</td></tr>" +
      "<tr><td>활동·움직임 (4.2.2)</td><td><span class=\"" +
      statusClass(day.motion.status) +
      '">' +
      Common.escapeHtml(day.motion.status) +
      "</span></td><td>" +
      Common.escapeHtml(day.motion.message) +
      "</td></tr>" +
      "<tr><td>문 열림 (4.2.3)</td><td><span class=\"" +
      statusClass(day.door.status) +
      '">' +
      Common.escapeHtml(day.door.status) +
      "</span></td><td>" +
      Common.escapeHtml(day.door.message) +
      "</td></tr>";

    var reasonsHtml = "";
    if (composite.reasons.length) {
      reasonsHtml = "<ul>";
      composite.reasons.forEach(function (r) {
        reasonsHtml += "<li>" + Common.escapeHtml(r) + "</li>";
      });
      reasonsHtml += "</ul>";
    } else {
      reasonsHtml = '<p class="muted">복합 판단 근거가 없습니다.</p>';
    }

    var scenLines = Object.keys(meta.scenarios || {})
      .map(function (k) {
        return Common.escapeHtml(k) + ": " + meta.scenarios[k] + "행";
      })
      .join(", ");

    var controls = "";
    if (opts.showControls) {
      controls =
        '<div class="analysis-controls">' +
        '<label>학습 종료일<input type="date" id="analysis-learn-end" value="' +
        Common.escapeHtml(learnEnd) +
        '" list="analysis-learn-list" /></label>' +
        '<datalist id="analysis-learn-list">' +
        learnOpts.replace(/<option/g, "<option").replace(/selected/g, "") +
        "</datalist>" +
        '<label>분석 날짜<select id="analysis-analyze-date">' +
        dateOpts +
        "</select></label>" +
        '<button type="button" class="btn btn--secondary btn--small" id="analysis-refresh">분석 다시 실행</button>' +
        "</div>";
    }

    return (
      '<section class="section analysis-panel" id="pattern-analysis-panel">' +
      "<h2>AI 생활패턴 분석 (규칙·CSV 시연)</h2>" +
      '<p class="analysis-panel-note">브라우저 규칙 엔진이 합성 CSV를 분석합니다. 클라우드 ML·실제 센서 학습이 아닙니다.</p>' +
      controls +
      '<p class="analysis-meta">대상: <strong>' +
      Common.escapeHtml(analysis.meta.elderId) +
      "</strong> · 학습 " +
      Common.escapeHtml(baseline.learnStart) +
      "~" +
      Common.escapeHtml(baseline.learnEnd) +
      " (" +
      baseline.learnRowCount +
      "행) · 분석일 " +
      Common.escapeHtml(analyzeDate) +
      "</p>" +
      readyBadge +
      '<h3 class="dataset-section-title">평소 기준 (4.1.1)</h3>' +
      buildBaselineSvg(baseline) +
      '<h3 class="dataset-section-title">생활 변화 비교 (4.2.1~4.2.3)</h3>' +
      '<div class="table-scroll"><table class="data-table analysis-compare-table">' +
      compareRows +
      "</table></div>" +
      '<h3 class="dataset-section-title">복합 판단 (4.2.4)</h3>' +
      "<p>" +
      Common.renderStatusBadge(composite.summaryStatus) +
      "</p>" +
      reasonsHtml +
      '<p class="muted">' +
      Common.escapeHtml(composite.note) +
      "</p>" +
      '<h3 class="dataset-section-title">데이터셋 참고 (합성 라벨)</h3>' +
      '<div class="analysis-label-compare">' +
      "<p>주 시나리오: <code>" +
      Common.escapeHtml(meta.primaryScenario) +
      "</code> · 시나리오별: " +
      scenLines +
      " · anomaly_label=1: <strong>" +
      meta.anomalyLabelCount +
      "</strong>건</p>" +
      '<p class="muted">라벨은 검증 참고용이며 규칙 판단과 다를 수 있습니다.</p>' +
      "</div></section>"
    );
  }

  global.Harugyeol = global.Harugyeol || {};
  global.Harugyeol.PatternAnalysisUI = {
    markPatternAnalysisActive: markPatternAnalysisActive,
    renderAnalysisPanel: renderAnalysisPanel,
    buildBaselineSvg: buildBaselineSvg,
  };
})(window);
