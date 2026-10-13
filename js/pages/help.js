/**
 * 사용자 도움 — 1: AI 대화, 2: 대시보드 안내
 */
(function () {
  "use strict";
  var Common = window.Harugyeol.Common;

  var session = Common.requireAuth();
  if (!session) {
    return;
  }
  Common.renderHeader("help", document.getElementById("site-header"));

  var items = [
    {
      id: "1",
      title: "AI 대화·안부 확인",
      body:
        "어르신과 편하게 대화하고, 필요할 때 상태 요약을 받을 수 있습니다. " +
        "OpenAI GPT API 키는 AI 대화 화면 상단 「GPT 연결」에서 입력·저장합니다. " +
        "키가 없으면 목(시연) 응답으로 동작합니다. 실제 스피커·119·보호자 자동 연동은 하지 않습니다.",
      href: "chat.html",
      cta: "AI 대화 열기",
    },
    {
      id: "2",
      title: "대시보드 안내",
      body:
        "① 왼쪽(모바일에서는 위)에서 담당 어르신을 선택합니다. " +
        "② 현재 확인 상태와 최근 생활 신호를 봅니다. " +
        "③ 미확인 알림이 있으면 먼저 확인하고, 알림 상세에서 판단 근거·대응 이력을 봅니다. " +
        "④ 생활패턴·설정 화면에서 기록과 기기·연락처를 확인할 수 있습니다.",
      href: "dashboard.html",
      cta: "대시보드로 이동",
    },
  ];

  var html = "";
  items.forEach(function (item) {
    html += "<li>";
    html += '<span class="help-id">도움 ' + Common.escapeHtml(item.id) + "</span>";
    html += "<h2>" + Common.escapeHtml(item.title) + "</h2>";
    html += "<p>" + Common.escapeHtml(item.body) + "</p>";
    html += '<p><a class="btn" href="' + Common.escapeHtml(item.href) + '">' + Common.escapeHtml(item.cta) + "</a></p>";
    html += "</li>";
  });

  document.getElementById("help-list").innerHTML = html;
})();
