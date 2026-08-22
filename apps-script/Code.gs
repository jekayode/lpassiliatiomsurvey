/**
 * LifePointe — Assimilation Survey backend (v3, static-host edition)
 * Google Apps Script Web App bound to the response Sheet.
 *
 * The form and presentation pages are hosted statically (GitHub Pages) and
 * talk to this script over HTTP:
 *   POST /exec   body = JSON {contributor, items:[{bucket, idea, why, owner, when, measure}]}
 *   GET  /exec   -> JSON {ok:true, count, byBucket:{...}}
 *
 * Deploy: from inside your Google Sheet, Extensions > Apps Script, paste this
 * file, then Deploy > New deployment > Web app (Execute as: Me, Who has
 * access: Anyone). Copy the /exec URL into config.js of the static site.
 */

var SHEET_NAME = 'Responses';
var HEADERS = ['Timestamp', 'Contributor', 'Bucket', 'Idea', 'Why', 'Owner', 'When', 'Measure'];

// The stages of the guided conversation, in the order they are captured.
var VALID_BUCKETS = {
  success:1, journeygap:1, well:1, losing:1,
  exp:1, followup:1, connection:1, discipleship:1, whatif:1,
  quick:1, ninety:1, long:1, vision:1, bigidea:1
};

/** JSON response helper (served with Access-Control-Allow-Origin: * by GAS). */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** GET — returns all responses grouped by bucket. */
function doGet(e) {
  try {
    return json_(getResponses());
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/** POST — accepts one member's submission as a JSON body. */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error('Empty request.');
    var payload = JSON.parse(e.postData.contents);
    var saved = submitResponse(payload);
    return json_({ ok: true, saved: saved });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/** Returns the Responses sheet, creating it with headers on first use. */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/**
 * payload = { contributor: String, items: [ {bucket, idea, why, owner, when, measure} ] }
 * Returns the number of rows written.
 */
function submitResponse(payload) {
  if (!payload || !payload.items || !payload.items.length) {
    throw new Error('Nothing to submit.');
  }
  var name = String(payload.contributor || 'Anonymous').substring(0, 120);
  var now = new Date();
  var rows = [];
  for (var i = 0; i < payload.items.length; i++) {
    var it = payload.items[i] || {};
    var bucket = String(it.bucket || '').toLowerCase();
    var idea = String(it.idea || '').trim();
    if (!VALID_BUCKETS[bucket] || !idea) continue;
    rows.push([
      now,
      name,
      bucket,
      idea.substring(0, 1200),
      String(it.why || '').substring(0, 1000),
      String(it.owner || '').substring(0, 200),
      String(it.when || '').substring(0, 200),
      String(it.measure || '').substring(0, 800)
    ]);
  }
  if (!rows.length) throw new Error('No valid ideas to save.');
  var sh = getSheet_();
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
  return rows.length;
}

/**
 * Returns { ok:true, count, byBucket: { <bucket>: [ {contributor, idea, why, owner, when, measure} ] } }
 */
function getResponses() {
  var sh = getSheet_();
  var last = sh.getLastRow();
  var byBucket = {};
  for (var k in VALID_BUCKETS) byBucket[k] = [];
  var out = { ok: true, count: 0, byBucket: byBucket };
  if (last < 2) return out;
  var values = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    var bucket = String(row[2] || '').toLowerCase();
    if (!out.byBucket[bucket]) continue;
    var idea = String(row[3] || '').trim();
    if (!idea) continue;
    out.byBucket[bucket].push({
      contributor: String(row[1] || ''),
      idea: idea,
      why: String(row[4] || ''),
      owner: String(row[5] || ''),
      when: String(row[6] || ''),
      measure: String(row[7] || '')
    });
    out.count++;
  }
  return out;
}
