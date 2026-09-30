export async function getAIReply(history) {
  let response;
  try {
    response = await fetch("/api/functions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    throw new Error(error.name === "TimeoutError"
      ? "La respuesta tardó demasiado. Podés reintentar el mensaje."
      : "No se pudo conectar con el servidor. Revisá tu conexión e intentá nuevamente.");
  }

  const data = await response.json().catch(() => null);
  if (!data || typeof data !== "object") {
    throw new Error("El servidor devolvió una respuesta inesperada. Intentá nuevamente.");
  }
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "No se pudo obtener una respuesta.");
  }
  if (typeof data.reply !== "string" || !data.reply.trim()) {
    throw new Error("El servidor devolvió una respuesta vacía.");
  }
  return data.reply.trim();
}
