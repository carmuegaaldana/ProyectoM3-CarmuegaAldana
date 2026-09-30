import { getAIReply } from "./services/chatApi.js";

const messages = [
  {
    role: "model",
    text: "¡Hola! ¿Venís a hablar de magia o necesitás ayuda para estudiar?",
  },
];

let isLoading = false;
let chatError = "";
let pendingReply = false;

function renderMessages() {
  const container = document.querySelector("#chat-messages");

  if (!container) return;

  container.replaceChildren();

  messages.forEach((message) => {
    const article = document.createElement("article");
    const author = document.createElement("p");
    const content = document.createElement("p");

    const isUser = message.role === "user";

    article.classList.add(
      "message",
      isUser ? "message--user" : "message--character"
    );

    author.classList.add("message-author");
    author.textContent = isUser ? "Vos" : "Hermione";
    content.textContent = message.text;

    article.append(author, content);
    container.append(article);
  });

  container.scrollTop = container.scrollHeight;
}

function renderState() {
  const form = document.querySelector("#chat-form");

  if (!form) return;

  const status = document.querySelector("#chat-status");
  const error = document.querySelector("#chat-error");
  const button = form.querySelector('button[type="submit"]');

  status.textContent = isLoading ? "Hermione está escribiendo..." : "";
  button.disabled = isLoading || pendingReply;
  const retry = document.querySelector("#retry-button");
  retry.hidden = !pendingReply || isLoading;
  retry.disabled = isLoading;

  error.textContent = chatError;
  error.hidden = !chatError;
}

async function handleSubmit(event) {
  event.preventDefault();

  if (isLoading || pendingReply) return;

  const input = event.currentTarget.querySelector("#message-input");
  const text = input.value.trim();

  if (!text) return;

  messages.push({ role: "user", text });
  input.value = "";

  pendingReply = true;
  await requestReply();
}

async function requestReply() {
  if (isLoading || !pendingReply) return;
  isLoading = true;
  chatError = "";

  renderMessages();
  renderState();

  try {
    const reply = await getAIReply(messages);

    messages.push({ role: "model", text: reply });
    pendingReply = false;
  } catch (error) {
    chatError = error.message || "No se pudo obtener una respuesta.";
  } finally {
    isLoading = false;
    renderMessages();
    renderState();
  }
}

export function initChat() {
  renderMessages();
  renderState();

  const form = document.querySelector("#chat-form");
  form.addEventListener("submit", handleSubmit);
  document.querySelector("#retry-button").addEventListener("click", requestReply);
}