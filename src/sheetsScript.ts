// Google Apps Script the user pastes into their sheet (Extensions → Apps Script).
// SpendTrack posts its full data to it; the script rewrites three tabs so the
// sheet always mirrors the app. Kept here so the app can show and share it.
export const SHEETS_SCRIPT = `/**
 * SpendTrack → Google Sheets sync
 *
 * Setup: Deploy → New deployment → type "Web app"
 *   Execute as: Me    Who has access: Anyone
 * then paste the Web app URL into SpendTrack (☰ → Google Sheets sync).
 *
 * The first device that connects is remembered by its secret code; others are
 * refused. To connect a new phone, run resetSecret() once from this editor.
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var body = JSON.parse(e.postData.contents);
    var props = PropertiesService.getScriptProperties();
    var known = props.getProperty('SECRET');
    if (!body.secret) return reply({ ok: false, error: 'Missing secret' });
    if (!known) props.setProperty('SECRET', body.secret);
    else if (known !== body.secret) return reply({ ok: false, error: 'This sheet is linked to another device. Run resetSecret() in Apps Script to relink.' });
    if (body.action === 'ping') return reply({ ok: true, sheet: SpreadsheetApp.getActiveSpreadsheet().getName() });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    write(ss, 'Entries',
      ['Date', 'Time', 'Day', 'Type', 'Description', 'Category', 'Amount (PHP)', 'Repeats monthly', 'ID'],
      body.entries.map(function (r) {
        return [toDate(r.date), r.time, r.day, r.type, r.item, r.category, r.amount, r.recurring ? 'Yes' : '', r.id];
      }),
      { 1: 'yyyy-mm-dd', 7: '₱#,##0.00' });
    write(ss, 'Daily',
      ['Date', 'Day', 'Spent', 'Income', 'Net', 'Entries'],
      body.daily.map(function (d) { return [toDate(d.date), d.day, d.spent, d.income, d.income - d.spent, d.count]; }),
      { 1: 'yyyy-mm-dd', 3: '₱#,##0.00', 4: '₱#,##0.00', 5: '₱#,##0.00' });
    write(ss, 'Monthly',
      ['Month', 'Spent', 'Income', 'Saved', 'Top category'],
      body.monthly.map(function (m) { return [m.month, m.spent, m.income, m.income - m.spent, m.top]; }),
      { 2: '₱#,##0.00', 3: '₱#,##0.00', 4: '₱#,##0.00' });
    return reply({ ok: true, rows: body.entries.length });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function write(ss, name, header, rows, formats) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold');
  sh.setFrozenRows(1);
  if (rows.length) {
    sh.getRange(2, 1, rows.length, header.length).setValues(rows);
    Object.keys(formats).forEach(function (col) {
      sh.getRange(2, Number(col), rows.length, 1).setNumberFormat(formats[col]);
    });
  }
}

function toDate(s) {
  var p = s.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function resetSecret() {
  PropertiesService.getScriptProperties().deleteProperty('SECRET');
}
`;
