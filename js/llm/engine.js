/**
 * LLM 엔진 — localStorage 설정 + OpenAI / mock
 */

import {
  DEFAULT_MODEL,
  DEFAULT_BASE_URL,
  LLM_CONFIG_STORAGE_KEY,
} from "./defaults.js";
import { chatCompletions } from "./openai-backend.js";
import { mockChat } from "./mock-backend.js";
import { buildSystemPrompt } from "../prompts/harugyeol-assistant.js";

/**
 * @returns {{ apiKey: string, model: string, baseUrl: string, forceMock: boolean }}
 */
export function getConfig() {
  try {
    var raw = localStorage.getItem(LLM_CONFIG_STORAGE_KEY);
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
 * @param {{ apiKey?: string, model?: string, baseUrl?: string, forceMock?: boolean }} partial
 */
export function saveConfig(partial) {
  var current = getConfig();
  var next = {
    apiKey: partial.apiKey !== undefined ? partial.apiKey : current.apiKey,
    model: partial.model !== undefined ? partial.model : current.model,
    baseUrl: partial.baseUrl !== undefined ? partial.baseUrl : current.baseUrl,
    forceMock:
      partial.forceMock !== undefined ? partial.forceMock : current.forceMock,
  };
  localStorage.setItem(LLM_CONFIG_STORAGE_KEY, JSON.stringify(next));
}

/**
 * API 키만 삭제합니다.
 */
export function clearApiKey() {
  saveConfig({ apiKey: "" });
}

/**
 * @param {string} apiKey
 * @returns {string}
 */
export function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) {
    return "";
  }
  return "sk-…" + apiKey.slice(-4);
}

/**
 * @returns {{ mode: string, label: string }}
 */
export function getStatus() {
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
 * @param {Array<{role: string, content: string}>} history - user/assistant only
 * @param {Object} context - buildSystemPrompt용
 * @returns {Promise<{content: string, usedMock: boolean}>}
 */
export async function chat(history, context) {
  var config = getConfig();
  var system = buildSystemPrompt(context || {});
  var messages = [{ role: "system", content: system }].concat(history);

  if (config.forceMock || !config.apiKey) {
    var mockResult = await mockChat(messages, context);
    return { content: mockResult.content, usedMock: true };
  }

  try {
    var result = await chatCompletions({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      messages: messages,
    });
    return { content: result.content, usedMock: false };
  } catch (err) {
    var fallback = await mockChat(messages, context);
    return {
      content:
        "연결에 문제가 있어 잠시 목 응답으로 답합니다. (" +
        (err.message || "오류") +
        ")\n\n" +
        fallback.content,
      usedMock: true,
    };
  }
}
