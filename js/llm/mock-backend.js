/**
 * API 키 없음·목 모드 시 규칙 기반 응답
 */

/**
 * @param {Array<{role: string, content: string}>} messages
 * @param {Object} [context]
 * @returns {Promise<{content: string, isMock: boolean}>}
 */
export async function mockChat(messages, context) {
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
    text.indexOf("요약해") >= 0 ||
    (context && context.mode === "summary_request")
  ) {
    return {
      content:
        "- 식사: 확인되지 않음\n" +
        "- 수면: 확인되지 않음\n" +
        "- 기분: 확인되지 않음\n" +
        "- 몸 상태: 확인되지 않음\n" +
        "- 추가 확인: GPT API 키를 입력하면 대화 내용을 바탕으로 요약할 수 있습니다. (현재 목 모드)",
      isMock: true,
    };
  }

  if (text.indexOf("뭐 먹") >= 0 || text.indexOf("먹었다") >= 0) {
    return {
      content: "말씀해 주신 내용을 기억하고 있어요. 더 이야기 나눠 볼까요?",
      isMock: true,
    };
  }

  if (
    text.indexOf("숨") >= 0 &&
    (text.indexOf("힘") >= 0 || text.indexOf("쉬") >= 0)
  ) {
    return {
      content:
        "지금은 도움이 필요할 수 있어요. 119나 가까운 분에게 바로 도움을 요청해 주세요.",
      isMock: true,
    };
  }

  if (text.indexOf("심심") >= 0) {
    return {
      content: "심심하셨군요. 저와 이야기 나눠요. 오늘은 어떻게 보내셨어요?",
      isMock: true,
    };
  }

  if (!text) {
    return {
      content: "말씀해 주시면 듣고 있겠습니다.",
      isMock: true,
    };
  }

  return {
    content:
      "네, 말씀 잘 들었습니다. (목 모드) 채팅 화면 상단에서 GPT API 키를 저장하면 더 자연스럽게 대화할 수 있습니다.",
    isMock: true,
  };
}
