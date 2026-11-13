# Guardia Black 2026 · Casaideas × Propultech

App para que el equipo de Propultech se anote en los turnos de guardia del Black de Casaideas (24 nov – 01 dic 2026) y para que el cliente vea quién está de guardia y el número de contacto.

- **Ventanas:** cada día de 07:00 a 08:00 (pre-lanzamiento) y de 18:00 a 01:00 (estabilización y cierre), hora de Chile. Son 16 turnos y cubre 1 persona por ventana.
- **Cliente:** abre el link normal y solo puede ver los turnos.
- **Equipo:** abre el link con `?k=CLAVE` y puede anotarse o liberar turnos.
- **Datos:** quedan en un Google Sheet de Propultech, que expone los turnos con Apps Script. El repo no guarda la clave.

## Puesta en marcha

1. **Crea el Sheet.** Crea un Google Sheet nuevo, por ejemplo *Guardia Black 2026 · Casaideas*.
2. **Agrega el backend.** En el Sheet, ve a *Extensiones → Apps Script*, borra lo que trae y pega [`apps-script/Code.gs`](apps-script/Code.gs). Guarda.
3. **Ejecuta `setup`.** Selecciona la función `setup` y pulsa *Ejecutar*. Te pedirá que aceptes los permisos. Esto crea las pestañas **Turnos** y **Config** y genera la clave del equipo.
4. **Completa la pestaña Config** con el teléfono de guardia, el WhatsApp (solo dígitos, ej. `56912345678`) y los nombres del equipo separados por coma.
5. **Publica el backend.** Ve a *Implementar → Nueva implementación → Aplicación web*, con *Ejecutar como: Yo* y *Quién tiene acceso: Cualquier usuario*. Copia la URL que termina en `/exec`.
6. **Conecta la app.** Pega esa URL en [`config.js`](config.js), en `API_URL`, y haz commit. GitHub Pages se actualiza en 1–2 minutos.
7. **Comparte los links.** Para ver la clave, recarga el Sheet y abre el menú *Guardia → Ver clave del equipo*.
   - Cliente: `https://benjaminbeltran-source.github.io/guardia-black-casaideas/`
   - Equipo: `https://benjaminbeltran-source.github.io/guardia-black-casaideas/?k=CLAVE`

Si la clave se filtra, usa *Guardia → Generar nueva clave* y comparte el link nuevo con el equipo.

## Notas

- **Cambios en el código del Apps Script:** después de editarlo, ve a *Implementar → Gestionar implementaciones → Editar → Nueva versión* para que la URL `/exec` sirva la versión nueva.
- **Cambios de nombres o teléfono:** se hacen directo en la pestaña **Config**, sin tocar el código.
- **Modo demo:** mientras `API_URL` esté vacío, la app muestra datos de ejemplo.
- **Privacidad:** el sitio es público. Muestra solo el número de guardia y los nombres del equipo, y le pide a los buscadores que no lo indexen (`noindex`).
