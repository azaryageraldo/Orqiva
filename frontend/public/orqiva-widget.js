(function () {
  var script = document.currentScript;
  if (!script) return;

  var token = script.getAttribute("data-orqiva-token");
  if (!token) return;

  var mountId = "orqiva-widget-" + token;
  if (document.getElementById(mountId)) return;

  var origin;
  try {
    var configured = script.getAttribute("data-orqiva-host");
    var candidate = new URL(configured || script.src, window.location.href);
    if (candidate.protocol !== "http:" && candidate.protocol !== "https:") return;
    origin = candidate.origin;
  } catch {
    return;
  }

  var mount = document.createElement("div");
  mount.id = mountId;
  document.body.appendChild(mount);

  var root = mount.attachShadow({ mode: "open" });
  root.innerHTML = [
    "<style>",
    ":host{all:initial}",
    "*{box-sizing:border-box}",
    ".orqiva-launcher{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:flex;height:56px;width:56px;align-items:center;justify-content:center;border:0;border-radius:999px;background:linear-gradient(135deg,#22d3ee,#3b82f6 52%,#8b5cf6);box-shadow:0 18px 45px rgba(2,8,23,.35);color:#fff;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}",
    ".orqiva-launcher:hover{transform:translateY(-2px);box-shadow:0 22px 55px rgba(2,8,23,.45)}",
    ".orqiva-launcher:focus-visible{outline:3px solid #93c5fd;outline-offset:3px}",
    ".orqiva-launcher svg{height:25px;width:25px}",
    ".orqiva-panel{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:none;height:min(660px,calc(100dvh - 40px));width:min(390px,calc(100vw - 40px));overflow:hidden;border:1px solid rgba(148,163,184,.28);border-radius:20px;background:#080a0e;box-shadow:0 30px 80px rgba(2,8,23,.55)}",
    ".orqiva-panel[data-open='true']{display:block}",
    "iframe{height:100%;width:100%;border:0;background:#080a0e}",
    "@media(max-width:640px){.orqiva-launcher{right:16px;bottom:16px}.orqiva-panel{right:8px;bottom:8px;height:calc(100dvh - 16px);width:calc(100vw - 16px);border-radius:16px}}",
    "@media(prefers-reduced-motion:reduce){.orqiva-launcher{transition:none}}",
    "</style>",
    "<button class='orqiva-launcher' type='button' aria-label='Open Orqiva chat' aria-expanded='false'>",
    "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z'/><path d='M8 9h8M8 13h5'/></svg>",
    "</button>",
    "<div class='orqiva-panel' data-open='false'><iframe title='Orqiva customer support' loading='lazy'></iframe></div>",
  ].join("");

  var launcher = root.querySelector(".orqiva-launcher");
  var panel = root.querySelector(".orqiva-panel");
  var frame = root.querySelector("iframe");
  var loaded = false;

  function setOpen(open) {
    panel.setAttribute("data-open", String(open));
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? "Close Orqiva chat" : "Open Orqiva chat");
    launcher.innerHTML = open
      ? "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' aria-hidden='true'><path d='M18 6 6 18M6 6l12 12'/></svg>"
      : "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z'/><path d='M8 9h8M8 13h5'/></svg>";

    if (open && !loaded) {
      frame.src = origin + "/widget/" + encodeURIComponent(token);
      loaded = true;
    }

    if (open) frame.focus();
  }

  launcher.addEventListener("click", function () {
    setOpen(panel.getAttribute("data-open") !== "true");
  });

  window.addEventListener("message", function (event) {
    if (event.origin !== origin) return;
    if (event.data && event.data.type === "orqiva:close") setOpen(false);
  });
})();
