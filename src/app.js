import { initChat } from "./chat.js";

const app = document.querySelector("#app");
const chatTemplate = document.querySelector("#chat-template");

function renderHome() {
  app.innerHTML = `
    <section class="info-page" aria-labelledby="home-title">
      <h1 id="home-title">Charlá con Hermione Granger</h1>
      <p>
        Conversá con una de las brujas más ingeniosas de Hogwarts.
        Preguntale sobre magia, libros o sus aventuras.
      </p>
      <a class="primary-link" href="/chat">Empezar a conversar</a>
    </section>
  `;
}

function renderChat() {
  app.replaceChildren(chatTemplate.content.cloneNode(true));
  initChat();
}

function renderAbout() {
  app.innerHTML = `
    <section class="info-page" aria-labelledby="about-title">
      <h1 id="about-title">Acerca del proyecto</h1>
      <p>
        Esta aplicación es el Proyecto Integrador del Módulo 3,
        desarrollado por Aldana Carmuega con HTML, CSS y JavaScript.
      </p>
      <p>
        Hermione Granger se destaca por su inteligencia, su dedicación
        al estudio y su lealtad a sus amigos.
      </p>
      <p>
        La aplicación se conecta con Gemini para generar las respuestas.
        Es una experiencia educativa y no es un producto oficial
        de la franquicia.
      </p>
    </section>
  `;
}

const routes = {
  "/home": renderHome,
  "/chat": renderChat,
  "/about": renderAbout,
};

function renderRoute() {
  const path = window.location.pathname;

  if (!Object.hasOwn(routes, path)) {
    window.history.replaceState(null, "", "/home");
    renderRoute();
    return;
  }

  routes[path]();

  document.querySelectorAll("nav a").forEach((link) => {
    if (link.getAttribute("href") === path) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a");

  if (
    !link ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey ||
    link.hasAttribute("download") ||
    (link.target && link.target !== "_self")
  ) {
    return;
  }

  const url = new URL(link.href);

  if (
    url.origin !== window.location.origin ||
    !Object.hasOwn(routes, url.pathname)
  ) {
    return;
  }

  event.preventDefault();

  if (url.pathname !== window.location.pathname) {
    window.history.pushState(null, "", url.pathname);
    renderRoute();
  }
});

window.addEventListener("popstate", renderRoute);

renderRoute();