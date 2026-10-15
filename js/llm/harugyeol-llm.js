/**
 * 하루결 LLM (file://·Netlify 공통, ES module 없음)
 * @namespace Harugyeol.LLM
 */
(function (global) {
  "use strict";

  var DEFAULT_MODEL = "gpt-4o-mini";
  var DEFAULT_BASE_URL = "https://api.openai.com/v1";
  var LLM_CONFIG_STORAGE_KEY = "harugyeol_llm_config";

  var HARUGYEOL_ASSISTANT_SYSTEM =
    "당신은 노인 안전관리 서비스 ‘하루결’의 AI 대화 도우미입니다. 어르신과 편안하게 대화하고, 안부를 확인하며, 요청받으면 대화에서 확인된 상태를 요약합니다.\n\n" +
    "[대화 규칙]\n" +
    "1. 쉬운 한국어와 따뜻한 존댓말을 사용합니다. 어린아이를 대하듯 말하지 않습니다.\n" +
    "2. 답변은 보통 1~3문장으로 짧게 합니다. 질문은 한 번에 하나만 합니다.\n" +
    "3. 사용자의 말에 먼저 답하고, 필요한 경우에만 안부를 묻습니다. 모든 대화를 건강 질문으로 바꾸지 않습니다.\n" +
    "4. 식사, 수면, 기분, 몸의 불편함 등을 자연스럽게 확인합니다. 이미 답한 질문은 반복하지 않습니다.\n" +
    "5. 앞선 대화를 참고합니다. 사용자가 내용을 정정하면 가장 최근 발언을 반영합니다.\n" +
    "6. 뜻이 모호하면 짐작하지 말고 짧게 되묻습니다.\n" +
    "7. 대화나 제공된 데이터에 없는 사실은 만들지 않습니다. 모르는 것은 “아직 말씀해 주시지 않아 모르겠어요.”라고 답합니다.\n" +
    "8. 사용자의 말과 센서 정보는 구분합니다. 움직임이 없다는 정보만으로 수면이나 사고를 단정하지 않습니다.\n" +
    "9. 내부 분석, 추론 과정, 규칙 설명은 출력하지 않습니다. 사용자에게 필요한 답변만 출력합니다.\n\n" +
    "[안부와 도움]\n" +
    "- 불편함을 말하면 공감하고, 무엇이 불편한지 하나씩 확인합니다.\n" +
    "- 병명을 진단하거나 약의 복용량·중단·변경을 지시하지 않습니다.\n" +
    "- 숨을 쉬기 어렵거나, 심한 가슴 통증이 있거나, 넘어져 일어나지 못한다고 하면 일상 대화보다 도움 요청 안내를 우선합니다.\n" +
    "- 실제 실행 결과가 제공되지 않았다면 보호자에게 연락했다거나 신고를 완료했다고 말하지 않습니다.\n" +
    "- 응답이 없다는 사실만으로 안전하거나 위험하다고 확정하지 않습니다.\n\n" +
    "[상태 요약]\n" +
    "사용자가 상태 요약을 명시적으로 요청한 경우에만 아래 형식으로 답합니다.\n\n" +
    "- 식사: 사용자가 말한 내용 또는 확인되지 않음\n" +
    "- 수면: 사용자가 말한 내용 또는 확인되지 않음\n" +
    "- 기분: 사용자가 말한 내용 또는 확인되지 않음\n" +
    "- 몸 상태: 사용자가 말한 내용 또는 확인되지 않음\n" +
    "- 추가 확인: 더 확인할 내용 또는 현재 대화에서 추가 확인 요청 없음\n\n" +
    "요약에는 확인된 사실만 씁니다. 불편함을 말하지 않았다는 이유로 “건강함”, “정상”, “안전함”이라고 평가하지 않습니다.\n\n" +
    "[CSV 시연 일별 보고서]\n" +
    "사용자가 특정 날짜의 CSV 시연 보고서·리포트·제출을 요청하면, 채팅 화면에서 합성 데이터 기반 일별 보고서가 자동 생성·미리보기·다운로드됩니다. " +
    "직접 제출할 수 없다고만 답하지 말고, 생성된 보고서를 확인·다운로드하라고 안내합니다. " +
    "의료·공식 제출 문서가 아니며 E001 합성 시연임을 분명히 합니다.";

  /**
   * @param {Object} [context]
   * @returns {string}
   */
  function buildSystemPrompt(context) {
    var parts = [HARUGYEOL_ASSISTANT_SYSTEM];
    if (context && context.elderName) {
      parts.push(
        "\n[참고] 대화 상대를 부를 때는 " +
          context.elderName +
          " 어르신이라고 자연스럽게 호칭할 수 있습니다."
      );
    }
    if (context && context.sensorHints) {
      parts.push(
        "\n[센서 참고 — 대화에서 단정하지 말 것]\n" + context.sensorHints
      );
    }
    if (context && context.csvDemoHints) {
      parts.push(
        "\n[CSV 시연·규칙 분석 참고 — 단정·의료 판단 금지]\n" + context.csvDemoHints
      );
    }
    if (context && context.mode === "summary_request") {
      parts.push(
        "\n이번 사용자 메시지는 상태 요약 요청입니다. [상태 요약] 형식만 사용하세요."
      );
    }
    return parts.join("\n");
  }

  /**
   * @returns {{ apiKey: string, model: string, baseUrl: string, forceMock: boolean }}
   */
  function getConfig() {
    try {
      var raw = global.localStorage.getItem(LLM_CONFIG_STORAGE_KEY);
      if (!raw) {
        return {
          apiKey: "",
          model: DEFAULT_MODEL,
          baseUrl: DEFAULT_BASE_URL,
          forceMock: false,
        };
      }
      var c = JSON.parse(raw);
      return {
        apiKey: c.apiKey || "",
        model: c.model || DEFAULT_MODEL,
        baseUrl: c.baseUrl || DEFAULT_BASE_URL,
        forceMock: !!c.forceMock,
      };
    } catch (e) {
      return {
        apiKey: "",
        model: DEFAULT_MODEL,
        baseUrl: DEFAULT_BASE_URL,
        forceMock: false,
      };
    }
  }

  /**
   * @param {Object} partial
   */
  function saveConfig(partial) {
    var current = getConfig();
    var next = {
      apiKey: partial.apiKey !== undefined ? partial.apiKey : current.apiKey,
      model: partial.model !== undefined ? partial.model : current.model,
      baseUrl: partial.baseUrl !== undefined ? partial.baseUrl : current.baseUrl,
      forceMock:
        partial.forceMock !== undefined ? partial.forceMock : current.forceMock,
    };
    global.localStorage.setItem(LLM_CONFIG_STORAGE_KEY, JSON.stringify(next));
  }

  function clearApiKey() {
    saveConfig({ apiKey: "" });
  }

  /**
   * @param {string} apiKey
   * @returns {string}
   */
  function maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 8) {
      return "";
    }
    return "sk-…" + apiKey.slice(-4);
  }

  /**
   * @returns {{ mode: string, label: string }}
   */
  function getStatus() {
    var c = getConfig();
    if (c.forceMock) {
      return { mode: "mock", label: "목 모드" };
    }
    if (c.apiKey) {
      return { mode: "openai", label: "GPT 연결됨" };
    }
    return { mode: "no_key", label: "키 미입력(목 응답)" };
  }

  /**
   * @param {Array} messages
   * @param {Object} [context]
   * @returns {Promise<{content: string, isMock: boolean}>}
   */
  function mockChat(messages, context) {
    var lastUser = "";
    for (var i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUser = messages[i].content || "";
        break;
      }
    }
    var text = lastUser.trim();
    if (
      text.indexOf("상태 요약") >= 0 ||
      text.indexOf("요약") >= 0 ||
      (context && context.mode === "summary_request")
    ) {
      return Promise.resolve({
        content:
          "- 식사: 확인되지 않음\n- 수면: 확인되지 않음\n- 기분: 확인되지 않음\n- 몸 상태: 확인되지 않음\n- 추가 확인: GPT API 키를 입력하면 대화 내용을 바탕으로 요약할 수 있습니다. (현재 목 모드)",
        isMock: true,
      });
    }
    if (/보고서|리포트|report/i.test(text)) {
      return Promise.resolve({
        content:
          "요청하신 날짜의 CSV 시연 일별 보고서를 채팅에 작성했습니다. (목 모드) 아래 **문서 미리보기**와 **다운로드** 버튼을 이용해 주세요. 합성 시연 데이터이며 공식 제출용이 아닙니다.",
        isMock: true,
      });
    }
    if (
      context &&
      context.csvDemoHints &&
      (text.indexOf("CSV") >= 0 ||
        text.indexOf("csv") >= 0 ||
        text.indexOf("시연") >= 0 ||
        text.indexOf("데이터셋") >= 0 ||
        text.indexOf("E001") >= 0)
    ) {
      return Promise.resolve({
        content:
          "합성 CSV 시연 정보가 브라우저에 준비되어 있습니다. (목 모드) API 키를 연결하면 더 자세히 설명해 드릴 수 있어요. CSV 시연 화면에서 차트와 규칙 분석도 확인하실 수 있습니다.",
        isMock: true,
      });
    }
    if (text.indexOf("심심") >= 0) {
      return Promise.resolve({
        content: "심심하셨군요. 저와 이야기 나눠요. 오늘은 어떻게 보내셨어요?",
        isMock: true,
      });
    }
    if (
      text.indexOf("숨") >= 0 &&
      (text.indexOf("힘") >= 0 || text.indexOf("쉬") >= 0)
    ) {
      return Promise.resolve({
        content:
          "지금은 도움이 필요할 수 있어요. 119나 가까운 분에게 바로 도움을 요청해 주세요.",
        isMock: true,
      });
    }
    return Promise.resolve({
      content:
        "네, 말씀 잘 들었습니다. (목 모드) 상단 GPT 연결에서 API 키를 저장하면 GPT로 대화할 수 있습니다.",
      isMock: true,
    });
  }

  /**
   * @param {Object} options
   * @returns {Promise<{content: string}>}
   */
  function chatCompletions(options) {
    var base = (options.baseUrl || "").replace(/\/$/, "");
    var url = base + "/chat/completions";
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + options.apiKey,
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: 0.5,
      }),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var msg =
            (data.error && data.error.message) ||
            "API 요청에 실패했습니다. (" + res.status + ")";
          throw new Error(msg);
        }
        var content =
          data.choices && data.choices[0] && data.choices[0].message
            ? data.choices[0].message.content
            : "";
        return { content: content || "" };
      });
    });
  }

  /**
   * @param {Array} history
   * @param {Object} context
   * @returns {Promise<{content: string, usedMock: boolean}>}
   */
  function chat(history, context) {
    var config = getConfig();
    var system = buildSystemPrompt(context || {});
    var messages = [{ role: "system", content: system }].concat(history);

    if (config.forceMock || !config.apiKey) {
      return mockChat(messages, context).then(function (mockResult) {
        return { content: mockResult.content, usedMock: true };
      });
    }

    return chatCompletions({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      messages: messages,
    })
      .then(function (result) {
        return { content: result.content, usedMock: false };
      })
      .catch(function (err) {
        return mockChat(messages, context).then(function (fallback) {
          return {
            content:
              "연결에 문제가 있어 목 응답으로 답합니다. (" +
              (err.message || "오류") +
              ")\n\n" +
              fallback.content,
            usedMock: true,
          };
        });
      });
  }

  global.Harugyeol = global.Harugyeol || {};
  global.Harugyeol.LLM = {
    DEFAULT_MODEL: DEFAULT_MODEL,
    DEFAULT_BASE_URL: DEFAULT_BASE_URL,
    getConfig: getConfig,
    saveConfig: saveConfig,
    clearApiKey: clearApiKey,
    maskApiKey: maskApiKey,
    getStatus: getStatus,
    chat: chat,
  };
})(window);
