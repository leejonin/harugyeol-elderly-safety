/**
 * AI 대화용 CSV 시연 데이터 요약 (sessionStorage)
 * @namespace Harugyeol.ChatCsvContext
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "harugyeol_csv_chat_snapshot_v1";

  /**
   * 시나리오별 행 수 집계
   * @param {Object[]} rows
   * @returns {Object.<string, number>}
   */
  function countScenarios(rows) {
    var out = {};
    rows.forEach(function (row) {
      out[row.scenario] = (out[row.scenario] || 0) + 1;
    });
    return out;
  }

  /**
   * 날짜 범위
   * @param {Object[]} rows
   * @returns {{ min: string, max: string }|null}
   */
  function dateRangeOf(rows) {
    var dates = [];
    rows.forEach(function (row) {
      if (dates.indexOf(row.dateKey) < 0) {
        dates.push(row.dateKey);
      }
    });
    if (!dates.length) {
      return null;
    }
    dates.sort();
    return { min: dates[0], max: dates[dates.length - 1] };
  }

  /**
   * 분석 결과를 대화용으로 축약합니다.
   * @param {Object} analysis
   * @returns {Object}
   */
  function compactAnalysis(analysis) {
    if (!analysis) {
      return null;
    }
    return {
      analysisReady: analysis.baseline ? analysis.baseline.analysisReady : null,
      learnStart: analysis.baseline ? analysis.baseline.learnStart : null,
      learnEnd: analysis.baseline ? analysis.baseline.learnEnd : null,
      analyzeDate: analysis.meta ? analysis.meta.analyzeDate : null,
      compositeStatus: analysis.composite ? analysis.composite.summaryStatus : null,
      reasons: analysis.composite ? (analysis.composite.reasons || []).slice(0, 6) : [],
      plugStatus: analysis.dayResult && analysis.dayResult.plug ? analysis.dayResult.plug.status : null,
      plugMessage: analysis.dayResult && analysis.dayResult.plug ? analysis.dayResult.plug.message : "",
      motionStatus: analysis.dayResult && analysis.dayResult.motion ? analysis.dayResult.motion.status : null,
      motionMessage: analysis.dayResult && analysis.dayResult.motion ? analysis.dayResult.motion.message : "",
      doorStatus: analysis.dayResult && analysis.dayResult.door ? analysis.dayResult.door.status : null,
      doorMessage: analysis.dayResult && analysis.dayResult.door ? analysis.dayResult.door.message : "",
      datasetPrimaryScenario: analysis.datasetMeta ? analysis.datasetMeta.primaryScenario : null,
      anomalyLabelCount: analysis.datasetMeta ? analysis.datasetMeta.anomalyLabelCount : 0,
    };
  }

  /**
   * CSV 행에서 대화용 스냅샷을 만들고 저장합니다.
   * @param {Object[]} rows
   * @param {Object} [options]
   * @param {string} [options.analyzeDate]
   * @param {string} [options.learnEnd]
   * @returns {Object|null}
   */
  function persistFromRows(rows, options) {
    if (!rows || !rows.length) {
      return null;
    }
    options = options || {};
    var PatternAnalysis = global.Harugyeol && global.Harugyeol.PatternAnalysis;
    var analyzeDate =
      options.analyzeDate ||
      (rows[rows.length - 1] ? rows[rows.length - 1].dateKey : null);
    var learnEnd =
      options.learnEnd ||
      (PatternAnalysis ? PatternAnalysis.DEFAULT_LEARN_END : "2026-10-07");

    var analysis = null;
    if (PatternAnalysis) {
      PatternAnalysis.clearCache();
      analysis = PatternAnalysis.runFullAnalysis(rows, {
        learnStart: PatternAnalysis.DEFAULT_LEARN_START,
        learnEnd: learnEnd,
        analyzeDate: analyzeDate,
        noCache: true,
      });
    }

    var snapshot = {
      updatedAt: new Date().toISOString(),
      source: options.source || "unknown",
      elderId: rows[0].elderId || "E001",
      rowCount: rows.length,
      dataOrigin: rows[0].dataOrigin || "synthetic",
      dateRange: dateRangeOf(rows),
      scenarioCounts: countScenarios(rows),
      analyzeDate: analyzeDate,
      learnEnd: learnEnd,
      analysis: compactAnalysis(analysis),
    };

    try {
      global.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      /* ignore quota */
    }
    return snapshot;
  }

  /**
   * 저장된 스냅샷을 읽습니다.
   * @returns {Object|null}
   */
  function getSnapshot() {
    try {
      var raw = global.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /**
   * 스냅샷 존재 여부
   * @returns {boolean}
   */
  function hasSnapshot() {
    return !!getSnapshot();
  }

  /**
   * GPT 시스템 프롬프트용 참고 텍스트
   * @param {Object|null} snapshot
   * @returns {string}
   */
  function buildHintsText(snapshot) {
    if (!snapshot) {
      return "";
    }
    var lines = [];
    lines.push(
      "합성 CSV 시연 패키지(실제 어르신 기록·센서 실연동 아님). anomaly_label은 의료·응급 검증값이 아님."
    );
    lines.push(
      "대상 ID: " +
        snapshot.elderId +
        ", 총 " +
        snapshot.rowCount +
        "행, 출처: " +
        snapshot.dataOrigin
    );
    if (snapshot.dateRange) {
      lines.push(
        "기간: " + snapshot.dateRange.min + " ~ " + snapshot.dateRange.max
      );
    }
    if (snapshot.scenarioCounts) {
      var scen = Object.keys(snapshot.scenarioCounts)
        .map(function (k) {
          return k + " " + snapshot.scenarioCounts[k] + "행";
        })
        .join(", ");
      lines.push("시나리오 분포: " + scen);
    }
    if (snapshot.analysis) {
      var a = snapshot.analysis;
      lines.push(
        "규칙 분석(시연): 학습 " +
          (a.learnStart || "?") +
          "~" +
          (a.learnEnd || "?") +
          ", 분석일 " +
          (a.analyzeDate || "?") +
          ", 준비 " +
          (a.analysisReady || "?")
      );
      lines.push(
        "복합 판단(규칙): " +
          (a.compositeStatus || "—") +
          (a.reasons && a.reasons.length
            ? " — " + a.reasons.join(" / ")
            : "")
      );
      lines.push(
        "가전(4.2.1): " +
          a.plugStatus +
          " — " +
          a.plugMessage +
          "; 활동(4.2.2): " +
          a.motionStatus +
          " — " +
          a.motionMessage +
          "; 문(4.2.3): " +
          a.doorStatus +
          " — " +
          a.doorMessage
      );
      lines.push(
        "데이터셋 참고(분석일): 시나리오 " +
          (a.datasetPrimaryScenario || "—") +
          ", anomaly_label=1 " +
          (a.anomalyLabelCount || 0) +
          "건"
      );
    }
    lines.push(
      "위 정보는 CSV·규칙 시연 참고용입니다. 대화에서 안전·응급을 확정하지 말고, 사용자 질문에 맞게 쉬운 말로 설명하세요."
    );
    return lines.join("\n");
  }

  /**
   * HTTP에서 CSV를 불러와 스냅샷을 갱신합니다.
   * @param {Object} common - Harugyeol.Common
   * @returns {Promise<Object|null>}
   */
  function refreshFromNetwork(common) {
    var Dataset = global.Harugyeol && global.Harugyeol.Dataset;
    if (!Dataset || global.location.protocol === "file:") {
      return Promise.resolve(getSnapshot());
    }
    return Dataset.fetchDefaultBundle(common).then(function (bundle) {
      if (!bundle.schemaOk) {
        throw new Error(bundle.schemaMessage || "CSV 스키마 오류");
      }
      return persistFromRows(bundle.rows, {
        source: "chat_fetch",
        analyzeDate: "2026-10-14",
      });
    });
  }

  global.Harugyeol = global.Harugyeol || {};
  global.Harugyeol.ChatCsvContext = {
    STORAGE_KEY: STORAGE_KEY,
    persistFromRows: persistFromRows,
    getSnapshot: getSnapshot,
    hasSnapshot: hasSnapshot,
    buildHintsText: buildHintsText,
    refreshFromNetwork: refreshFromNetwork,
  };
})(window);
