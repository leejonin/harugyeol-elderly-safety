/**
 * OpenAI Chat Completions API 호출
 */

/**
 * @param {Object} options
 * @param {string} options.apiKey
 * @param {string} options.baseUrl
 * @param {string} options.model
 * @param {Array<{role: string, content: string}>} options.messages
 * @returns {Promise<{content: string}>}
 */
export async function chatCompletions(options) {
  var base = (options.baseUrl || "").replace(/\/$/, "");
  var url = base + "/chat/completions";
  var res = await fetch(url, {
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
  });
  var data = await res.json().catch(function () {
    return {};
  });
  if (!res.ok) {
    var msg =
      (data.error && data.error.message) ||
      "API 요청에 실패했습니다. (" + res.status + ")";
    throw new Error(msg);
  }
  var content = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : "";
  return { content: content || "" };
}
