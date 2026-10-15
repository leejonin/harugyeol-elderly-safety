/**
 * AI 대화·안부 채팅 페이지 (file:// 호환)
 */
(function () {
  "use strict";

  var Common = window.Harugyeol.Common;
  var Data = window.Harugyeol.Data;
  var LLM = window.Harugyeol.LLM;
  var ChatCsvContext = window.Harugyeol.ChatCsvContext;

  if (!Common || !Data || !LLM) {
    var rootErr = document.getElementById("chat-root");
    if (rootErr) {
      rootErr.innerHTML =
        '<div class="section"><p>스크립트를 불러오지 못했습니다. chat.html을 프로젝트 폴더에서 다시 열어 주세요.</p></div>';
    }
    return;
  }

  var session = Common.getSession();
  if (!session) {
    Common.requireAuth();
    var rootLogin = document.getElementById("chat-root");
    if (rootLogin) {
      rootLogin.innerHTML =
        '<div class="section"><p>로그인이 필요합니다.</p><p><a class="btn" href="login.html">시연 로그인</a></p></div>';
    }
    return;
  }

  document.body.classList.add("page-chat");
  Common.renderHeader("chat", document.getElementById("site-header"));

  var store = Data.getStore();
  var elders = Common.getAccessibleElders(store, session.userId);
  var root = document.getElementById("chat-root");
  var TTS_STORAGE_KEY = "harugyeol_tts_enabled";

  /**
   * 현재 브라우저가 음성 합성을 지원하는지 확인합니다.
   * @returns {boolean}
   */
  function isTtsSupported() {
    return (
      "speechSynthesis" in window &&
      typeof window.SpeechSynthesisUtterance === "function"
    );
  }

  /**
   * 답변 자동 읽기 설정을 반환합니다. 최초에는 켜진 상태입니다.
   * @returns {boolean}
   */
  function isTtsEnabled() {
    var saved = localStorage.getItem(TTS_STORAGE_KEY);
    return saved === null ? true : saved === "1";
  }

  /**
   * 답변 자동 읽기 설정을 저장합니다.
   * @param {boolean} enabled
   */
  function saveTtsEnabled(enabled) {
    localStorage.setItem(TTS_STORAGE_KEY, enabled ? "1" : "0");
  }

  /**
   * 읽고 있는 음성을 즉시 중지합니다.
   */
  function stopSpeech() {
    if (isTtsSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * 브라우저의 한국어 음성을 우선 사용해 텍스트를 읽습니다.
   * @param {string} text
   * @returns {boolean} 읽기 시작 여부
   */
  function speakText(text) {
    if (!isTtsSupported() || !text) {
      return false;
    }

    stopSpeech();
    var utterance = new window.SpeechSynthesisUtterance(
      String(text).replace(/[*#`]/g, "")
    );
    var voices = window.speechSynthesis.getVoices();
    var koreanVoice = voices.find(function (voice) {
      return /^ko(?:-|_)/i.test(voice.lang || "");
    });
    utterance.lang = "ko-KR";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    if (koreanVoice) {
      utterance.voice = koreanVoice;
    }
    window.speechSynthesis.speak(utterance);
    return true;
  }

  /**
   * @param {string} elderId
   * @returns {string}
   */
  function threadKey(elderId) {
    return "harugyeol_chat_" + elderId;
  }

  /**
   * @param {string} elderId
   * @returns {{ messages: Array, lastSummary: string|null, updatedAt: string|null }}
   */
  function loadThread(elderId) {
    try {
      var raw = localStorage.getItem(threadKey(elderId));
      if (!raw) {
        return { messages: [], lastSummary: null, updatedAt: null };
      }
      return JSON.parse(raw);
    } catch (e) {
      return { messages: [], lastSummary: null, updatedAt: null };
    }
  }

  /**
   * @param {string} elderId
   * @param {Object} thread
   */
  function saveThread(elderId, thread) {
    thread.updatedAt = new Date().toISOString();
    localStorage.setItem(threadKey(elderId), JSON.stringify(thread));
  }

  /**
   * @param {string} elderId
   * @returns {string}
   */
  /**
   * CSV 시연 스냅샷을 GPT 참고 문구로 반환합니다.
   * @returns {string}
   */
  function buildCsvDemoHints() {
    if (!ChatCsvContext) {
      return "";
    }
    return ChatCsvContext.buildHintsText(ChatCsvContext.getSnapshot());
  }

  /**
   * CSV 참고 데이터 UI 한 줄
   * @returns {string}
   */
  function csvContextSidebarHtml() {
    if (!ChatCsvContext) {
      return "";
    }
    var snap = ChatCsvContext.getSnapshot();
    var status = snap
      ? "준비됨 · E001 " +
        snap.rowCount +
        "행 · 분석일 " +
        (snap.analysis && snap.analysis.analyzeDate
          ? snap.analysis.analyzeDate
          : snap.analyzeDate || "—")
      : "없음 — CSV 시연·생활패턴에서 불러오거나 아래 버튼 사용";
    return (
      "<h3 class=\"gpt-chat-sidebar__title\">CSV 시연 참고</h3>" +
      '<p class="muted gpt-chat-sidebar__hint">' +
      Common.escapeHtml(status) +
      "</p>" +
      '<p class="muted gpt-chat-sidebar__hint">합성 데이터이며 GPT 답변은 시연 설명용입니다.</p>' +
      '<div class="gpt-chat-sidebar__actions">' +
      '<button type="button" class="btn btn--secondary btn--small" id="btn-refresh-csv-context">CSV 참고 갱신</button> ' +
      '<a class="btn btn--small" href="' +
      Common.appPath("dataset.html") +
      '">CSV 시연</a></div>'
    );
  }

  function buildSensorHints(elderId) {
    var signals = store.signals
      .filter(function (s) {
        return s.elderId === elderId;
      })
      .slice(0, 3);
    if (signals.length === 0) {
      return "최근 생활 신호 예시 데이터가 없습니다.";
    }
    return signals
      .map(function (s) {
        return s.summary;
      })
      .join("; ");
  }

  /** @type {RegExp} OpenAI API 키 형식 (sk- + 영문·숫자·._-) */
  var API_KEY_PATTERN = /^sk-[A-Za-z0-9._-]+$/;

  /**
   * API 키 형식이 올바른지 확인합니다.
   * @param {string} key
   * @returns {boolean}
   */
  function isValidApiKey(key) {
    return API_KEY_PATTERN.test(key);
  }

  /**
   * 입력 중 허용 문자만 남기고 sk- 접두 형태를 유지합니다.
   * @param {string} value
   * @returns {string}
   */
  function sanitizeApiKeyInput(value) {
    var v = value.replace(/[^A-Za-z0-9._-]/g, "");
    if (!v) {
      return "";
    }
    if (v.startsWith("sk-")) {
      return v;
    }
    if (v === "s" || v === "sk") {
      return v;
    }
    if (v.startsWith("sk") && v.length > 2 && v[2] !== "-") {
      return "sk-" + v.slice(2);
    }
    if (!v.startsWith("s")) {
      return "";
    }
    return v;
  }

  /**
   * API 키 입력 필드에 실시간 필터를 연결합니다.
   * @param {HTMLInputElement} inputEl
   */
  function bindApiKeyInput(inputEl) {
    inputEl.addEventListener("input", function () {
      var cleaned = sanitizeApiKeyInput(inputEl.value);
      if (cleaned !== inputEl.value) {
        inputEl.value = cleaned;
      }
      inputEl.setCustomValidity(
        cleaned && !isValidApiKey(cleaned) && cleaned.length > 3
          ? "sk-로 시작하는 올바른 키 형식이 아닙니다."
          : ""
      );
    });
    inputEl.addEventListener("paste", function (ev) {
      ev.preventDefault();
      var paste = (ev.clipboardData || window.clipboardData).getData("text");
      inputEl.value = sanitizeApiKeyInput(paste);
      inputEl.dispatchEvent(new Event("input"));
    });
  }

  /**
   * 마크다운 보고서 파일 다운로드
   * @param {string} filename
   * @param {string} markdown
   */
  function downloadMarkdownFile(filename, markdown) {
    var blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename || "harugyeol-report.md";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 보고서 미리보기·다운로드 UI
   * @param {{ report?: { dateKey: string, filename?: string } }} m
   * @param {number} messageIndex
   * @returns {string}
   */
  function reportAttachmentHtml(m, messageIndex) {
    if (!m.report || !m.report.markdown) {
      return "";
    }
    var preview =
      '<details class="chat-report-preview">' +
      '<summary>문서 미리보기 (' +
      Common.escapeHtml(m.report.dateKey || "") +
      ")</summary>" +
      '<pre class="chat-report-preview__body">' +
      Common.escapeHtml(m.report.markdown) +
      "</pre></details>";
    return (
      '<div class="chat-report-attachment">' +
      preview +
      '<div class="gpt-msg__tools gpt-msg__tools--report">' +
      '<button type="button" class="gpt-msg-tts" data-message-index="' +
      messageIndex +
      '" aria-label="이 답변 읽기">🔊 읽기</button>' +
      '<button type="button" class="gpt-msg-report-download" data-message-index="' +
      messageIndex +
      '" aria-label="보고서 다운로드">⬇ 다운로드 (.md)</button>' +
      "</div></div>"
    );
  }

  /**
   * 메시지 한 줄 HTML (GPT 스타일)
   * @param {{ role: string, content: string, pending?: boolean, report?: Object }} m
   * @param {number} [messageIndex] - 저장된 대화 내 메시지 위치
   * @returns {string}
   */
  function messageRowHtml(m, messageIndex) {
    var isUser = m.role === "user";
    var cls = "gpt-msg gpt-msg--" + (isUser ? "user" : "assistant");
    if (m.pending) {
      cls += " gpt-msg--pending";
    }
    var avatar = isUser ? "나" : "하";
    var label = isUser ? "나" : "하루결 도우미";
    var toolsHtml = "";
    if (!isUser && !m.pending && typeof messageIndex === "number") {
      toolsHtml =
        '<div class="gpt-msg__tools">' +
        '<button type="button" class="gpt-msg-tts" data-message-index="' +
        messageIndex +
        '" aria-label="이 답변 읽기">🔊 읽기</button>' +
        "</div>";
      if (m.report && m.report.markdown) {
        toolsHtml = reportAttachmentHtml(m, messageIndex);
      }
    }
    return (
      '<div class="' +
      cls +
      '">' +
      '<div class="gpt-msg__avatar" aria-hidden="true">' +
      avatar +
      "</div>" +
      '<div class="gpt-msg__content">' +
      '<span class="gpt-msg__label">' +
      Common.escapeHtml(label) +
      "</span>" +
      '<div class="gpt-msg__text">' +
      Common.escapeHtml(m.content) +
      "</div>" +
      toolsHtml +
      "</div></div>"
    );
  }

  /**
   * 대화 스레드에서 보고서·TTS 버튼 이벤트 연결
   * @param {HTMLElement} root
   * @param {{ messages: Array }} thread
   */
  function bindMessageToolButtons(root, thread) {
    root.querySelectorAll(".gpt-msg-tts").forEach(function (button) {
      button.addEventListener("click", function () {
        var index = Number(button.getAttribute("data-message-index"));
        var message = thread.messages[index];
        if (message && message.role === "assistant") {
          speakText(message.content);
        }
      });
    });
    root.querySelectorAll(".gpt-msg-report-download").forEach(function (button) {
      button.addEventListener("click", function () {
        var index = Number(button.getAttribute("data-message-index"));
        var message = thread.messages[index];
        if (message && message.report && message.report.markdown) {
          downloadMarkdownFile(
            message.report.filename || "harugyeol-report.md",
            message.report.markdown
          );
        }
      });
    });
  }

  /**
   * 대화 영역 맨 아래로 스크롤
   */
  function scrollChatToBottom() {
    var el = document.getElementById("chat-messages");
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  /**
   * @param {string} elderId
   */
  function render(elderId) {
    var config = LLM.getConfig();
    var status = LLM.getStatus();
    var thread = loadThread(elderId);
    var elder = elders.find(function (e) {
      return e.id === elderId;
    });

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

    var masked = config.apiKey ? LLM.maskApiKey(config.apiKey) : "";
    var elderName = elder ? elder.name : "대상자";
    var statusClass =
      status.mode === "openai"
        ? "status-badge--ok"
        : status.mode === "mock"
          ? "status-badge--watch"
          : "status-badge--neutral";

    var html = '<div class="gpt-chat-app">';
    html += '<div class="gpt-chat-sidebar-backdrop" id="sidebar-backdrop" hidden></div>';
    html += '<aside class="gpt-chat-sidebar" id="chat-sidebar" aria-label="채팅 설정">';
    html += '<div class="gpt-chat-sidebar__head"><strong>설정</strong>';
    html +=
      '<button type="button" class="gpt-chat-sidebar-close" id="btn-close-sidebar" aria-label="설정 닫기">×</button></div>';
    html += '<div class="form-group"><label for="elder-select">대화 대상</label>';
    html += '<select id="elder-select">' + elderOptions + "</select></div>";
    html += "<h3 class=\"gpt-chat-sidebar__title\">GPT 연결</h3>";
    html += '<p class="muted gpt-chat-sidebar__hint">키는 이 브라우저에만 저장됩니다.</p>';
    if (masked) {
      html += "<p class=\"gpt-chat-sidebar__key\">저장됨: " + Common.escapeHtml(masked) + "</p>";
    }
    html += '<div class="form-group"><label for="api-key">API Key</label>';
    html +=
      '<input type="password" id="api-key" class="api-key-input" autocomplete="off" spellcheck="false" ' +
      'placeholder="sk-..." pattern="sk-[A-Za-z0-9._-]+" ' +
      'title="sk-로 시작, 영문·숫자·.(점)·_(밑줄)·-(하이픈)만 입력 가능" /></div>';
    html +=
      '<p class="muted gpt-chat-sidebar__hint">형식: sk- 로 시작 · 영문, 숫자, . _ - 만 허용</p>';
    html += '<div class="form-group"><label for="api-model">모델</label>';
    html +=
      '<input type="text" id="api-model" value="' +
      Common.escapeHtml(config.model || LLM.DEFAULT_MODEL) +
      '" /></div>';
    html +=
      '<label class="chat-check"><input type="checkbox" id="force-mock"' +
      (config.forceMock ? " checked" : "") +
      " /> 목 모드</label>";
    html += "<h3 class=\"gpt-chat-sidebar__title\">음성 읽기</h3>";
    html +=
      '<label class="chat-check"><input type="checkbox" id="tts-enabled"' +
      (isTtsEnabled() ? " checked" : "") +
      (isTtsSupported() ? "" : " disabled") +
      " /> AI 답변 자동 읽기</label>";
    html += isTtsSupported()
      ? '<p class="muted gpt-chat-sidebar__hint">브라우저의 기본 한국어 음성을 사용합니다.</p>'
      : '<p class="muted gpt-chat-sidebar__hint">이 브라우저는 음성 읽기를 지원하지 않습니다.</p>';
    html += '<div class="gpt-chat-sidebar__actions">';
    html += '<button type="button" class="btn btn--small" id="btn-save-key">키 저장</button>';
    html += '<button type="button" class="btn btn--secondary btn--small" id="btn-clear-key">키 삭제</button>';
    html += "</div>";
    html += csvContextSidebarHtml();
    if (thread.lastSummary) {
      html += '<details class="gpt-chat-summary-fold"><summary>마지막 상태 요약</summary>';
      html +=
        '<pre class="chat-summary-pre">' +
        Common.escapeHtml(thread.lastSummary) +
        "</pre>";
      html +=
        '<a href="dashboard.html?elder=' +
        encodeURIComponent(elderId) +
        '">대시보드</a></details>';
    }
    html += "</aside>";

    html += '<div class="gpt-chat-main">';
    html += '<header class="gpt-chat-toolbar">';
    html +=
      '<button type="button" class="gpt-chat-toolbar__menu" id="btn-open-sidebar" aria-label="설정 열기">☰</button>';
    html += '<div class="gpt-chat-toolbar__title">';
    html += "<h1>" + Common.escapeHtml(elderName) + " · AI 안부</h1>";
    html +=
      '<span class="status-badge ' +
      statusClass +
      " gpt-chat-toolbar__badge\">" +
      Common.escapeHtml(status.label) +
      "</span></div>";
    if (isTtsSupported()) {
      html +=
        '<button type="button" class="gpt-chat-stop-tts" id="btn-stop-tts" aria-label="음성 읽기 중지">■ 음성 중지</button>';
    }
    html += "</header>";

    html += '<div class="gpt-chat-thread" id="chat-messages" role="log" aria-live="polite">';
    if (thread.messages.length === 0) {
      html += '<div class="gpt-chat-welcome">';
      html += '<div class="gpt-chat-welcome__logo">하</div>';
      html += "<h2>하루결 AI 도우미</h2>";
      html += "<p>어르신과 편하게 대화하거나, 상태 요약을 요청할 수 있습니다.</p>";
      html +=
        '<p class="muted">예: 「10월 11일 생활패턴 분석 보고서」 — CSV 시연 보고서 미리보기·다운로드</p>';
      html += '<p class="muted">☰ 설정에서 GPT API 키를 입력하세요.</p>';
      if (ChatCsvContext && ChatCsvContext.hasSnapshot()) {
        html +=
          '<p class="muted">CSV 시연·규칙 분석 요약이 대화 참고로 연결되어 있습니다.</p>';
      }
      html += "</div>";
    } else {
      html += '<div class="gpt-chat-thread__inner">';
      thread.messages.forEach(function (m, index) {
        html += messageRowHtml(m, index);
      });
      html += "</div>";
    }
    html += "</div>";

    html += '<footer class="gpt-chat-composer">';
    html += '<div class="gpt-chat-composer__box">';
    html += '<label class="sr-only" for="chat-input">메시지</label>';
    html +=
      '<textarea id="chat-input" rows="1" placeholder="메시지를 입력하세요…"></textarea>';
    html +=
      '<button type="button" class="gpt-chat-send" id="btn-send" aria-label="보내기">↑</button>';
    html += "</div>";
    html += '<div class="gpt-chat-composer__meta">';
    html +=
      '<button type="button" class="gpt-chat-link-btn" id="btn-summary">상태 요약</button>';
    html += "<span>·</span>";
    html +=
      '<button type="button" class="gpt-chat-link-btn" id="btn-clear-chat">대화 초기화</button>';
    html += '<span class="muted">Enter 전송 · Shift+Enter 줄바꿈</span>';
    html += "</div></footer></div></div>";

    root.innerHTML = html;
    scrollChatToBottom();

    function openSidebar() {
      document.getElementById("chat-sidebar").classList.add("is-open");
      var bd = document.getElementById("sidebar-backdrop");
      bd.hidden = false;
    }
    function closeSidebar() {
      document.getElementById("chat-sidebar").classList.remove("is-open");
      document.getElementById("sidebar-backdrop").hidden = true;
    }
    document.getElementById("btn-open-sidebar").addEventListener("click", openSidebar);
    document.getElementById("btn-close-sidebar").addEventListener("click", closeSidebar);
    document.getElementById("sidebar-backdrop").addEventListener("click", closeSidebar);

    var apiKeyInput = document.getElementById("api-key");
    bindApiKeyInput(apiKeyInput);

    var ttsEnabledInput = document.getElementById("tts-enabled");
    ttsEnabledInput.addEventListener("change", function () {
      saveTtsEnabled(ttsEnabledInput.checked);
      if (!ttsEnabledInput.checked) {
        stopSpeech();
      }
    });

    var stopTtsButton = document.getElementById("btn-stop-tts");
    if (stopTtsButton) {
      stopTtsButton.addEventListener("click", stopSpeech);
    }

    bindMessageToolButtons(root, thread);

    document.getElementById("btn-save-key").addEventListener("click", function () {
      var key = sanitizeApiKeyInput(apiKeyInput.value.trim());
      if (key && !isValidApiKey(key)) {
        alert(
          "API 키는 sk- 로 시작해야 하며, 영문·숫자·.(점)·_(밑줄)·-(하이픈)만 사용할 수 있습니다."
        );
        apiKeyInput.focus();
        return;
      }
      var model =
        document.getElementById("api-model").value.trim() || LLM.DEFAULT_MODEL;
      var forceMock = document.getElementById("force-mock").checked;
      var prev = LLM.getConfig();
      LLM.saveConfig({
        apiKey: key || prev.apiKey,
        model: model,
        baseUrl: LLM.DEFAULT_BASE_URL,
        forceMock: forceMock,
      });
      apiKeyInput.value = "";
      render(elderId);
    });

    document.getElementById("btn-clear-key").addEventListener("click", function () {
      LLM.clearApiKey();
      render(elderId);
    });

    document.getElementById("elder-select").addEventListener("change", function () {
      stopSpeech();
      window.location.href = "chat.html?elder=" + encodeURIComponent(this.value);
    });

    /**
     * @param {boolean} summaryMode
     */
    /**
     * CSV 시연 일별 보고서 생성 (LLM 없이)
     * @param {string} userText
     */
    function sendDailyReportRequest(userText) {
      var inner = document.querySelector(".gpt-chat-thread__inner");
      if (inner) {
        inner.insertAdjacentHTML(
          "beforeend",
          messageRowHtml({
            role: "assistant",
            content: "보고서를 작성하고 있습니다…",
            pending: true,
          })
        );
        scrollChatToBottom();
      }
      ChatCsvContext.ensureRows(Common)
        .then(function (rows) {
          var snap = ChatCsvContext.getSnapshot();
          var dateKey = ChatCsvContext.parseDateFromMessage(
            userText,
            snap ? snap.dateRange : null
          );
          if (!dateKey && snap && snap.analyzeDate) {
            dateKey = snap.analyzeDate;
          }
          if (!dateKey) {
            dateKey = "2026-10-04";
          }
          var report = ChatCsvContext.buildDailyReport(rows, dateKey, {
            elderLabel: elder ? elder.name : "",
            learnEnd: snap && snap.learnEnd ? snap.learnEnd : undefined,
            userHint: userText,
          });
          var updated = loadThread(elderId);
          updated.messages.push({
            role: "assistant",
            content: report.summaryText,
            report: {
              dateKey: report.dateKey,
              markdown: report.markdown,
              filename: report.filename,
            },
          });
          saveThread(elderId, updated);
          render(elderId);
          if (isTtsEnabled()) {
            speakText(report.summaryText);
          }
        })
        .catch(function (err) {
          var updated = loadThread(elderId);
          updated.messages.push({
            role: "assistant",
            content:
              (err.message ||
                "보고서를 만들 수 없습니다.") +
              " CSV 시연(dataset) 화면을 한 번 연 뒤, 설정의 「CSV 참고 갱신」을 눌러 주세요.",
          });
          saveThread(elderId, updated);
          render(elderId);
        });
    }

    function sendMessage(summaryMode) {
      var input = document.getElementById("chat-input");
      var text = summaryMode
        ? "오늘 대화를 바탕으로 상태 요약을 요청합니다."
        : input.value.trim();
      if (!text) {
        return;
      }
      var cfg = LLM.getConfig();
      var threadNow = loadThread(elderId);
      threadNow.messages.push({ role: "user", content: text });
      saveThread(elderId, threadNow);
      input.value = "";
      render(elderId);

      var reportIntent =
        !summaryMode && ChatCsvContext && ChatCsvContext.resolveReportIntent
          ? ChatCsvContext.resolveReportIntent(
              text,
              threadNow.messages.slice(0, -1)
            )
          : { shouldHandle: false, sourceText: text };
      if (reportIntent.shouldHandle) {
        sendDailyReportRequest(reportIntent.sourceText);
        return;
      }

      var inner = document.querySelector(".gpt-chat-thread__inner");
      if (inner) {
        inner.insertAdjacentHTML(
          "beforeend",
          messageRowHtml({
            role: "assistant",
            content: "답변을 준비하고 있습니다…",
            pending: true,
          })
        );
        scrollChatToBottom();
      }

      var csvHints = buildCsvDemoHints();
      var context = {
        elderName: elder ? elder.name : "",
        sensorHints: buildSensorHints(elderId),
        csvDemoHints: csvHints,
        mode: summaryMode ? "summary_request" : "chat",
      };

      var history = threadNow.messages.map(function (m) {
        return { role: m.role, content: m.content };
      });

      LLM.chat(history, context)
        .then(function (result) {
          var updated = loadThread(elderId);
          updated.messages.push({ role: "assistant", content: result.content });
          if (summaryMode) {
            updated.lastSummary = result.content;
          }
          saveThread(elderId, updated);
          render(elderId);
          if (isTtsEnabled()) {
            speakText(result.content);
          }
          if (!cfg.apiKey && !cfg.forceMock && !summaryMode) {
            var meta = root.querySelector(".gpt-chat-composer__meta");
            if (meta && !meta.querySelector(".gpt-key-hint")) {
              var note = document.createElement("span");
              note.className = "muted gpt-key-hint";
              note.textContent = " · GPT API 키를 설정에서 저장하세요";
              meta.appendChild(note);
            }
          }
        })
        .catch(function (err) {
          render(elderId);
          alert(err.message || "오류가 발생했습니다.");
        });
    }

    document.getElementById("btn-send").addEventListener("click", function () {
      sendMessage(false);
    });
    var chatInput = document.getElementById("chat-input");
    chatInput.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        sendMessage(false);
      }
    });
    document.getElementById("btn-summary").addEventListener("click", function () {
      sendMessage(true);
    });
    document.getElementById("btn-clear-chat").addEventListener("click", function () {
      if (window.confirm("이 어르신과의 대화를 모두 지울까요?")) {
        stopSpeech();
        saveThread(elderId, { messages: [], lastSummary: null, updatedAt: null });
        render(elderId);
      }
    });

    var refreshCsvBtn = document.getElementById("btn-refresh-csv-context");
    if (refreshCsvBtn && ChatCsvContext) {
      refreshCsvBtn.addEventListener("click", function () {
        refreshCsvBtn.disabled = true;
        refreshCsvBtn.textContent = "불러오는 중…";
        ChatCsvContext.refreshFromNetwork(Common)
          .then(function () {
            render(elderId);
          })
          .catch(function (err) {
            alert(err.message || "CSV 참고 데이터를 불러오지 못했습니다.");
            refreshCsvBtn.disabled = false;
            refreshCsvBtn.textContent = "CSV 참고 갱신";
          });
      });
    }
  }

  var elderParam = Common.getQueryParam("elder");
  var selectedId =
    elderParam &&
    elders.some(function (e) {
      return e.id === elderParam;
    })
      ? elderParam
      : elders[0]
        ? elders[0].id
        : null;

  if (!selectedId) {
    root.innerHTML =
      '<div class="section"><p>연결된 대상자가 없습니다. <a href="login.html">로그인</a> 후 이용하세요.</p></div>';
  } else {
    render(selectedId);
    if (
      ChatCsvContext &&
      !ChatCsvContext.hasSnapshot() &&
      window.location.protocol !== "file:"
    ) {
      ChatCsvContext.refreshFromNetwork(Common)
        .then(function () {
          render(selectedId);
        })
        .catch(function () {
          /* CSV 참고 없이 대화 가능 */
        });
    }
  }

  window.addEventListener("beforeunload", stopSpeech);
})();
