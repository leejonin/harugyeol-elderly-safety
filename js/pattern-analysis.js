/**
 * CSV 기반 규칙 생활패턴 분석 (시연용, 클라우드 ML 아님)
 * @namespace Harugyeol.PatternAnalysis
 */
(function (global) {
  "use strict";

  var DEFAULT_LEARN_START = "2026-10-01";
  var DEFAULT_LEARN_END = "2026-10-07";
  var DEFAULT_ACTIVE_START_HOUR = 8;
  var DEFAULT_ACTIVE_END_HOUR = 20;
  var MIN_LEARN_ROWS = 500;
  var MOTION_ACTIVE_RATIO = 0.12;
  var POWER_ACTIVE_W = 8;
  var USUAL_WINDOW_MIN_HOURS = 2;
  var POWER_DROP_RATIO = 0.5;
  var MOTION_RATIO_DROP = 0.35;
  var DOOR_COUNT_DROP_RATIO = 0.5;
  var LONG_INACTIVITY_SLOTS = 6;

  var analysisCache = {};

  /**
   * 행 시각에서 시(0~23)를 추출합니다.
   * @param {Object} row
   * @returns {number}
   */
  function hourOfRow(row) {
    return parseInt(row.timestamp.slice(11, 13), 10);
  }

  /**
   * 날짜·시간대로 행을 필터합니다.
   * @param {Object[]} rows
   * @param {string} dateKey
   * @param {number} startHour
   * @param {number} endHour
   * @returns {Object[]}
   */
  function rowsForDayHours(rows, dateKey, startHour, endHour) {
    return rows.filter(function (row) {
      if (row.dateKey !== dateKey) {
        return false;
      }
      var h = hourOfRow(row);
      return h >= startHour && h < endHour;
    });
  }

  /**
   * 학습 구간 행을 필터합니다.
   * @param {Object[]} rows
   * @param {string} learnStart
   * @param {string} learnEnd
   * @returns {Object[]}
   */
  function filterLearnRows(rows, learnStart, learnEnd) {
    return rows.filter(function (row) {
      return row.dateKey >= learnStart && row.dateKey <= learnEnd;
    });
  }

  /**
   * 시간대별 프로필을 집계합니다.
   * @param {Object[]} rows
   * @returns {Object[]}
   */
  function buildHourlyProfile(rows) {
    var buckets = [];
    var i;
    for (i = 0; i < 24; i++) {
      buckets.push({
        hour: i,
        count: 0,
        motionOn: 0,
        powerSum: 0,
        doorOpen: 0,
      });
    }
    rows.forEach(function (row) {
      var h = hourOfRow(row);
      var b = buckets[h];
      b.count++;
      if (row.motion === 1) {
        b.motionOn++;
      }
      b.powerSum += row.powerW;
      if (row.doorOpen === 1) {
        b.doorOpen++;
      }
    });
    return buckets.map(function (b) {
      var c = b.count || 1;
      return {
        hour: b.hour,
        count: b.count,
        motionRatio: b.motionOn / c,
        avgPowerW: b.powerSum / c,
        doorOpenCount: b.doorOpen,
      };
    });
  }

  /**
   * 활동이 많은 연속 시간대를 usualWindows로 만듭니다.
   * @param {Object[]} hourlyProfile
   * @param {number} startHour
   * @param {number} endHour
   * @returns {Object[]}
   */
  function deriveUsualWindows(hourlyProfile, startHour, endHour) {
    var active = [];
    var h;
    for (h = startHour; h < endHour; h++) {
      var p = hourlyProfile[h];
      if (!p || p.count === 0) {
        active.push(false);
        continue;
      }
      active.push(
        p.motionRatio >= MOTION_ACTIVE_RATIO || p.avgPowerW >= POWER_ACTIVE_W
      );
    }
    var windows = [];
    var segStart = null;
    for (h = startHour; h < endHour; h++) {
      var idx = h - startHour;
      if (active[idx]) {
        if (segStart === null) {
          segStart = h;
        }
      } else if (segStart !== null) {
        if (h - segStart >= USUAL_WINDOW_MIN_HOURS) {
          windows.push({ startHour: segStart, endHour: h });
        }
        segStart = null;
      }
    }
    if (segStart !== null && endHour - segStart >= USUAL_WINDOW_MIN_HOURS) {
      windows.push({ startHour: segStart, endHour: endHour });
    }
    if (windows.length === 0) {
      windows.push({ startHour: startHour, endHour: endHour });
    }
    return windows;
  }

  /**
   * 평소 생활 리듬 기준을 학습합니다 (4.1.1).
   * @param {Object[]} rows
   * @param {Object} [options]
   * @returns {Object}
   */
  function learnBaseline(rows, options) {
    options = options || {};
    var learnStart = options.learnStart || DEFAULT_LEARN_START;
    var learnEnd = options.learnEnd || DEFAULT_LEARN_END;
    var activeStart = options.activeStartHour != null ? options.activeStartHour : DEFAULT_ACTIVE_START_HOUR;
    var activeEnd = options.activeEndHour != null ? options.activeEndHour : DEFAULT_ACTIVE_END_HOUR;

    var learnRows = filterLearnRows(rows, learnStart, learnEnd);
    var hourlyProfile = buildHourlyProfile(learnRows);
    var usualWindows = deriveUsualWindows(hourlyProfile, activeStart, activeEnd);
    var analysisReady = learnRows.length < MIN_LEARN_ROWS ? "insufficient" : "ready";

    return {
      learnStart: learnStart,
      learnEnd: learnEnd,
      learnRowCount: learnRows.length,
      analysisReady: analysisReady,
      hourlyProfile: hourlyProfile,
      usualWindows: usualWindows,
      activeStartHour: activeStart,
      activeEndHour: activeEnd,
    };
  }

  /**
   * 비교 상태를 산출합니다.
   * @param {string} level
   * @param {string} message
   * @param {Object} metric
   * @returns {Object}
   */
  function compareResult(level, message, metric) {
    return { status: level, message: message, metric: metric };
  }

  /**
   * 활동 시간대 평균 전력·움직임·문 열림을 비교합니다 (4.2.1~4.2.3).
   * @param {Object[]} rows
   * @param {string} dateKey
   * @param {Object} baseline
   * @returns {Object}
   */
  function analyzeDay(rows, dateKey, baseline) {
    var activeStart = baseline.activeStartHour;
    var activeEnd = baseline.activeEndHour;
    var dayRows = rowsForDayHours(rows, dateKey, activeStart, activeEnd);
    var profile = baseline.hourlyProfile;

    var powerSum = 0;
    var motionOn = 0;
    var doorOpen = 0;
    var baselinePowerSum = 0;
    var baselineMotionSum = 0;
    var baselineDoorSum = 0;
    var baselineSlots = 0;
    var h;

    dayRows.forEach(function (row) {
      powerSum += row.powerW;
      if (row.motion === 1) {
        motionOn++;
      }
      if (row.doorOpen === 1) {
        doorOpen++;
      }
    });

    for (h = activeStart; h < activeEnd; h++) {
      var p = profile[h];
      if (p && p.count > 0) {
        baselinePowerSum += p.avgPowerW;
        baselineMotionSum += p.motionRatio;
        baselineDoorSum += p.doorOpenCount / Math.max(p.count / 6, 1);
        baselineSlots++;
      }
    }

    var dayCount = dayRows.length || 1;
    var dayAvgPower = powerSum / dayCount;
    var dayMotionRatio = motionOn / dayCount;
    var baselineAvgPower = baselineSlots ? baselinePowerSum / baselineSlots : dayAvgPower;
    var baselineMotionRatio = baselineSlots ? baselineMotionSum / baselineSlots : dayMotionRatio;
    var baselineDoorPerDay = baselineSlots ? baselineDoorSum / baselineSlots : doorOpen;

    var powerStatus = "ok";
    var powerMsg = "활동 시간대 전력 사용이 학습 기준과 비슷합니다.";
    if (baselineAvgPower > 0 && dayAvgPower < baselineAvgPower * POWER_DROP_RATIO) {
      powerStatus = "watch";
      powerMsg =
        "활동 시간대 평균 전력(" +
        dayAvgPower.toFixed(1) +
        "W)이 학습 기준(" +
        baselineAvgPower.toFixed(1) +
        "W)보다 낮습니다.";
    }

    var maxInactive = 0;
    var curInactive = 0;
    dayRows.forEach(function (row) {
      if (row.motion === 0) {
        curInactive++;
        if (curInactive > maxInactive) {
          maxInactive = curInactive;
        }
      } else {
        curInactive = 0;
      }
    });

    var motionStatus = "ok";
    var motionMsg = "활동 시간대 움직임 비율이 학습 기준과 비슷합니다.";
    if (maxInactive >= LONG_INACTIVITY_SLOTS) {
      motionStatus = "alert";
      motionMsg =
        "활동 시간대에 약 " +
        maxInactive * 10 +
        "분 연속 움직임이 감지되지 않았습니다.";
    } else if (dayMotionRatio < baselineMotionRatio * MOTION_RATIO_DROP) {
      motionStatus = "watch";
      motionMsg =
        "활동 시간대 움직임 비율이 학습 기준보다 낮습니다.";
    }

    var doorStatus = "ok";
    var doorMsg = "문 열림 횟수가 학습 기준과 비슷합니다.";
    if (baselineDoorPerDay > 0.5 && doorOpen < baselineDoorPerDay * DOOR_COUNT_DROP_RATIO) {
      doorStatus = "watch";
      doorMsg = "문 열림 횟수가 학습 기준보다 적습니다.";
    }

    return {
      dateKey: dateKey,
      rowCount: dayRows.length,
      plug: compareResult(powerStatus, powerMsg, {
        dayAvgPowerW: dayAvgPower,
        baselineAvgPowerW: baselineAvgPower,
      }),
      motion: compareResult(motionStatus, motionMsg, {
        dayMotionRatio: dayMotionRatio,
        baselineMotionRatio: baselineMotionRatio,
        maxInactiveSlots: maxInactive,
      }),
      door: compareResult(doorStatus, doorMsg, {
        dayDoorOpen: doorOpen,
        baselineDoorPerDay: baselineDoorPerDay,
      }),
    };
  }

  /**
   * 복합 신호 판단 (4.2.4).
   * @param {Object} dayResult
   * @returns {Object}
   */
  function compositeJudge(dayResult) {
    var reasons = [];
    var level = "no_anomaly_observed";
    var plug = dayResult.plug;
    var motion = dayResult.motion;
    var door = dayResult.door;

    if (motion.status === "alert") {
      reasons.push(motion.message);
    }
    if (plug.status === "watch" || plug.status === "alert") {
      reasons.push(plug.message);
    }
    if (door.status === "watch" || door.status === "alert") {
      reasons.push(door.message);
    }
    if (motion.status === "watch" && motion.status !== "alert") {
      reasons.push(motion.message);
    }

    if (motion.status === "alert") {
      level = "check_needed";
    } else if (
      (plug.status === "watch" && motion.status === "watch") ||
      reasons.length >= 2
    ) {
      level = "check_needed";
    } else if (reasons.length === 1) {
      level = "voice_pending";
    }

    return {
      summaryStatus: level,
      reasons: reasons,
      note: "규칙 기반 시연 판단이며 의료·응급 확정이 아닙니다.",
    };
  }

  /**
   * 해당 날짜 CSV 시나리오·합성 라벨 요약 (검증 참고용).
   * @param {Object[]} rows
   * @param {string} dateKey
   * @returns {Object}
   */
  function datasetDayMeta(rows, dateKey) {
    var scenarios = {};
    var anomalyCount = 0;
    rows
      .filter(function (r) {
        return r.dateKey === dateKey;
      })
      .forEach(function (r) {
        scenarios[r.scenario] = (scenarios[r.scenario] || 0) + 1;
        if (r.anomalyLabel === 1) {
          anomalyCount++;
        }
      });
    var primary = "normal";
    Object.keys(scenarios).forEach(function (key) {
      if (key !== "normal" && scenarios[key] > 0) {
        primary = key;
      }
    });
    return {
      scenarios: scenarios,
      primaryScenario: primary,
      anomalyLabelCount: anomalyCount,
    };
  }

  /**
   * 전체 분석을 실행합니다.
   * @param {Object[]} rows
   * @param {Object} [options]
   * @returns {Object}
   */
  function runFullAnalysis(rows, options) {
    options = options || {};
    var learnEnd = options.learnEnd || DEFAULT_LEARN_END;
    var analyzeDate =
      options.analyzeDate ||
      (rows.length ? rows[rows.length - 1].dateKey : DEFAULT_LEARN_END);
    var cacheKey = learnEnd + "|" + analyzeDate + "|" + rows.length;
    if (analysisCache[cacheKey] && !options.noCache) {
      return analysisCache[cacheKey];
    }

    var baseline = learnBaseline(rows, options);
    var dayResult = analyzeDay(rows, analyzeDate, baseline);
    var composite = compositeJudge(dayResult);
    var datasetMeta = datasetDayMeta(rows, analyzeDate);

    var result = {
      baseline: baseline,
      dayResult: dayResult,
      composite: composite,
      datasetMeta: datasetMeta,
      meta: {
        analyzeDate: analyzeDate,
        elderId: rows[0] ? rows[0].elderId : "E001",
        engine: "rules_csv_demo",
      },
    };
    analysisCache[cacheKey] = result;
    return result;
  }

  /**
   * 분석 캐시를 비웁니다.
   */
  function clearCache() {
    analysisCache = {};
  }

  global.Harugyeol = global.Harugyeol || {};
  global.Harugyeol.PatternAnalysis = {
    DEFAULT_LEARN_START: DEFAULT_LEARN_START,
    DEFAULT_LEARN_END: DEFAULT_LEARN_END,
    learnBaseline: learnBaseline,
    analyzeDay: analyzeDay,
    compositeJudge: compositeJudge,
    datasetDayMeta: datasetDayMeta,
    runFullAnalysis: runFullAnalysis,
    clearCache: clearCache,
  };
})(window);
