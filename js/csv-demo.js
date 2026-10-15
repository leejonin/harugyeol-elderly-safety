/**
 * 합성 CSV 시연 데이터 파싱·검증·필터·집계
 * @namespace Harugyeol.Dataset
 */
(function (global) {
  "use strict";

  /**
   * 필수 CSV 열 이름(순서 포함)
   * @type {string[]}
   */
  var REQUIRED_COLUMNS = [
    "timestamp",
    "elder_id",
    "motion",
    "power_w",
    "door_open",
    "temperature_c",
    "humidity_pct",
    "gas_alert",
    "medication_due",
    "medication_taken",
    "response_confirmed",
    "scenario",
    "anomaly_label",
    "data_origin",
  ];

  var DEMO_CSV_REL = "./date/harugyeol_dataset_package/02_demo_synthetic.csv";
  var SCENARIOS_CSV_REL = "./date/harugyeol_dataset_package/03_scenarios.csv";

  /**
   * 현재 HTML 페이지 기준 상대 경로를 절대 URL로 해석합니다.
   * GitHub Pages 하위 경로·폴더명 공백 등을 fetch에 맞게 인코딩합니다.
   * @param {string} relative - 예: ./date/.../02_demo_synthetic.csv
   * @returns {string}
   */
  function resolvePageRelativeUrl(relative) {
    var base =
      (global.document && global.document.baseURI) || global.location.href;
    var path = String(relative || "").replace(/^\//, "");
    return new URL(path, base).href;
  }

  /**
   * UTF-8 BOM을 제거합니다.
   * @param {string} text
   * @returns {string}
   */
  function stripBom(text) {
    if (!text || text.charCodeAt(0) !== 0xfeff) {
      return text || "";
    }
    return text.slice(1);
  }

  /**
   * 따옴표를 처리하는 CSV 한 줄 파서
   * @param {string} line
   * @returns {string[]}
   */
  function parseCsvLine(line) {
    var out = [];
    var cur = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  /**
   * CSV 텍스트를 헤더와 원시 행 배열로 분리합니다.
   * @param {string} text
   * @returns {{ headers: string[], lines: string[] }}
   */
  function splitCsvText(text) {
    var normalized = stripBom(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    var lines = normalized.split("\n").filter(function (ln) {
      return ln.length > 0;
    });
    if (!lines.length) {
      return { headers: [], lines: [] };
    }
    return {
      headers: parseCsvLine(lines[0]).map(function (h) {
        return h.trim();
      }),
      lines: lines.slice(1),
    };
  }

  /**
   * 헤더가 14열 스키마와 일치하는지 검증합니다.
   * @param {string[]} headers
   * @returns {{ ok: boolean, message: string }}
   */
  function validateHeaders(headers) {
    if (!headers || headers.length !== REQUIRED_COLUMNS.length) {
      return {
        ok: false,
        message:
          "열 개수가 " +
          REQUIRED_COLUMNS.length +
          "개가 아닙니다. (실제: " +
          (headers ? headers.length : 0) +
          ")",
      };
    }
    for (var i = 0; i < REQUIRED_COLUMNS.length; i++) {
      if (headers[i] !== REQUIRED_COLUMNS[i]) {
        return {
          ok: false,
          message:
            "열 이름 또는 순서가 맞지 않습니다. 기대: " +
            REQUIRED_COLUMNS[i] +
            ", 실제: " +
            headers[i],
        };
      }
    }
    return { ok: true, message: "" };
  }

  /**
   * 0/1 정수 필드를 파싱합니다.
   * @param {string} raw
   * @param {string} fieldName
   * @returns {number}
   */
  function parseBinaryField(raw, fieldName) {
    var v = String(raw).trim();
    if (v === "0" || v === "1") {
      return parseInt(v, 10);
    }
    throw new Error(fieldName + " 값은 0 또는 1이어야 합니다: " + raw);
  }

  /**
   * 시연 데이터 한 행을 객체로 변환합니다.
   * @param {string[]} cells
   * @param {number} lineNumber - 파일 내 줄 번호(헤더 제외 1부터)
   * @returns {Object}
   */
  function rowFromCells(cells, lineNumber) {
    if (cells.length !== REQUIRED_COLUMNS.length) {
      throw new Error("열 개수 " + cells.length + " (줄 " + lineNumber + ")");
    }
    var ts = cells[0].trim();
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(ts)) {
      throw new Error("timestamp 형식 오류: " + ts);
    }
    var dateKey = ts.slice(0, 10);
    return {
      timestamp: ts,
      dateKey: dateKey,
      elderId: cells[1].trim(),
      motion: parseBinaryField(cells[2], "motion"),
      powerW: parseFloat(cells[3]),
      doorOpen: parseBinaryField(cells[4], "door_open"),
      temperatureC: parseFloat(cells[5]),
      humidityPct: parseFloat(cells[6]),
      gasAlert: parseBinaryField(cells[7], "gas_alert"),
      medicationDue: parseBinaryField(cells[8], "medication_due"),
      medicationTaken: parseBinaryField(cells[9], "medication_taken"),
      responseConfirmed: parseBinaryField(cells[10], "response_confirmed"),
      scenario: cells[11].trim(),
      anomalyLabel: parseBinaryField(cells[12], "anomaly_label"),
      dataOrigin: cells[13].trim(),
    };
  }

  /**
   * 시나리오 설명 CSV를 맵으로 파싱합니다.
   * @param {string} text
   * @returns {Object.<string, { meaning: string, isRealIncidentLabel: string }>}
   */
  function parseScenariosCsv(text) {
    var split = splitCsvText(text);
    var map = {};
    split.lines.forEach(function (line, idx) {
      var cells = parseCsvLine(line);
      if (cells.length < 3) {
        return;
      }
      map[cells[0].trim()] = {
        meaning: cells[1].trim(),
        isRealIncidentLabel: cells[2].trim(),
      };
    });
    return map;
  }

  /**
   * 시연 합성 CSV를 파싱합니다.
   * @param {string} demoText
   * @returns {{
   *   rows: Object[],
   *   skipped: { count: number, samples: { line: number, reason: string }[] },
   *   schemaOk: boolean,
   *   schemaMessage: string
   * }}
   */
  function parseDemoCsv(demoText) {
    var split = splitCsvText(demoText);
    var headerCheck = validateHeaders(split.headers);
    if (!headerCheck.ok) {
      return {
        rows: [],
        skipped: { count: 0, samples: [] },
        schemaOk: false,
        schemaMessage: headerCheck.message,
      };
    }
    var rows = [];
    var skipped = 0;
    var samples = [];
    split.lines.forEach(function (line, index) {
      var lineNumber = index + 2;
      try {
        var cells = parseCsvLine(line);
        rows.push(rowFromCells(cells, lineNumber));
      } catch (e) {
        skipped++;
        if (samples.length < 8) {
          samples.push({ line: lineNumber, reason: e.message || String(e) });
        }
      }
    });
    return {
      rows: rows,
      skipped: { count: skipped, samples: samples },
      schemaOk: true,
      schemaMessage: "",
    };
  }

  /**
   * 필터 조건
   * @typedef {Object} DatasetFilters
   * @property {string} dateKey - "all" 또는 YYYY-MM-DD
   * @property {string} scenario - "all" 또는 scenario 키
   * @property {string} anomaly - "all" | "1" | "0"
   */

  /**
   * 행 배열에 필터를 적용합니다.
   * @param {Object[]} rows
   * @param {DatasetFilters} filters
   * @returns {Object[]}
   */
  function filterRows(rows, filters) {
    if (!rows || !rows.length) {
      return [];
    }
    return rows.filter(function (row) {
      if (filters.dateKey && filters.dateKey !== "all" && row.dateKey !== filters.dateKey) {
        return false;
      }
      if (filters.scenario && filters.scenario !== "all" && row.scenario !== filters.scenario) {
        return false;
      }
      if (filters.anomaly === "1" && row.anomalyLabel !== 1) {
        return false;
      }
      if (filters.anomaly === "0" && row.anomalyLabel !== 0) {
        return false;
      }
      return true;
    });
  }

  /**
   * 집계·요약 통계를 계산합니다.
   * @param {Object[]} allRows - 전체 로드된 행
   * @param {Object[]} filteredRows - 필터 적용 후 행
   * @returns {Object}
   */
  function buildSummary(allRows, filteredRows) {
    var scenarioCounts = {};
    var anomalyInFilter = 0;
    var eventCounts = {
      motionOn: 0,
      doorOpen: 0,
      gasAlert: 0,
      medicationDue: 0,
      medicationMissed: 0,
      responseNotConfirmed: 0,
    };
    filteredRows.forEach(function (row) {
      scenarioCounts[row.scenario] = (scenarioCounts[row.scenario] || 0) + 1;
      if (row.anomalyLabel === 1) {
        anomalyInFilter++;
      }
      if (row.motion === 1) {
        eventCounts.motionOn++;
      }
      if (row.doorOpen === 1) {
        eventCounts.doorOpen++;
      }
      if (row.gasAlert === 1) {
        eventCounts.gasAlert++;
      }
      if (row.medicationDue === 1) {
        eventCounts.medicationDue++;
      }
      if (row.medicationDue === 1 && row.medicationTaken === 0) {
        eventCounts.medicationMissed++;
      }
      if (row.responseConfirmed === 0) {
        eventCounts.responseNotConfirmed++;
      }
    });

    var dates = [];
    var elderIds = {};
    allRows.forEach(function (row) {
      if (dates.indexOf(row.dateKey) < 0) {
        dates.push(row.dateKey);
      }
      elderIds[row.elderId] = true;
    });
    dates.sort();

    return {
      totalLoaded: allRows.length,
      filteredCount: filteredRows.length,
      dateRange:
        dates.length ? { min: dates[0], max: dates[dates.length - 1], dates: dates } : null,
      elderIds: Object.keys(elderIds),
      scenarioCounts: scenarioCounts,
      anomalyInFilter: anomalyInFilter,
      eventCounts: eventCounts,
    };
  }

  /**
   * 시나리오 키의 한글 표시명
   * @param {string} key
   * @param {Object.<string, { meaning: string }>} scenarioMap
   * @returns {string}
   */
  function scenarioLabel(key, scenarioMap) {
    if (scenarioMap && scenarioMap[key] && scenarioMap[key].meaning) {
      return scenarioMap[key].meaning + " (" + key + ")";
    }
    return key;
  }

  /**
   * HTTP(S)에서 페이지 상대 경로로 CSV 묶음을 fetch합니다. file://는 거부합니다.
   * @param {Object} [_common] - 하위 호환용(미사용). 경로는 document.baseURI 기준 상대 URL 사용
   * @returns {Promise<{
   *   rows: Object[],
   *   scenarioMap: Object,
   *   skipped: Object,
   *   loadSource: string
   * }>}
   */
  function fetchDefaultBundle(_common) {
    if (global.location.protocol === "file:") {
      return Promise.reject(
        new Error(
          "로컬 파일(file://)에서는 브라우저 보안상 자동 로드할 수 없습니다. 아래에서 CSV를 선택해 주세요."
        )
      );
    }
    var demoUrl = resolvePageRelativeUrl(DEMO_CSV_REL);
    var scenUrl = resolvePageRelativeUrl(SCENARIOS_CSV_REL);
    return fetch(demoUrl, { credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) {
          throw new Error("시연 CSV 로드 실패 (" + res.status + ")");
        }
        return res.text();
      })
      .then(function (demoText) {
        return fetch(scenUrl, { credentials: "same-origin" }).then(function (res2) {
          if (!res2.ok) {
            throw new Error("시나리오 CSV 로드 실패 (" + res2.status + ")");
          }
          return res2.text();
        }).then(function (scenText) {
          return combineParsed(demoText, scenText, "fetch");
        });
      });
  }

  /**
   * 두 CSV 텍스트를 파싱해 결과 객체를 만듭니다.
   * @param {string} demoText
   * @param {string} scenText
   * @param {string} loadSource
   * @returns {{
   *   rows: Object[],
   *   scenarioMap: Object,
   *   skipped: Object,
   *   schemaOk: boolean,
   *   schemaMessage: string,
   *   loadSource: string
   * }}
   */
  function combineParsed(demoText, scenText, loadSource) {
    var parsed = parseDemoCsv(demoText);
    var scenarioMap = parseScenariosCsv(scenText || "");
    return {
      rows: parsed.rows,
      scenarioMap: scenarioMap,
      skipped: parsed.skipped,
      schemaOk: parsed.schemaOk,
      schemaMessage: parsed.schemaMessage,
      loadSource: loadSource,
    };
  }

  /**
   * 파일 객체에서 텍스트를 읽습니다.
   * @param {File} file
   * @returns {Promise<string>}
   */
  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function () {
        reject(reader.error || new Error("파일 읽기 실패"));
      };
      reader.readAsText(file, "UTF-8");
    });
  }

  global.Harugyeol = global.Harugyeol || {};
  global.Harugyeol.Dataset = {
    REQUIRED_COLUMNS: REQUIRED_COLUMNS,
    DEMO_CSV_REL: DEMO_CSV_REL,
    SCENARIOS_CSV_REL: SCENARIOS_CSV_REL,
    stripBom: stripBom,
    parseCsvLine: parseCsvLine,
    validateHeaders: validateHeaders,
    parseDemoCsv: parseDemoCsv,
    parseScenariosCsv: parseScenariosCsv,
    filterRows: filterRows,
    buildSummary: buildSummary,
    scenarioLabel: scenarioLabel,
    resolvePageRelativeUrl: resolvePageRelativeUrl,
    fetchDefaultBundle: fetchDefaultBundle,
    combineParsed: combineParsed,
    readFileAsText: readFileAsText,
  };
})(window);
