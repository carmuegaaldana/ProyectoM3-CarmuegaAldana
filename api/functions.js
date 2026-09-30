import { validateMessages, toGeminiContents, extractReply } from "../src/utils.js";
import { SYSTEM_PROMPT } from "../server/persona.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Esta función recibe mensajes mediante POST.",
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;

  if (!apiKey || !model) {
    return res.status(500).json({
      error: "Falta configurar GEMINI_API_KEY o GEMINI_MODEL en el servidor.",
    });
  }

  const messages = req.body?.messages;

  const validMessages = validateMessages(messages);

  if (!validMessages) {
    return res.status(400).json({
      error: "El historial de mensajes no tiene un formato válido.",
    });
  }

  // El saludo inicial es parte de la interfaz.
  // Enviamos la conversación desde el primer mensaje del usuario.
  const firstUserIndex = messages.findIndex(
    (message) => message.role === "user"
  );

  if (
    firstUserIndex === -1 ||
    messages[messages.length - 1].role !== "user"
  ) {
    return res.status(400).json({
      error: "La conversación debe terminar con un mensaje del usuario.",
    });
  }

  const contents = toGeminiContents(messages);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents,
        }),
        signal: AbortSignal.timeout(25000),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error?.message;

      // Diagnóstico en el servidor, ocultando la clave si Gemini la incluye.
      if (process.env.NODE_ENV === "development") {
        console.error("Error de Gemini:", {
          httpStatus: response.status,
          status: errorData?.error?.status,
          message: typeof errorMessage === "string"
            ? errorMessage.split(apiKey).join("[CLAVE OCULTA]")
            : "Sin detalle del error",
        });
      }

      const errors = {
        400: "Gemini rechazó el formato de la solicitud.",
        401: "Gemini no pudo autenticar la clave configurada.",
        403: "La clave o el proyecto no tienen permiso para esta solicitud.",
        404: "El modelo configurado no está disponible.",
        429: "Se alcanzó un límite de uso de Gemini. Revisá la cuota en AI Studio.",
        503: "Hermione no puede responder ahora porque el servicio está ocupado. Intentá de nuevo en un momento.",
      };

      return res.status(response.status === 429 ? 429 : 502).json({
        error: errors[response.status] || "Gemini no pudo responder.",
      });
    }

    const data = await response.json();

    const reply = extractReply(data);

    if (!reply) {
      return res.status(502).json({
        error: "Gemini no devolvió una respuesta de texto.",
      });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    const timedOut = error.name === "TimeoutError";

    return res.status(timedOut ? 504 : 502).json({
      error: timedOut
        ? "Gemini tardó demasiado en responder. Intentá nuevamente."
        : "No se pudo conectar con Gemini. Intentá nuevamente.",
    });
  }
}