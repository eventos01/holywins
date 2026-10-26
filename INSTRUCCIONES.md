# Guía de Puesta en Marcha: Web Fiesta de Holywins (Parroquia Santa María Micaela)

Todos los archivos del proyecto están listos en la carpeta:
`C:\Users\perezd\.gemini\antigravity\scratch\holywins`

---

## Paso 1: Colocar el cartel con el nombre `cartel-holywins.jpg`
1. Guarda la imagen del cartel en alta resolución dentro de la carpeta del proyecto (`C:\Users\perezd\.gemini\antigravity\scratch\holywins`) con el nombre exacto:
   **`cartel-holywins.jpg`**
   *(Nota: Si abres `index.html` ahora mismo en tu ordenador, ya carga automáticamente la imagen que adjuntaste como respaldo local).*

---

## Paso 2: Conectar tu hoja de Google Sheets (3 minutos)
1. Crea una hoja de cálculo nueva en [Google Sheets](https://sheets.google.com) (puedes llamarla, por ejemplo, **«Asistentes Holywins 2026»**).
2. En el menú superior de Google Sheets, entra en **Extensiones** → **Apps Script**.
3. Borra cualquier línea de código que aparezca en el editor y pega todo el contenido del archivo [`google-apps-script.gs`](./google-apps-script.gs).
4. Pulsa el icono del disquete **Guardar proyecto** (💾).
5. Arriba a la derecha, pulsa el botón azul **Implementar** → **Nueva implementación**.
6. Haz clic en la rueda dentada ⚙️ junto a *"Selecciona el tipo"* y elige **Aplicación web**.
7. Rellena los dos desplegables así:
   - **Ejecutar como:** *Yo (tu correo)*
   - **Quién tiene acceso:** *Cualquier usuario* *(imprescindible para que los feligreses puedan confirmar desde WhatsApp/Telegram sin tener que iniciar sesión).*
8. Pulsa **Implementar**.
   - Si Google te pide **Autorizar acceso**, elige tu cuenta, haz clic en *Configuración avanzada* → *Ir a Proyecto sin título (no seguro)* → *Permitir*.
9. Copia la **URL de la aplicación web** que te dará (empieza por `https://script.google.com/macros/s/...` y termina en `/exec`).
10. Abre el archivo [`app.js`](./app.js) y en la **línea 9** pega esa URL entre las comillas:
    ```javascript
    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/TU_CODIGO_AQUI/exec";
    ```

### ¿Qué verás en tu Google Sheet?
El script creará automáticamente la pestaña **`Respuestas_Holywins`** con:
- **Columnas A a F:** Cada respuesta con su código anónimo aleatorio (`ID_Anonimo`), fecha/hora, opción (`ASISTE` o `NO_ASISTE`), número de `Adultos`, número de `Niños` y total de la fila. Si alguien pulsa **«Quiero hacer cambios»**, se actualiza su misma fila sin duplicar.
- **Columnas H e I (Cuadro Resumen Automático):** Una tabla fija con el **Total Adultos**, **Total Niños**, **TOTAL ASISTENTES** y cuántas respuestas han marcado *«Asistiremos»* o *«No participaremos»*.

---

## Paso 3: Subir a GitHub Pages y difundir por WhatsApp / Telegram
1. Crea un repositorio público en tu cuenta de GitHub (por ejemplo, `holywins`).
2. Sube a la raíz del repositorio estos 4 archivos:
   - `index.html`
   - `styles.css`
   - `app.js` (con tu `GOOGLE_SCRIPT_URL` ya pegada)
   - `cartel-holywins.jpg`
3. En tu repositorio de GitHub, entra en **Settings** → **Pages** (en el menú lateral izquierdo).
4. En **Branch**, selecciona `main` (o `master`) y carpeta `/ (root)`, y pulsa **Save**.
5. En 1 minuto tendrás tu enlace público (p. ej. `https://tu-usuario.github.io/holywins/`), listo para compartir en los grupos de **WhatsApp** y **Telegram**.
