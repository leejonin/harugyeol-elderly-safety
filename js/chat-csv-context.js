/**
 * AI 대화용 CSV 시연 데이터 요약 (sessionStorage)
 * @namespace Harugyeol.ChatCsvContext
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "harugyeol_csv_chat_snapshot_v1";
  var DEFAULT_REPORT_YEAR = 2026;
  /** @type {Object[]|null} */
  var cachedRows = null;

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

    cachedRows = rows;
    try {
      global.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      /* ignore quota */
    }
    return snapshot;
  }

  /**
   * 메모리에 캐시된 CSV 행
   * @returns {Object[]|null}
   */
  function getCachedRows() {
    return cachedRows;
  }

  /**
   * CSV 행 캐시 설정
   * @param {Object[]|null} rows
   */
  function setCachedRows(rows) {
    cachedRows = rows && rows.length ? rows : null;
  }

  /**
   * 보고서·리포트 요청 문구인지 판별합니다.
   * @param {string} text
   * @returns {boolean}
   */
  function isDailyReportRequest(text) {
    if (!text) {
      return false;
    }
    var t = String(text).trim();
    if (/보고서|리포트|report/i.test(t)) {
      return true;
    }
    if (/생활\s*패턴\s*분석|패턴\s*분석\s*보고|분석\s*보고서/i.test(t)) {
      return true;
    }
    if (
      /(\d{1,2}\s*월\s*\d{1,2}\s*일|20\d{2}-\d{2}-\d{2})/.test(t) &&
      /(제출|생활\s*패턴|패턴\s*분석|분석\s*(해|줘|부탁|출력))/i.test(t)
    ) {
      return true;
    }
    if (/제출/.test(t) && /(\d{1,2}\s*월\s*\d{1,2}\s*일|20\d{2}-\d{2}-\d{2})/.test(t)) {
      return true;
    }
    return false;
  }

  /**
   * 짧은 긍정·확인 응답인지 (직전 보고서 요청 이어가기)
   * @param {string} text
   * @returns {boolean}
   */
  function isShortAffirmation(text) {
    if (!text) {
      return false;
    }
    var t = String(text).trim();
    if (t.length > 12) {
      return false;
    }
    return /^(네+|ㅇㅇ+|응+|yes|ok|okay|좋아|그래|맞아|해줘|부탁|진행|알겠)$/i.test(t);
  }

  /**
   * 보고서 생성을 처리할지, 어떤 문장에서 날짜를 뽑을지 결정
   * @param {string} text - 방금 보낸 사용자 메시지
   * @param {Array<{role: string, content: string}>} priorMessages - 그 이전 대화
   * @returns {{ shouldHandle: boolean, sourceText: string }}
   */
  function resolveReportIntent(text, priorMessages) {
    var current = String(text || "").trim();
    if (isDailyReportRequest(current)) {
      return { shouldHandle: true, sourceText: current };
    }
    if (isShortAffirmation(current) && priorMessages && priorMessages.length) {
      for (var i = priorMessages.length - 1; i >= 0; i--) {
        var m = priorMessages[i];
        if (m.role === "user" && isDailyReportRequest(m.content)) {
          return { shouldHandle: true, sourceText: m.content };
        }
      }
    }
    return { shouldHandle: false, sourceText: current };
  }

  /**
   * 메시지에 날짜 표현이 포함됐는지 (한글·ISO)
   * @param {string} text
   * @returns {boolean}
   */
  function messageMentionsDate(text) {
    if (!text) {
      return false;
    }
    return /(\d{1,2}\s*월\s*\d+\s*일|20\d{2}-\d{2}-\d{2})/.test(String(text));
  }

  /**
   * YYYY-MM-DD 달력상 유효 여부
   * @param {string} dateKey
   * @returns {boolean}
   */
  function isValidCalendarDateKey(dateKey) {
    var p = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!p) {
      return false;
    }
    var y = parseInt(p[1], 10);
    var m = parseInt(p[2], 10);
    var d = parseInt(p[3], 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) {
      return false;
    }
    var dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }

  /**
   * 사용자 메시지에서 YYYY-MM-DD 날짜 추출 (유효하지 않으면 null)
   * @param {string} text
   * @param {{ min: string, max: string }|null} [dateRange]
   * @returns {string|null}
   */
  function parseDateFromMessage(text, dateRange) {
    if (!text) {
      return null;
    }
    var iso = text.match(/(20\d{2})-(\d{2})-(\d{2})/);
    if (iso) {
      var isoKey = iso[1] + "-" + iso[2] + "-" + iso[3];
      return isValidCalendarDateKey(isoKey) ? isoKey : null;
    }
    var kr = text.match(/(\d{1,2})\s*월\s*(\d{1,3})\s*일/);
    if (kr) {
      var monthNum = parseInt(kr[1], 10);
      var dayNum = parseInt(kr[2], 10);
      if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
        return null;
      }
      var year = DEFAULT_REPORT_YEAR;
      if (dateRange && dateRange.min) {
        year = parseInt(dateRange.min.slice(0, 4), 10);
      }
      var mm = String(monthNum).padStart(2, "0");
      var dd = String(dayNum).padStart(2, "0");
      var krKey = year + "-" + mm + "-" + dd;
      return isValidCalendarDateKey(krKey) ? krKey : null;
    }
    return null;
  }

  /**
   * 보고서에 쓸 날짜 결정 (잘못된 날짜·범위 밖이면 오류)
   * @param {string} userText
   * @param {Object|null} snapshot
   * @param {Object[]} rows
   * @returns {{ ok: true, dateKey: string }|{ ok: false, message: string }}
   */
  function resolveReportDateKey(userText, snapshot, rows) {
    var range =
      (snapshot && snapshot.dateRange) ||
      (rows && rows.length ? dateRangeOf(rows) : null);
    var rangeHint = range
      ? range.min + " ~ " + range.max
      : "2026-10-01 ~ 2026-10-14";
    var mentioned = messageMentionsDate(userText);
    var dateKey = parseDateFromMessage(
      userText,
      range || (snapshot && snapshot.dateRange) || null
    );

    if (mentioned && !dateKey) {
      return {
        ok: false,
        message:
          "입력하신 날짜를 이해하지 못했거나 없는 날짜입니다. (예: 「12월 311일」은 잘못된 날짜입니다.) CSV 시연 기간은 " +
          rangeHint +
          " 입니다. 예: 「10월 11일 생활패턴 분석 보고서」",
      };
    }

    if (!dateKey) {
      if (snapshot && snapshot.analyzeDate) {
        dateKey = snapshot.analyzeDate;
      } else if (range && range.max) {
        dateKey = range.max;
      } else {
        return {
          ok: false,
          message:
            "보고서 날짜를 알려 주세요. CSV 시연 기간 " +
            rangeHint +
            " 안의 날짜로 요청해 주세요.",
        };
      }
    }

    if (range && (dateKey < range.min || dateKey > range.max)) {
      return {
        ok: false,
        message:
          dateKey +
          " 은(는) CSV 시연 데이터에 없습니다. 사용 가능 기간: " +
          rangeHint +
          " (예: 10월 4일, 10월 11일)",
      };
    }

    if (rows && rows.length) {
      var hasDay = rows.some(function (r) {
        return r.dateKey === dateKey;
      });
      if (!hasDay) {
        return {
          ok: false,
          message:
            dateKey +
            " 날짜 행이 CSV에 없습니다. 시연 기간 " +
            rangeHint +
            " 중 하루를 지정해 주세요.",
        };
      }
    }

    return { ok: true, dateKey: dateKey };
  }

  /**
   * 해당 날짜 행 통계
   * @param {Object[]} dayRows
   * @returns {Object}
   */
  function dayStats(dayRows) {
    var motionOn = 0;
    var doorOpen = 0;
    var gasAlert = 0;
    var powerSum = 0;
    var scenarios = {};
    var anomaly = 0;
    dayRows.forEach(function (r) {
      if (r.motion === 1) {
        motionOn++;
      }
      if (r.doorOpen === 1) {
        doorOpen++;
      }
      if (r.gasAlert === 1) {
        gasAlert++;
      }
      powerSum += r.powerW;
      scenarios[r.scenario] = (scenarios[r.scenario] || 0) + 1;
      if (r.anomalyLabel === 1) {
        anomaly++;
      }
    });
    var n = dayRows.length || 1;
    return {
      rowCount: dayRows.length,
      motionOn: motionOn,
      motionRatio: motionOn / n,
      doorOpen: doorOpen,
      gasAlert: gasAlert,
      avgPowerW: powerSum / n,
      scenarios: scenarios,
      anomalyLabelCount: anomaly,
    };
  }

  /**
   * 일별 CSV 시연 보고서(마크다운) 생성
   * @param {Object[]} rows
   * @param {string} dateKey
   * @param {Object} [options]
   * @param {string} [options.elderLabel] - 화면 표시용 이름
   * @param {string} [options.learnEnd]
   * @returns {{ dateKey: string, markdown: string, summaryText: string, filename: string }}
   */
  function buildDailyReport(rows, dateKey, options) {
    options = options || {};
    var PatternAnalysis = global.Harugyeol.PatternAnalysis;
    var learnEnd =
      options.learnEnd ||
      (PatternAnalysis ? PatternAnalysis.DEFAULT_LEARN_END : "2026-10-07");
    var dayRows = rows.filter(function (r) {
      return r.dateKey === dateKey;
    });
    if (!dayRows.length) {
      throw new Error(dateKey + " 날짜 데이터가 CSV에 없습니다.");
    }
    var stats = dayStats(dayRows);
    var analysis = null;
    if (PatternAnalysis) {
      PatternAnalysis.clearCache();
      analysis = PatternAnalysis.runFullAnalysis(rows, {
        learnStart: PatternAnalysis.DEFAULT_LEARN_START,
        learnEnd: learnEnd,
        analyzeDate: dateKey,
        noCache: true,
      });
    }
    var elderId = dayRows[0].elderId || "E001";
    var elderLabel = options.elderLabel || elderId;
    var userHint = options.userHint || "";
    var title =
      /생활\s*패턴|패턴\s*분석/i.test(userHint) ||
      /생활\s*패턴|패턴\s*분석/i.test(options.reportTitleHint || "")
        ? "하루결 CSV 시연 생활패턴 분석 보고서"
        : "하루결 CSV 시연 일별 보고서";
    var lines = [];
    lines.push("# " + title);
    lines.push("");
    lines.push("- 문서 성격: **합성(synthetic) 시연 데이터** — 실제 어르신 기록·의료 검증 아님");
    lines.push("- 생성 시각: " + new Date().toLocaleString("ko-KR"));
    lines.push("- 분석 대상일: **" + dateKey + "**");
    lines.push("- CSV 대상 ID: **" + elderId + "** (화면 선택 어르신: " + elderLabel + ")");
    lines.push("- 데이터 출처: " + (dayRows[0].dataOrigin || "synthetic"));
    lines.push("- 해당일 기록: " + stats.rowCount + "행 (10분 간격)");
    lines.push("");
    lines.push("## 1. 해당일 생활 신호 요약");
    lines.push("- 움직임 감지: " + stats.motionOn + "회 (비율 " + (stats.motionRatio * 100).toFixed(1) + "%)");
    lines.push("- 문 열림: " + stats.doorOpen + "회");
    lines.push("- 평균 전력: " + stats.avgPowerW.toFixed(1) + " W");
    lines.push("- 가스 경보(시연): " + stats.gasAlert + "회");
    lines.push("- 합성 anomaly_label=1: " + stats.anomalyLabelCount + "건");
    lines.push("- 시나리오: " + Object.keys(stats.scenarios).map(function (k) {
      return k + " " + stats.scenarios[k] + "행";
    }).join(", "));
    lines.push("");
    if (analysis) {
      var c = analysis.composite;
      var d = analysis.dayResult;
      lines.push("## 2. 규칙 기반 생활패턴 분석 (시연)");
      lines.push("- 학습 구간: " + analysis.baseline.learnStart + " ~ " + analysis.baseline.learnEnd);
      lines.push("- 분석 준비: " + analysis.baseline.analysisReady);
      lines.push("- 복합 판단: **" + c.summaryStatus + "**");
      if (c.reasons && c.reasons.length) {
        lines.push("- 판단 근거:");
        c.reasons.forEach(function (r) {
          lines.push("  - " + r);
        });
      }
      lines.push("- 가전(4.2.1): " + d.plug.status + " — " + d.plug.message);
      lines.push("- 활동(4.2.2): " + d.motion.status + " — " + d.motion.message);
      lines.push("- 문(4.2.3): " + d.door.status + " — " + d.door.message);
      lines.push("- 데이터셋 참고 시나리오: " + analysis.datasetMeta.primaryScenario);
      lines.push("");
      lines.push("> " + c.note);
    }
    lines.push("");
    lines.push("## 3. 안내");
    lines.push("- 본 보고서는 GitHub Pages·CSV 시연 패키지 기반 **규칙 엔진** 결과입니다.");
    lines.push("- 센서 실연동·클라우드 ML 학습·공식 제출 문서가 아닙니다.");
    var markdown = lines.join("\n");
    var summaryText =
      dateKey +
      " CSV 시연 일별 보고서를 작성했습니다. (합성 데이터·규칙 분석) 아래에서 **미리보기**와 **다운로드**를 이용하세요.";
    return {
      dateKey: dateKey,
      markdown: markdown,
      summaryText: summaryText,
      filename: "harugyeol-csv-report-" + dateKey + ".md",
    };
  }

  /**
   * CSV 행을 확보합니다 (캐시 또는 네트워크).
   * @param {Object} common
   * @returns {Promise<Object[]>}
   */
  function ensureRows(common) {
    if (cachedRows && cachedRows.length) {
      return Promise.resolve(cachedRows);
    }
    return refreshFromNetwork(common).then(function () {
      if (cachedRows && cachedRows.length) {
        return cachedRows;
      }
      throw new Error(
        "CSV 데이터가 없습니다. 설정에서 「CSV 참고 갱신」을 누르거나 CSV 시연 화면을 먼저 열어 주세요."
      );
    });
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
      setCachedRows(bundle.rows);
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
    getCachedRows: getCachedRows,
    setCachedRows: setCachedRows,
    getSnapshot: getSnapshot,
    hasSnapshot: hasSnapshot,
    buildHintsText: buildHintsText,
    isDailyReportRequest: isDailyReportRequest,
    isShortAffirmation: isShortAffirmation,
    resolveReportIntent: resolveReportIntent,
    messageMentionsDate: messageMentionsDate,
    parseDateFromMessage: parseDateFromMessage,
    resolveReportDateKey: resolveReportDateKey,
    buildDailyReport: buildDailyReport,
    ensureRows: ensureRows,
    refreshFromNetwork: refreshFromNetwork,
  };
})(window);
