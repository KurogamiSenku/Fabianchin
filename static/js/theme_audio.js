// Música temática por nivel. Lee la pista del atributo data-track del propio <script>.
(function () {
  const src = document.currentScript && document.currentScript.dataset.track;
  if (!src) return;

  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = "auto";

  // volumen y silencio recordados entre visitas
  let vol = parseFloat(localStorage.getItem("ctf_music_vol"));
  if (isNaN(vol)) vol = 0.4;
  let muted = localStorage.getItem("ctf_music_muted") === "1";
  audio.volume = vol;
  audio.muted = muted;

  // Inicio y mapa comparten pista: se retoma donde iba al cambiar de página
  const KEY = "ctf_music_pos:" + src;
  if (document.currentScript.dataset.continue) {
    const pos = parseFloat(sessionStorage.getItem(KEY));
    if (!isNaN(pos)) {
      audio.addEventListener("loadedmetadata", () => {
        if (pos < audio.duration) audio.currentTime = pos;
      }, { once: true });
    }
    window.addEventListener("pagehide", () => {
      try { sessionStorage.setItem(KEY, String(audio.currentTime)); } catch (e) {}
    });
    // intenta sonar de una vez (funciona si el navegador ya lo permite)
    audio.play().catch(() => {});
  }

  // el navegador no deja sonar hasta una interacción del usuario:
  // se arranca en la primera tecla o clic (tu juego ya los captura)
  function unlock() {
    audio.play().catch(() => {});
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("pointerdown", unlock);
  }
  window.addEventListener("keydown", unlock);
  window.addEventListener("pointerdown", unlock);

  // botón flotante de silencio
  function addToggle() {
    const btn = document.createElement("button");
    btn.textContent = muted ? "🔇" : "🔊";
    btn.title = "Música";
    Object.assign(btn.style, {
      position: "fixed", right: "14px", bottom: "14px", zIndex: 9999,
      width: "42px", height: "42px", borderRadius: "8px", cursor: "pointer",
      background: "#11162e", color: "#fff", border: "2px solid #ff2fd6", fontSize: "18px",
    });
    btn.addEventListener("click", () => {
      muted = !muted;
      audio.muted = muted;
      localStorage.setItem("ctf_music_muted", muted ? "1" : "0");
      btn.textContent = muted ? "🔇" : "🔊";
      if (!muted) audio.play().catch(() => {});
    });
    document.body.appendChild(btn);
  }
  if (document.readyState !== "loading") addToggle();
  else document.addEventListener("DOMContentLoaded", addToggle);

  window.themeMusic = audio; // por si quieres bajarle el volumen al abrir un reto
})();