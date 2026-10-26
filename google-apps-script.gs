/**
 * ============================================================================
 * CÓDIGO GOOGLE APPS SCRIPT - FIESTA DE HOLYWINS (PARROQUIA SANTA MARÍA MICAELA)
 * ============================================================================
 * Instrucciones rápidas:
 * 1. Abre tu hoja de cálculo de Google (Google Sheets).
 * 2. En el menú superior, pulsa en "Extensiones" > "Apps Script".
 * 3. Borra cualquier código que aparezca y pega este archivo completo.
 * 4. Pulsa el icono de Guardar (💾) y luego arriba a la derecha en
 *    "Implementar" > "Nueva implementación".
 * 5. En "Selecciona el tipo" (icono de engranaje ⚙️), elige "Aplicación web".
 * 6. Configura:
 *    - Ejecutar como: "Yo" (tu cuenta)
 *    - Quién tiene acceso: "Cualquier usuario"
 * 7. Pulsa "Implementar", autoriza el acceso y copia la URL de la aplicación web
 *    para pegarla en la constante GOOGLE_SCRIPT_URL de tu archivo app.js.
 */

const SHEET_NAME = "Respuestas_Holywins";

/**
 * Atiende peticiones GET (lectura de totales al abrir la web o pulsar "Actualizar asistentes")
 */
function doGet(e) {
  try {
    const sheet = getOrInitSheet();
    const totals = calculateTotals(sheet);
    return buildJsonResponse({
      ok: true,
      adultos: totals.adultos,
      ninos: totals.ninos,
      total: totals.total,
      familiasAsisten: totals.familiasAsisten,
      noAsisten: totals.noAsisten
    });
  } catch (err) {
    return buildJsonResponse({
      ok: false,
      error: err.toString()
    });
  }
}

/**
 * Atiende peticiones POST (confirmación nueva o "Quiero hacer cambios")
 * Usa LockService para garantizar un conteo 100% exacto y no errático aunque
 * varias personas confirmen en el mismo segundo desde WhatsApp o Telegram.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Espera hasta 15 segundos si otra respuesta se está guardando en ese milisegundo
    lock.waitLock(15000);

    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    const payload = JSON.parse(rawBody);

    const token = String(payload.token || "").trim();
    const status = payload.status === "NO_ASISTE" ? "NO_ASISTE" : "ASISTE";
    const adultos = status === "ASISTE" ? Math.max(0, parseInt(payload.adultos, 10) || 0) : 0;
    const ninos = status === "ASISTE" ? Math.max(0, parseInt(payload.ninos, 10) || 0) : 0;
    const totalFila = adultos + ninos;

    if (!token) {
      return buildJsonResponse({ ok: false, error: "Falta código anónimo de sesión." });
    }

    const sheet = getOrInitSheet();
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");

    // Buscar si el token anónimo ya existe en la Columna A (para "Quiero hacer cambios")
    const lastRow = sheet.getLastRow();
    let targetRow = -1;

    if (lastRow >= 2) {
      const tokenColumnValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < tokenColumnValues.length; i++) {
        if (String(tokenColumnValues[i][0]).trim() === token) {
          targetRow = i + 2; // +2 porque empezamos en la fila 2
          break;
        }
      }
    }

    const rowData = [token, timestamp, status, adultos, ninos, totalFila];

    if (targetRow !== -1) {
      // Actualizar la fila existente (el usuario pulsó "Quiero hacer cambios")
      sheet.getRange(targetRow, 1, 1, 6).setValues([rowData]);
    } else {
      // Añadir nueva fila al final de la tabla de registros
      sheet.appendRow(rowData);
    }

    SpreadsheetApp.flush();

    // Calcular totales exactos actualizados y actualizar también el cuadro resumen de la hoja
    const totals = calculateTotals(sheet);
    updateSummaryBox(sheet, totals);

    return buildJsonResponse({
      ok: true,
      updated: targetRow !== -1,
      adultos: totals.adultos,
      ninos: totals.ninos,
      total: totals.total,
      familiasAsisten: totals.familiasAsisten,
      noAsisten: totals.noAsisten
    });
  } catch (err) {
    return buildJsonResponse({
      ok: false,
      error: err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Obtiene la hoja o la crea con cabeceras y cuadro resumen si aún no existe
 */
function getOrInitSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    // Cabeceras de las columnas A - F
    const headers = [
      "ID_Anonimo",
      "Fecha_Hora_Actualizacion",
      "Opcion",
      "Adultos",
      "Ninos",
      "Total_Fila"
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#844d79")
      .setFontColor("#ffffff");
    sheet.setFrozenRows(1);

    // Crear cuadro resumen visual en las columnas H e I
    updateSummaryBox(sheet, { adultos: 0, ninos: 0, total: 0, familiasAsisten: 0, noAsisten: 0 });
  }

  return sheet;
}

/**
 * Recorre todas las filas registradas y suma de forma determinista y sin errores
 * los adultos y niños de quienes tienen estado "ASISTE".
 */
function calculateTotals(sheet) {
  const lastRow = sheet.getLastRow();
  let adultos = 0;
  let ninos = 0;
  let familiasAsisten = 0;
  let noAsisten = 0;

  if (lastRow >= 2) {
    const data = sheet.getRange(2, 3, lastRow - 1, 3).getValues(); // Columnas C (Opcion), D (Adultos), E (Ninos)
    for (let i = 0; i < data.length; i++) {
      const estado = String(data[i][0]).trim();
      const numAdultos = Math.max(0, parseInt(data[i][1], 10) || 0);
      const numNinos = Math.max(0, parseInt(data[i][2], 10) || 0);

      if (estado === "ASISTE") {
        adultos += numAdultos;
        ninos += numNinos;
        familiasAsisten += 1;
      } else if (estado === "NO_ASISTE") {
        noAsisten += 1;
      }
    }
  }

  return {
    adultos: adultos,
    ninos: ninos,
    total: adultos + ninos,
    familiasAsisten: familiasAsisten,
    noAsisten: noAsisten
  };
}

/**
 * Actualiza un cuadro resumen fijo en las columnas H e I de la propia hoja de cálculo
 * para que puedas consultar el recuento de un vistazo al abrir Google Sheets.
 */
function updateSummaryBox(sheet, totals) {
  const summaryValues = [
    ["RESUMEN HOLYWINS", "CANTIDAD"],
    ["Total Adultos", totals.adultos],
    ["Total Niños", totals.ninos],
    ["TOTAL ASISTENTES", totals.total],
    ["Respuestas «Asistiremos»", totals.familiasAsisten],
    ["Respuestas «No participaremos»", totals.noAsisten]
  ];

  sheet.getRange(1, 8, summaryValues.length, 2).setValues(summaryValues);
  sheet.getRange(1, 8, 1, 2).setFontWeight("bold").setBackground("#527396").setFontColor("#ffffff");
  sheet.getRange(4, 8, 1, 2).setFontWeight("bold").setBackground("#f5ebf3");
}

/**
 * Devuelve una respuesta JSON compatible con llamadas CORS desde GitHub Pages
 */
function buildJsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
