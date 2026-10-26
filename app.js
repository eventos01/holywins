/**
 * ============================================================================
 * CONFIGURACIÓN DE CONEXIÓN CON GOOGLE SHEETS
 * ============================================================================
 * Pega aquí la URL de tu aplicación web de Google Apps Script (termina en /exec).
 * Mientras esté vacía (""), la web funciona en modo demostración local para que
 * puedas probar todos los botones y el contador inmediatamente.
 */
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxDpYc9bNr7NJCamCNR0oeApIExSvYS4d1tJN8U6G3KawbrwE1xXrXAGH8vFYW6EBoDQA/exec";

// Claves de almacenamiento local (solo en el navegador del usuario, 100% anónimo)
const STORAGE_TOKEN_KEY = "holywins_2026_anon_token";
const STORAGE_CHOICE_KEY = "holywins_2026_choice";
const STORAGE_DEMO_TOTALS_KEY = "holywins_2026_demo_totals";

document.addEventListener("DOMContentLoaded", () => {
  // Referencias del DOM - Zona RSVP
  const alreadyRespondedView = document.getElementById("already-responded-view");
  const respondedSummary = document.getElementById("responded-summary");
  const btnEditResponse = document.getElementById("btn-edit-response");

  const choiceButtonsView = document.getElementById("choice-buttons-view");
  const btnWillAttend = document.getElementById("btn-will-attend");
  const btnWontAttend = document.getElementById("btn-wont-attend");

  const attendeesForm = document.getElementById("attendees-form");
  const inputAdultos = document.getElementById("input-adultos");
  const inputNinos = document.getElementById("input-ninos");
  const formError = document.getElementById("form-error");
  const btnSubmitAttend = document.getElementById("btn-submit-attend");
  const btnCancelForm = document.getElementById("btn-cancel-form");
  const rsvpFeedback = document.getElementById("rsvp-feedback");

  // Referencias del DOM - Zona Contador y Motivación
  const statTotal = document.getElementById("stat-total");
  const statAdultos = document.getElementById("stat-adultos");
  const statNinos = document.getElementById("stat-ninos");
  const lastUpdatedText = document.getElementById("last-updated-text");

  const motivationBanner = document.getElementById("motivation-banner");
  const motivationIcon = document.getElementById("motivation-icon");
  const motivationTitle = document.getElementById("motivation-title");
  const motivationMessage = document.getElementById("motivation-message");
  const partyMeterFill = document.getElementById("party-meter-fill");

  const ratioWrapper = document.getElementById("ratio-Wrapper");
  const ratioAdultos = document.getElementById("ratio-adultos");
  const ratioNinos = document.getElementById("ratio-ninos");
  const pctAdultos = document.getElementById("pct-adultos");
  const pctNinos = document.getElementById("pct-ninos");

  const btnRefreshStats = document.getElementById("btn-refresh-stats");
  const refreshIcon = document.getElementById("refresh-icon");
  const refreshText = document.getElementById("refresh-text");

  // 1. Obtener o generar el token anónimo aleatorio para este navegador
  function getOrCreateAnonToken() {
    let token = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (!token) {
      const randomPart = Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4);
      token = "hw-" + randomPart;
      localStorage.setItem(STORAGE_TOKEN_KEY, token);
    }
    return token;
  }

  // 2. Leer la respuesta previa guardada en este navegador (si existe)
  function getSavedChoice() {
    try {
      const raw = localStorage.getItem(STORAGE_CHOICE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveChoiceLocally(choice) {
    localStorage.setItem(STORAGE_CHOICE_KEY, JSON.stringify(choice));
  }

  // 3. Mostrar la vista adecuada según si el usuario ya respondió o no
  function renderRsvpState(isEditing = false) {
    const saved = getSavedChoice();
    formError.classList.add("hidden");

    if (saved && !isEditing) {
      // Ya comunicó su opción: mostrar aviso + botón "Quiero hacer cambios"
      alreadyRespondedView.classList.remove("hidden");
      choiceButtonsView.classList.add("hidden");
      attendeesForm.classList.add("hidden");

      if (saved.status === "ASISTE") {
        const textoAdultos = saved.adultos === 1 ? "1 adulto" : `${saved.adultos} adultos`;
        const textoNinos = saved.ninos === 1 ? "1 niño" : `${saved.ninos} niños`;
        respondedSummary.textContent = `Asistiremos: ${textoAdultos} y ${textoNinos} (${saved.adultos + saved.ninos} en total)`;
      } else {
        respondedSummary.textContent = "Opción registrada: No participaremos en esta ocasión.";
      }
    } else {
      // Primera vez o pulsó "Quiero hacer cambios"
      alreadyRespondedView.classList.add("hidden");
      choiceButtonsView.classList.remove("hidden");
      attendeesForm.classList.add("hidden");

      // Si tenía datos previos de asistencia, precargarlos en los contadores por comodidad
      if (saved && saved.status === "ASISTE") {
        inputAdultos.value = saved.adultos;
        inputNinos.value = saved.ninos;
      } else {
        inputAdultos.value = 1;
        inputNinos.value = 1;
      }
    }
  }

  // 4. Botones + y - para Adultos y Niños
  document.querySelectorAll(".stepper-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const action = btn.getAttribute("data-action");
      const input = document.getElementById(targetId);
      if (!input) return;

      let current = parseInt(input.value, 10) || 0;
      if (action === "increment" && current < 50) {
        current += 1;
      } else if (action === "decrement" && current > 0) {
        current -= 1;
      }
      input.value = current;
      formError.classList.add("hidden");
    });
  });

  // 5. Eventos de los botones de decisión
  btnWillAttend.addEventListener("click", () => {
    rsvpFeedback.classList.add("hidden");
    choiceButtonsView.classList.add("hidden");
    attendeesForm.classList.remove("hidden");
  });

  btnCancelForm.addEventListener("click", () => {
    formError.classList.add("hidden");
    const saved = getSavedChoice();
    if (saved) {
      renderRsvpState(false);
    } else {
      attendeesForm.classList.add("hidden");
      choiceButtonsView.classList.remove("hidden");
    }
  });

  btnEditResponse.addEventListener("click", () => {
    rsvpFeedback.classList.add("hidden");
    renderRsvpState(true);
  });

  // 6. Enviar opción "No participaremos"
  btnWontAttend.addEventListener("click", async () => {
    await submitResponse({
      status: "NO_ASISTE",
      adultos: 0,
      ninos: 0
    });
  });

  // 7. Enviar formulario "¡Asistiremos!" con número de adultos y niños
  attendeesForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const adultos = Math.max(0, parseInt(inputAdultos.value, 10) || 0);
    const ninos = Math.max(0, parseInt(inputNinos.value, 10) || 0);

    if (adultos + ninos <= 0) {
      formError.classList.remove("hidden");
      return;
    }

    formError.classList.add("hidden");
    await submitResponse({
      status: "ASISTE",
      adultos,
      ninos
    });
  });

  // 8. Función para guardar o actualizar en Google Sheets y refrescar el contador
  async function submitResponse({ status, adultos, ninos }) {
    const token = getOrCreateAnonToken();
    const previousChoice = getSavedChoice();
    const isUpdate = Boolean(previousChoice);

    setButtonsDisabled(true);
    showFeedback(
      isUpdate ? "Actualizando vuestra respuesta en la hoja..." : "Guardando vuestra respuesta...",
      "warning"
    );

    try {
      let updatedStats;

      if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        // Envío a Google Apps Script (sin preflight CORS usando text/plain)
        const payload = {
          action: "save",
          token,
          status,
          adultos,
          ninos
        };

        const response = await fetch(GOOGLE_SCRIPT_URL.trim(), {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error("Error de red al conectar con Google Sheets");
        }

        const data = await response.json();
        if (!data || !data.ok) {
          throw new Error(data?.error || "Respuesta no válida de Google Sheets");
        }

        updatedStats = {
          adultos: Number(data.adultos) || 0,
          ninos: Number(data.ninos) || 0,
          total: Number(data.total) || 0
        };
      } else {
        // Modo demostración local si aún no se ha pegado la URL de Google Sheets
        updatedStats = updateDemoStats(previousChoice, { status, adultos, ninos });
      }

      // Guardar la elección actual en el navegador del usuario
      saveChoiceLocally({
        status,
        adultos,
        ninos,
        updatedAt: new Date().toISOString()
      });

      // Actualizar vista de botones y estadísticas al pie
      renderRsvpState(false);
      renderStatsUI(updatedStats);

      if (status === "ASISTE") {
        showFeedback(
          isUpdate
            ? "✨ ¡Cambios guardados! Hemos actualizado vuestro número de asistentes."
            : "🎉 ¡Muchas gracias! Os esperamos el 31 de octubre en la fiesta de Holywins.",
          "success"
        );
      } else {
        showFeedback(
          isUpdate
            ? "Hemos actualizado tu opción a «No participaremos». ¡Gracias por avisar!"
            : "Hemos anotado que no podréis participar. ¡Gracias por responder!",
          "success"
        );
      }
    } catch (error) {
      console.error("Error al guardar respuesta:", error);
      showFeedback(
        "No se pudo conectar en este momento. Por favor, revisa tu conexión e inténtalo de nuevo.",
        "warning"
      );
    } finally {
      setButtonsDisabled(false);
    }
  }

  // 9. Obtener totales actualizados desde Google Sheets
  async function fetchCurrentStats() {
    setRefreshLoading(true);
    try {
      let stats;
      if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== "") {
        const separator = GOOGLE_SCRIPT_URL.includes("?") ? "&" : "?";
        const url = `${GOOGLE_SCRIPT_URL.trim()}${separator}action=getTotals&t=${Date.now()}`;
        const response = await fetch(url, { method: "GET", cache: "no-store" });
        if (!response.ok) throw new Error("Error al consultar asistentes");
        const data = await response.json();
        stats = {
          adultos: Number(data.adultos) || 0,
          ninos: Number(data.ninos) || 0,
          total: Number(data.total) || 0
        };
      } else {
        stats = getDemoStats();
      }
      renderStatsUI(stats);
    } catch (error) {
      console.error("Error al actualizar asistentes:", error);
      lastUpdatedText.textContent = "Sin conexión temporal";
    } finally {
      setRefreshLoading(false);
    }
  }

  // 10. Renderizar los datos y el motivador visual dinámico al pie de la web
  function renderStatsUI({ adultos, ninos, total }) {
    const safeAdultos = Math.max(0, Number(adultos) || 0);
    const safeNinos = Math.max(0, Number(ninos) || 0);
    const safeTotal = Math.max(0, Number(total) || safeAdultos + safeNinos);

    statTotal.textContent = safeTotal;
    statAdultos.textContent = safeAdultos;
    statNinos.textContent = safeNinos;

    const now = new Date();
    const horaStr = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    lastUpdatedText.textContent =
      GOOGLE_SCRIPT_URL.trim() !== ""
        ? `Actualizado a las ${horaStr}`
        : `Modo prueba local · ${horaStr}`;

    // Proporción visual Adultos vs Niños
    if (safeTotal > 0) {
      ratioWrapper.classList.remove("hidden");
      const pAdultos = Math.round((safeAdultos / safeTotal) * 100);
      const pNinos = 100 - pAdultos;
      ratioAdultos.style.width = `${pAdultos}%`;
      ratioNinos.style.width = `${pNinos}%`;
      pctAdultos.textContent = `${pAdultos}%`;
      pctNinos.textContent = `${pNinos}%`;
    } else {
      ratioWrapper.classList.add("hidden");
    }

    // Lógica de motivación visual según cantidad de participantes
    motivationBanner.classList.remove("level-low", "level-medium", "level-high", "level-mega");

    // Calcular llenado visual del termómetro festivo (mínimo 10% para motivar, 100% a los 100 participantes)
    const meterPercent = safeTotal === 0 ? 10 : Math.min(100, Math.max(16, Math.round((safeTotal / 100) * 100)));
    partyMeterFill.style.width = `${meterPercent}%`;

    if (safeTotal === 0) {
      motivationBanner.classList.add("level-low");
      motivationIcon.textContent = "🌱";
      motivationTitle.textContent = "¡Estrenamos la lista de Holywins!";
      motivationMessage.textContent =
        "Aún no hay apuntados. ¡Sed los primeros en confirmar vuestra asistencia para animar a toda la parroquia!";
    } else if (safeTotal <= 15) {
      motivationBanner.classList.add("level-low");
      motivationIcon.textContent = "🕯️";
      motivationTitle.textContent = "¡Los primeros santos ya están listos!";
      motivationMessage.textContent = `Ya somos ${safeTotal} participantes. ¡Apúntate tú también para que el grupo crezca y vivamos un día inolvidable!`;
    } else if (safeTotal <= 45) {
      motivationBanner.classList.add("level-medium");
      motivationIcon.textContent = "✨";
      motivationTitle.textContent = "¡Esto se está animando muchísimo!";
      motivationMessage.textContent = `¡Qué alegría! Ya contamos con ${safeAdultos} adultos y ${safeNinos} niños preparados para compartir bocata, juegos y disfraces.`;
    } else if (safeTotal <= 85) {
      motivationBanner.classList.add("level-high");
      motivationIcon.textContent = "🎉";
      motivationTitle.textContent = "¡Se viene una gran fiesta parroquial!";
      motivationMessage.textContent = `¡Ya somos ${safeTotal} personas confirmadas! La Parroquia Santa María Micaela va a llenarse de santos y alegría.`;
    } else {
      motivationBanner.classList.add("level-mega");
      motivationIcon.textContent = "🌟";
      motivationTitle.textContent = "¡Menudo fiestón de Holywins nos espera!";
      motivationMessage.textContent = `¡Impresionante! Más de ${safeTotal} asistentes confirmados. ¡Prepara tu mejor disfraz de santo y tu bocata!`;
    }
  }

  // Auxiliares para modo de prueba local (antes de conectar la URL de Google Sheets)
  function getDemoStats() {
    try {
      const raw = localStorage.getItem(STORAGE_DEMO_TOTALS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // ignorar
    }
    return { adultos: 0, ninos: 0, total: 0 };
  }

  function updateDemoStats(previousChoice, newChoice) {
    const current = getDemoStats();
    let adultos = current.adultos;
    let ninos = current.ninos;

    if (previousChoice && previousChoice.status === "ASISTE") {
      adultos = Math.max(0, adultos - (Number(previousChoice.adultos) || 0));
      ninos = Math.max(0, ninos - (Number(previousChoice.ninos) || 0));
    }

    if (newChoice.status === "ASISTE") {
      adultos += Number(newChoice.adultos) || 0;
      ninos += Number(newChoice.ninos) || 0;
    }

    const updated = { adultos, ninos, total: adultos + ninos };
    localStorage.setItem(STORAGE_DEMO_TOTALS_KEY, JSON.stringify(updated));
    return updated;
  }

  function setButtonsDisabled(disabled) {
    btnWillAttend.disabled = disabled;
    btnWontAttend.disabled = disabled;
    btnSubmitAttend.disabled = disabled;
    btnCancelForm.disabled = disabled;
    btnEditResponse.disabled = disabled;
  }

  function showFeedback(message, type) {
    rsvpFeedback.textContent = message;
    rsvpFeedback.className = `rsvp-feedback ${type}`;
    rsvpFeedback.classList.remove("hidden");
  }

  function setRefreshLoading(isLoading) {
    btnRefreshStats.disabled = isLoading;
    if (isLoading) {
      refreshIcon.classList.add("spinning");
      refreshText.textContent = "Actualizando...";
    } else {
      refreshIcon.classList.remove("spinning");
      refreshText.textContent = "Actualizar asistentes";
    }
  }

  // Botón "Actualizar asistentes"
  btnRefreshStats.addEventListener("click", () => {
    fetchCurrentStats();
  });

  // Inicialización al cargar la página
  renderRsvpState(false);
  fetchCurrentStats();
});
