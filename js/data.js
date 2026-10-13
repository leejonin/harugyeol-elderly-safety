/**
 * 하루결 시연용 예시 데이터 및 localStorage 저장
 * @namespace Harugyeol.Data
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "harugyeol_store_v1";

  /**
   * 시드 데이터 생성
   * @returns {Object}
   */
  function createSeedData() {
    var now = new Date();
    var today = now.toISOString().slice(0, 10);

    function hoursAgo(h) {
      var d = new Date(now.getTime() - h * 60 * 60 * 1000);
      return d.toISOString();
    }

    return {
      users: [
        {
          id: "user_guardian",
          loginKey: "guardian",
          name: "김보호",
          role: "가족·보호자",
          elderIds: ["elder_kim", "elder_park"],
        },
        {
          id: "user_facility",
          loginKey: "facility",
          name: "이담당",
          role: "관리기관 담당자",
          elderIds: ["elder_kim", "elder_lee", "elder_choi"],
        },
      ],
      elders: [
        {
          id: "elder_kim",
          name: "김영순",
          birthYear: 1942,
          address: "서울 ○○구 ○○동",
          summaryStatus: "check_needed",
          lastCheckAt: hoursAgo(2),
          lastDataAt: hoursAgo(0.5),
          needsAttention: true,
        },
        {
          id: "elder_park",
          name: "박철수",
          birthYear: 1938,
          address: "경기 ○○시",
          summaryStatus: "no_anomaly_observed",
          lastCheckAt: hoursAgo(24),
          lastDataAt: hoursAgo(1),
          needsAttention: false,
        },
        {
          id: "elder_lee",
          name: "이순자",
          birthYear: 1945,
          address: "요양시설 A동 203호",
          summaryStatus: "insufficient_data",
          lastCheckAt: null,
          lastDataAt: hoursAgo(3),
          needsAttention: false,
        },
        {
          id: "elder_choi",
          name: "최만복",
          birthYear: 1940,
          address: "요양시설 A동 105호",
          summaryStatus: "data_not_received",
          lastCheckAt: hoursAgo(48),
          lastDataAt: null,
          needsAttention: true,
        },
      ],
      guardians: [
        {
          id: "g1",
          elderId: "elder_kim",
          name: "김민수",
          relation: "아들",
          phone: "010-0000-1111",
        },
        {
          id: "g2",
          elderId: "elder_park",
          name: "박지영",
          relation: "딸",
          phone: "010-0000-2222",
        },
      ],
      agencies: [
        {
          id: "a1",
          elderId: "elder_kim",
          name: "○○복지센터",
          contact: "02-000-0000",
        },
        {
          id: "a2",
          elderId: "elder_lee",
          name: "요양시설 A",
          contact: "031-000-0000",
        },
        {
          id: "a3",
          elderId: "elder_choi",
          name: "요양시설 A",
          contact: "031-000-0000",
        },
      ],
      devices: [
        {
          id: "d_kim_plug",
          elderId: "elder_kim",
          type: "smart_plug",
          label: "주방 전기포트",
          location: "주방",
          connection: "connected",
          lastReceivedAt: hoursAgo(0.5),
        },
        {
          id: "d_kim_door",
          elderId: "elder_kim",
          type: "door",
          label: "현관문",
          location: "현관",
          connection: "connected",
          lastReceivedAt: hoursAgo(5),
        },
        {
          id: "d_kim_motion",
          elderId: "elder_kim",
          type: "motion",
          label: "거실 움직임",
          location: "거실",
          connection: "connected",
          lastReceivedAt: hoursAgo(0.5),
        },
        {
          id: "d_kim_speaker",
          elderId: "elder_kim",
          type: "speaker",
          label: "거실 스피커",
          location: "거실",
          connection: "connected",
          lastReceivedAt: hoursAgo(2),
        },
        {
          id: "d_park_motion",
          elderId: "elder_park",
          type: "motion",
          label: "거실",
          location: "거실",
          connection: "connected",
          lastReceivedAt: hoursAgo(1),
        },
        {
          id: "d_choi_motion",
          elderId: "elder_choi",
          type: "motion",
          label: "침실",
          location: "침실",
          connection: "disconnected",
          lastReceivedAt: null,
        },
      ],
      signals: [
        {
          id: "s1",
          elderId: "elder_kim",
          at: today + "T07:30:00.000Z",
          kind: "plug",
          summary: "전기포트 사용 없음 (평소 이 시간대 사용)",
        },
        {
          id: "s2",
          elderId: "elder_kim",
          at: today + "T08:00:00.000Z",
          kind: "motion",
          summary: "거실 움직임 미감지",
        },
        {
          id: "s3",
          elderId: "elder_kim",
          at: today + "T06:15:00.000Z",
          kind: "door",
          summary: "문 열림",
        },
        {
          id: "s4",
          elderId: "elder_park",
          at: hoursAgo(2),
          kind: "motion",
          summary: "거실 움직임 감지",
        },
        {
          id: "s5",
          elderId: "elder_park",
          at: hoursAgo(3),
          kind: "plug",
          summary: "TV 전원 사용",
        },
      ],
      baselines: [
        {
          elderId: "elder_kim",
          analysisReady: "ready",
          note: "개인별 평소 패턴 비교 가능",
          usualWindows: [
            { kind: "plug", startHour: 7, endHour: 8, label: "아침 전기포트" },
            { kind: "motion", startHour: 7, endHour: 10, label: "오전 실내 활동" },
          ],
        },
        {
          elderId: "elder_park",
          analysisReady: "ready",
          note: "개인별 평소 패턴 비교 가능",
          usualWindows: [
            { kind: "motion", startHour: 9, endHour: 12, label: "오전 거실 활동" },
          ],
        },
        {
          elderId: "elder_lee",
          analysisReady: "insufficient",
          note: "학습 기간 데이터 부족 — 비교 기준 생성 중",
          usualWindows: [],
        },
        {
          elderId: "elder_choi",
          analysisReady: "ready",
          note: "패턴 학습 완료 (센서 미수신은 별도 표시)",
          usualWindows: [
            { kind: "motion", startHour: 8, endHour: 20, label: "주간 활동" },
          ],
        },
      ],
      alerts: [
        {
          id: "alert_kim_1",
          elderId: "elder_kim",
          createdAt: hoursAgo(1.5),
          title: "복합 생활 변화 — 안부 확인 필요",
          read: false,
          status: "voice_pending",
          reasons: [
            "평소 아침 전기포트 사용 기록 없음",
            "오전 실내 움직임 미감지",
          ],
          voice: {
            questionAt: hoursAgo(1.2),
            questionSent: true,
            response: "no_response",
            responseAt: null,
          },
          guardianRequest: {
            state: "requested",
            requestedAt: hoursAgo(0.8),
          },
          agencyRequest: null,
          steps: [
            {
              at: hoursAgo(1.5),
              label: "이상 변화 감지",
              detail: "가전 사용·움직임 변화 복합 판단",
            },
            {
              at: hoursAgo(1.2),
              label: "스피커 안부 질문",
              detail: "질문 실행 (시연: 미연동)",
            },
            {
              at: hoursAgo(1),
              label: "무응답",
              detail: "정해진 확인 절차에서 응답 없음",
            },
            {
              at: hoursAgo(0.8),
              label: "가족 확인 요청",
              detail: "요청함 — 보호자 확인 대기",
            },
          ],
          guardianNote: "",
          resolution: null,
        },
        {
          id: "alert_park_old",
          elderId: "elder_park",
          createdAt: hoursAgo(72),
          title: "이전 알림 (조치 완료)",
          read: true,
          status: "no_anomaly_observed",
          reasons: ["일시적 센서 오류로 확인 요청 발생"],
          voice: {
            questionAt: hoursAgo(71),
            questionSent: true,
            response: "ok",
            responseAt: hoursAgo(70.5),
          },
          guardianRequest: {
            state: "acknowledged",
            requestedAt: hoursAgo(70),
          },
          agencyRequest: null,
          steps: [
            {
              at: hoursAgo(72),
              label: "확인 요청",
              detail: "센서 일시 오류",
            },
            {
              at: hoursAgo(70.5),
              label: "본인 응답 확인",
              detail: "정상 응답",
            },
          ],
          guardianNote: "전화로 안부 확인 완료",
          resolution: {
            by: "박지영",
            result: "특이 없음",
            at: hoursAgo(70),
          },
        },
      ],
    };
  }

  /**
   * 저장소를 로드합니다. localStorage에 있으면 병합합니다.
   * @returns {Object}
   */
  function getStore() {
    var seed = createSeedData();
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return seed;
      }
      var saved = JSON.parse(raw);
      return deepMergeStore(seed, saved);
    } catch (e) {
      return seed;
    }
  }

  /**
   * 시드 구조를 유지하며 저장된 사용자 입력을 반영합니다.
   * @param {Object} seed
   * @param {Object} saved
   * @returns {Object}
   */
  function deepMergeStore(seed, saved) {
    var out = JSON.parse(JSON.stringify(seed));
    if (saved.elders) {
      out.elders = mergeById(out.elders, saved.elders);
    }
    if (saved.guardians) {
      out.guardians = mergeById(out.guardians, saved.guardians);
    }
    if (saved.agencies) {
      out.agencies = mergeById(out.agencies, saved.agencies);
    }
    if (saved.devices) {
      out.devices = mergeById(out.devices, saved.devices);
    }
    if (saved.alerts) {
      out.alerts = mergeById(out.alerts, saved.alerts);
    }
    return out;
  }

  /**
   * @param {Object[]} base
   * @param {Object[]} patch
   * @returns {Object[]}
   */
  function mergeById(base, patch) {
    var map = {};
    base.forEach(function (item) {
      map[item.id] = item;
    });
    patch.forEach(function (item) {
      if (map[item.id]) {
        Object.assign(map[item.id], item);
      } else {
        map[item.id] = item;
        base.push(item);
      }
    });
    return base.map(function (item) {
      return map[item.id];
    });
  }

  /**
   * 현재 저장소를 localStorage에 저장합니다.
   * @param {Object} store
   */
  function saveStore(store) {
    var payload = {
      elders: store.elders,
      guardians: store.guardians,
      agencies: store.agencies,
      devices: store.devices,
      alerts: store.alerts,
    };
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  /**
   * 사용자 입력 저장을 초기화하고 시드로 돌아갑니다.
   */
  function resetDemoData() {
    global.localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * 로그인 키로 사용자 찾기
   * @param {Object} store
   * @param {string} loginKey
   * @returns {Object|undefined}
   */
  function findUserByLoginKey(store, loginKey) {
    return store.users.find(function (u) {
      return u.loginKey === loginKey;
    });
  }

  global.Harugyeol = global.Harugyeol || {};
  global.Harugyeol.Data = {
    getStore: getStore,
    saveStore: saveStore,
    resetDemoData: resetDemoData,
    findUserByLoginKey: findUserByLoginKey,
    createSeedData: createSeedData,
  };
})(window);
