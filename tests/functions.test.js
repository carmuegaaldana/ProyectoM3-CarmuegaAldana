import {
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";

import handler from "../api/functions.js";

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
  };
}

function createRequest() {
  return {
    method: "POST",
    body: {
      messages: [
        { role: "user", text: "Hola, Hermione" },
      ],
    },
  };
}

beforeEach(() => {
  // Valores ficticios que solo existen durante los tests.
  vi.stubEnv("GEMINI_API_KEY", "clave-de-prueba");
  vi.stubEnv("GEMINI_MODEL", "modelo-de-prueba");

  vi.stubGlobal("fetch", vi.fn());

  // Evita imprimir los errores que simulamos intencionalmente.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Función del chat", () => {
  it("rechaza mensajes vacíos sin llamar a Gemini", async () => {
    const req = createRequest();
    const res = createResponse();

    req.body.messages[0].text = "   ";

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("devuelve el texto de una respuesta válida", async () => {
    const req = createRequest();
    const res = createResponse();

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                { text: "¡Hola! " },
                { text: "¿Qué querés aprender?" },
              ],
            },
          },
        ],
      }),
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      reply: "¡Hola! ¿Qué querés aprender?",
    });
  });

  it("envía el historial para conservar el contexto", async () => {
    const req = createRequest();
    const res = createResponse();

    req.body.messages = [
      { role: "model", text: "¡Hola! Soy Hermione." },
      { role: "user", text: "Me llamo Aldana." },
      { role: "model", text: "¡Mucho gusto, Aldana!" },
      { role: "user", text: "¿Cómo me llamo?" },
    ];

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "Te llamás Aldana." }],
            },
          },
        ],
      }),
    });

    await handler(req, res);

    expect(fetch).toHaveBeenCalledTimes(1);

    const options = fetch.mock.calls[0][1];
    const body = JSON.parse(options.body);

    expect(body.contents).toEqual([
      {
        role: "user",
        parts: [{ text: "Me llamo Aldana." }],
      },
      {
        role: "model",
        parts: [{ text: "¡Mucho gusto, Aldana!" }],
      },
      {
        role: "user",
        parts: [{ text: "¿Cómo me llamo?" }],
      },
    ]);
  });

  it("informa cuando Gemini está ocupado", async () => {
    const req = createRequest();
    const res = createResponse();

    fetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        error: {
          status: "UNAVAILABLE",
          message: "High demand",
        },
      }),
    });

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({
      error:
        "Hermione no puede responder ahora porque el servicio está ocupado. Intentá de nuevo en un momento.",
    });
  });

  it("maneja una respuesta sin texto", async () => {
    const req = createRequest();
    const res = createResponse();

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [],
      }),
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      error: "Gemini no devolvió una respuesta de texto.",
    });
  });
});