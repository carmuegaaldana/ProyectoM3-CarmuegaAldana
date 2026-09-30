// Funciones puras: no hacen peticiones ni modifican el DOM.
export function validateMessages(messages) {
  return Array.isArray(messages) && messages.length > 0 && messages.every(
    (message) => message && ["user", "model"].includes(message.role) &&
      typeof message.text === "string" && message.text.trim().length > 0
  );
}

export function toGeminiContents(messages) {
  if (!validateMessages(messages)) throw new Error("Historial inválido.");
  const start = messages.findIndex((message) => message.role === "user");
  if (start < 0 || messages.at(-1).role !== "user") {
    throw new Error("La conversación debe terminar con un mensaje del usuario.");
  }
  return messages.slice(start).map(({ role, text }) => ({
    role, parts: [{ text }],
  }));
}

export function extractReply(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.filter((part) => typeof part?.text === "string" && !part.thought)
    .map((part) => part.text).join("").trim();
}
