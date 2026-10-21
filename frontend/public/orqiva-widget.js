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
    ".orqiva-launcher{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:flex;height:56px;width:56px;align-items:center;justify-content:center;border:0;border-radius:999px;background:#64b5ef;box-shadow:0 16px 40px rgba(2,8,23,.38);color:#fff;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,opacity .18s ease}",
    ".orqiva-launcher:hover{transform:translateY(-2px);box-shadow:0 20px 48px rgba(2,8,23,.48)}",
    ".orqiva-launcher:focus-visible{outline:3px solid #93c5fd;outline-offset:3px}",
    ".orqiva-launcher[hidden]{display:none}",
    ".orqiva-launcher img{height:34px;width:34px;border-radius:999px;background:#fff;padding:2px;object-fit:cover}",
    ".orqiva-launcher svg{height:24px;width:24px}",
    ".orqiva-fallback{display:none}",
    ".orqiva-panel{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:none;height:min(640px,calc(100dvh - 40px));width:min(390px,calc(100vw - 40px));overflow:hidden;border:1px solid rgba(148,163,184,.22);border-radius:12px;background:#17212b;box-shadow:0 30px 80px rgba(2,8,23,.55)}",
    ".orqiva-panel[data-open='true']{display:block}",
    "iframe{height:100%;width:100%;border:0;background:#0e1621}",
    "@media(max-width:640px){.orqiva-launcher{right:16px;bottom:16px}.orqiva-panel{right:0;bottom:0;height:100dvh;width:100vw;border-radius:0}}",
    "@media(prefers-reduced-motion:reduce){.orqiva-launcher{transition:none}}",
    "</style>",
    "<button class='orqiva-launcher' type='button' aria-label='Open chat' aria-expanded='false'>",
    "<img alt='' />",
    "<svg class='orqiva-fallback' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M22 2 11 13'/><path d='M22 2 15 22l-4-9-9-4z'/></svg>",
    "</button>",
    "<div class='orqiva-panel' data-open='false'><iframe title='Chat' loading='lazy'></iframe></div>",
  ].join("");

  var launcher = root.querySelector(".orqiva-launcher");
  var launcherImage = root.querySelector(".orqiva-launcher img");
  var launcherFallback = root.querySelector(".orqiva-fallback");
  var panel = root.querySelector(".orqiva-panel");
  var frame = root.querySelector("iframe");
  var loaded = false;
  var rendered = false;

  launcherImage.src = origin + "/orqiva-mark.png";
  launcherImage.addEventListener("error", function () {
    launcherImage.style.display = "none";
    launcherFallback.style.display = "block";
  });

  function absoluteIcon(path) {
    if (typeof path !== "string" || !path) return origin + "/orqiva-mark.png";
    if (/^https?:\/\//i.test(path)) return path;
    return origin + path;
  }

  function isHex(value) {
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
  }

  function setOpen(open) {
    panel.setAttribute("data-open", String(open));
    launcher.setAttribute("aria-expanded", String(open));
    launcher.hidden = open;
    launcher.setAttribute("aria-label", open ? "Close chat" : "Open chat");

    if (open && !loaded) {
      frame.src = origin + "/widget/" + encodeURIComponent(token);
      loaded = true;
    }

    if (open) frame.focus();
    else launcher.focus({ preventScroll: true });
  }

  function render(config) {
    if (rendered) return;
    rendered = true;

    var accent = isHex(config && config.accent) ? config.accent : "#2b5278";
    var icon = absoluteIcon(config && config.icon);
    var mode = config && config.mode === "always" ? "always" : "manual";

    launcher.style.background = accent;
    launcherImage.src = icon;

    if (mode === "always") {
      setOpen(true);
    }
  }

  launcher.addEventListener("click", function () {
    setOpen(panel.getAttribute("data-open") !== "true");
  });

  window.addEventListener("message", function (event) {
    if (event.origin !== origin) return;
    if (event.data && event.data.type === "orqiva:close") setOpen(false);
  });

  var configKey = "OrqivaEmbedConfig";
  var existing = window[configKey] && window[configKey][token];

  if (existing) {
    render(existing);
    return;
  }

  var timer = window.setTimeout(function () {
    render(null);
  }, 4000);

  var configScript = document.createElement("script");
  configScript.src =
    origin +
    "/api/v1/public/channels/" +
    encodeURIComponent(token) +
    "/embed-config.js";
  configScript.async = true;
  configScript.onload = function () {
    window.clearTimeout(timer);
    var config = window[configKey] && window[configKey][token];
    render(config || null);
  };
  configScript.onerror = function () {
    window.clearTimeout(timer);
    render(null);
  };
  document.head.appendChild(configScript);
})();
