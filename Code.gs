/**
 * Guardia Black 2026 · Casaideas — backend en Google Apps Script.
 *
 * Instalación (una sola vez):
 *  1. En el Google Sheet: Extensiones > Apps Script. Pega este archivo completo y guarda.
 *  2. Ejecuta la función `setup` (te pedirá permisos). Crea las pestañas "Turnos" y "Config"
 *     y genera la clave del equipo (menú Guardia > Ver clave del equipo).
 *  3. Implementar > Nueva implementación > Tipo: Aplicación web.
 *     Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario. Copia la URL que termina en /exec.
 *  4. Pega esa URL en config.js (API_URL) del repo.
 *
 * Lectura: pública (cualquiera con el link de la app ve los turnos y el teléfono).
 * Escritura: solo con la clave del equipo (TEAM_KEY en Propiedades del script).
 */

const SHEET_TURNOS = 'Turnos';
const SHEET_CONFIG = 'Config';
const DIAS = ['2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27',
              '2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01'];
const VENTANAS = [
  { id: 'pre',   label: 'Pre-lanzamiento',          inicio: '07:00', fin: '08:00' },
  { id: 'noche', label: 'Estabilización y cierre', inicio: '18:00', fin: '01:00' },
];
const CONFIG_DEFAULT = [
  ['telefono', '+56 9 0000 0000', 'Número de guardia que ve el cliente'],
  ['whatsapp', '56900000000', 'Mismo número, solo dígitos con código país (para el botón de WhatsApp)'],
  ['equipo', 'Delivery Lead, Dev Backend, Dev Frontend, Dev Soporte', 'Nombres separados por coma'],
  ['cliente', 'Casaideas', ''],
  ['evento', 'Black 2026', ''],
];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Guardia')
    .addItem('Ver clave del equipo', 'showKey')
    .addItem('Generar nueva clave', 'rotateKey')
    .addToUi();
}

function setup() {
  const ss = SpreadsheetApp.getActive();
  let t = ss.getSheetByName(SHEET_TURNOS) || ss.insertSheet(SHEET_TURNOS);
  if (t.getLastRow() < 2) {
    t.clear();
    t.getRange('A:F').setNumberFormat('@');
    const rows = [['id', 'fecha', 'ventana', 'horario', 'dev', 'actualizado']];
    DIAS.forEach(d => VENTANAS.forEach(v => rows.push([d + '-' + v.id, d, v.id, v.inicio + ' – ' + v.fin, '', ''])));
    t.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    t.setFrozenRows(1);
    t.getRange('A1:F1').setFontWeight('bold');
  }
  let c = ss.getSheetByName(SHEET_CONFIG) || ss.insertSheet(SHEET_CONFIG);
  if (c.getLastRow() < 2) {
    c.clear();
    c.getRange('A:C').setNumberFormat('@');
    c.getRange(1, 1, 1, 3).setValues([['clave', 'valor', 'nota']]).setFontWeight('bold');
    c.getRange(2, 1, CONFIG_DEFAULT.length, 3).setValues(CONFIG_DEFAULT);
    c.setFrozenRows(1);
  }
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('TEAM_KEY')) props.setProperty('TEAM_KEY', newKey_());
  Logger.log('Clave del equipo: ' + props.getProperty('TEAM_KEY'));
}

function showKey() {
  const k = PropertiesService.getScriptProperties().getProperty('TEAM_KEY') || '(ejecuta setup)';
  SpreadsheetApp.getUi().alert('Clave del equipo', k + '\n\nLink para los devs: <URL de la app>?k=' + k, SpreadsheetApp.getUi().ButtonSet.OK);
}

function rotateKey() {
  PropertiesService.getScriptProperties().setProperty('TEAM_KEY', newKey_());
  showKey();
}

function newKey_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 10);
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = p.action || 'list';
  try {
    if (action === 'list') return out_(list_());
    if (action === 'check') { auth_(p.key); return out_({ ok: true }); }
    if (action === 'assign' || action === 'release') {
      auth_(p.key);
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try { write_(action, p.slot, (p.dev || '').trim()); } finally { lock.releaseLock(); }
      return out_(list_());
    }
    return out_({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    return out_({ ok: false, error: String(err.message || err) });
  }
}

function auth_(key) {
  const k = PropertiesService.getScriptProperties().getProperty('TEAM_KEY');
  if (!k || key !== k) throw new Error('Clave del equipo inválida');
}

function config_() {
  const c = SpreadsheetApp.getActive().getSheetByName(SHEET_CONFIG);
  const cfg = {};
  c.getDataRange().getDisplayValues().slice(1).forEach(r => { if (r[0]) cfg[r[0].trim()] = r[1].trim(); });
  cfg.equipo = (cfg.equipo || '').split(',').map(s => s.trim()).filter(String);
  return cfg;
}

function list_() {
  const t = SpreadsheetApp.getActive().getSheetByName(SHEET_TURNOS);
  const slots = t.getDataRange().getDisplayValues().slice(1).filter(r => r[0]).map(r => ({
    id: r[0], fecha: r[1], ventana: r[2], horario: r[3], dev: r[4], actualizado: r[5],
  }));
  return { ok: true, config: config_(), slots: slots };
}

function write_(action, slotId, dev) {
  const t = SpreadsheetApp.getActive().getSheetByName(SHEET_TURNOS);
  const data = t.getDataRange().getDisplayValues();
  const i = data.findIndex((r, idx) => idx > 0 && r[0] === slotId);
  if (i < 1) throw new Error('Turno no encontrado');
  const actual = data[i][4];
  const stamp = Utilities.formatDate(new Date(), 'America/Santiago', 'yyyy-MM-dd HH:mm');
  if (action === 'assign') {
    if (config_().equipo.indexOf(dev) === -1) throw new Error('Ese nombre no está en el equipo');
    if (actual && actual !== dev) throw new Error('Ese turno ya lo tomó ' + actual);
    t.getRange(i + 1, 5, 1, 2).setValues([[dev, stamp]]);
  } else {
    t.getRange(i + 1, 5, 1, 2).setValues([['', stamp]]);
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
