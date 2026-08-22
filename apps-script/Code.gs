/**
 * LifePointe — Multi-team Breakout backend (v4)
 * Google Apps Script Web App bound to ONE workbook; each team writes to its own
 * tab (Responses_<team>). Static pages talk to it over HTTP:
 *   POST /exec                         body = {team, contributor, items:[...]}
 *   GET  /exec?action=responses&team=X -> {ok, count, byBucket:{...}}
 *   GET  /exec?action=counts           -> {ok, counts:{team:n,...}}
 *   GET  /exec?action=summarize&team=X -> {ok, team, slides:{...}}   (Gemini)
 *
 * Setup:
 *   1. Extensions > Apps Script, paste this file.
 *   2. Project Settings > Script properties: add GEMINI_API_KEY = <your key>
 *      (free key from https://aistudio.google.com/apikey). Needed only for the
 *      AI summaries; submissions/reads work without it.
 *   3. Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
 *      To update later: Deploy > Manage deployments > New version (URL stays).
 */

var HEADERS = ['Timestamp', 'Contributor', 'Bucket', 'Idea', 'Why', 'Owner', 'When', 'Measure'];

// Must match the team ids in teams.js on the static site.
var TEAMS = {
  assimilation: 'Assimilation',
  missions:     'Missions',
  discipleship: 'Discipleship',
  lifegroups:   'Life Groups'
};

var VALID_BUCKETS = {
  success:1, journeygap:1, well:1, losing:1,
  exp:1, followup:1, connection:1, discipleship:1, whatif:1,
  quick:1, ninety:1, long:1, vision:1, bigidea:1
};

var SUMMARY_SECTIONS = [
  ['losing','Where we lose people'], ['journeygap','Journey gaps'],
  ['success','The finish line'], ['well','What we do well'],
  ['exp','Radical: Experience'], ['followup','Radical: Follow-up'],
  ['connection','Radical: Connection'], ['discipleship','Radical: Discipleship'],
  ['whatif','What if... ideas'], ['quick','Quick wins (7-14 days)'],
  ['ninety','90-day priorities'], ['long','Long-term (12-24 months)'],
  ['vision','Vision sentences'], ['bigidea','The one big idea']
];

var GEMINI_MODEL = 'gemini-2.0-flash';

/* ------------------------------------------------------------------ */
/* Web app entry points                                               */
/* ------------------------------------------------------------------ */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var action = (p.action || 'responses').toLowerCase();
    if (action === 'counts') return json_({ ok: true, counts: getCounts_() });
    if (action === 'summarize') return json_({ ok: true, team: normTeam_(p.team), slides: summarizeTeam_(p.team, p.fresh === '1') });
    return json_(getResponses(normTeam_(p.team)));
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

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

/* ------------------------------------------------------------------ */
/* Storage (one tab per team)                                         */
/* ------------------------------------------------------------------ */

function normTeam_(team) {
  var t = String(team || '').toLowerCase();
  if (!TEAMS[t]) throw new Error('Unknown team: "' + team + '".');
  return t;
}

function sheetForTeam_(team) {
  var name = 'Responses_' + normTeam_(team);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function submitResponse(payload) {
  if (!payload || !payload.items || !payload.items.length) throw new Error('Nothing to submit.');
  var team = normTeam_(payload.team);
  var name = String(payload.contributor || 'Anonymous').substring(0, 120);
  var now = new Date();
  var rows = [];
  for (var i = 0; i < payload.items.length; i++) {
    var it = payload.items[i] || {};
    var bucket = String(it.bucket || '').toLowerCase();
    var idea = String(it.idea || '').trim();
    if (!VALID_BUCKETS[bucket] || !idea) continue;
    rows.push([now, name, bucket, idea.substring(0, 1200),
      String(it.why || '').substring(0, 1000), String(it.owner || '').substring(0, 200),
      String(it.when || '').substring(0, 200), String(it.measure || '').substring(0, 800)]);
  }
  if (!rows.length) throw new Error('No valid ideas to save.');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheetForTeam_(team);
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
  } finally {
    lock.releaseLock();
  }
  return rows.length;
}

function getResponses(team) {
  var sh = sheetForTeam_(team);
  var last = sh.getLastRow();
  var byBucket = {};
  for (var k in VALID_BUCKETS) byBucket[k] = [];
  var out = { ok: true, team: normTeam_(team), count: 0, byBucket: byBucket };
  if (last < 2) return out;
  var values = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    var bucket = String(row[2] || '').toLowerCase();
    if (!out.byBucket[bucket]) continue;
    var idea = String(row[3] || '').trim();
    if (!idea) continue;
    out.byBucket[bucket].push({
      contributor: String(row[1] || ''), idea: idea, why: String(row[4] || ''),
      owner: String(row[5] || ''), when: String(row[6] || ''), measure: String(row[7] || '')
    });
    out.count++;
  }
  return out;
}

function getCounts_() {
  var counts = {};
  Object.keys(TEAMS).forEach(function (t) {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Responses_' + t);
    counts[t] = (sh && sh.getLastRow() > 1) ? sh.getLastRow() - 1 : 0;
  });
  return counts;
}

/* ------------------------------------------------------------------ */
/* Gemini AI summary                                                  */
/* ------------------------------------------------------------------ */

function summarizeTeam_(team, fresh) {
  team = normTeam_(team);
  var cache = CacheService.getScriptCache();
  var cacheKey = 'sum_' + team;
  if (!fresh) {
    var hit = cache.get(cacheKey);
    if (hit) return JSON.parse(hit);
  }
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY is not set in Script properties.');

  var data = getResponses(team);
  if (!data.count) throw new Error('No submissions yet for ' + TEAMS[team] + '.');

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + encodeURIComponent(key);
  var body = {
    contents: [{ parts: [{ text: buildPrompt_(team, data) }] }],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          problem: { type: 'STRING' },
          vision: { type: 'STRING' },
          journeyLeaks: { type: 'ARRAY', items: { type: 'STRING' } },
          quickWins: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
            idea: { type: 'STRING' }, owner: { type: 'STRING' }, when: { type: 'STRING' }, measure: { type: 'STRING' } } } },
          ninety: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
            idea: { type: 'STRING' }, owner: { type: 'STRING' }, when: { type: 'STRING' }, measure: { type: 'STRING' } } } },
          longTerm: { type: 'ARRAY', items: { type: 'STRING' } },
          bigIdea: { type: 'OBJECT', properties: { idea: { type: 'STRING' }, because: { type: 'STRING' } } }
        }
      }
    }
  };
  var res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify(body), muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var txt = res.getContentText();
  if (code !== 200) throw new Error('Gemini ' + code + ': ' + txt.substring(0, 300));
  var parsed = JSON.parse(txt);
  var slidesText = parsed.candidates[0].content.parts[0].text;
  var slides = JSON.parse(slidesText);
  cache.put(cacheKey, JSON.stringify(slides), 900); // 15 min
  return slides;
}

function buildPrompt_(team, data) {
  var lines = [];
  lines.push('You are helping the "' + TEAMS[team] + '" breakout team at a church leadership retreat turn their brainstorm into a sharp 10-minute presentation.');
  lines.push('Objective: "If we radically transformed ' + TEAMS[team] + ' across the network, what would be noticeably different?"');
  lines.push('');
  lines.push('Below are the raw responses submitted by team members, grouped by category. Synthesize them faithfully — do NOT invent ideas that were not submitted; merge duplicates; keep the church leadership tone; be concrete and concise.');
  lines.push('');
  SUMMARY_SECTIONS.forEach(function (sec) {
    var items = data.byBucket[sec[0]] || [];
    if (!items.length) return;
    lines.push('## ' + sec[1]);
    items.forEach(function (it) {
      var extra = [it.why, it.owner, it.when, it.measure].filter(String).join(' | ');
      lines.push('- ' + it.idea + (extra ? '  (' + extra + ')' : ''));
    });
    lines.push('');
  });
  lines.push('Produce a JSON object for the slides with:');
  lines.push('- problem: one sentence naming the biggest gap this team identified.');
  lines.push('- vision: one bold sentence completing "In a radically transformed ' + TEAMS[team] + ', ..." ');
  lines.push('- journeyLeaks: up to 3 short phrases for the leakiest stage hand-offs (from Journey gaps).');
  lines.push('- quickWins: up to 3 items (idea; and owner/when/measure only if present in the data).');
  lines.push('- ninety: up to 3 items (idea; owner/when/measure if present).');
  lines.push('- longTerm: up to 3 short phrases.');
  lines.push('- bigIdea: the single most game-changing move {idea, because}.');
  return lines.join('\n');
}

function checkGeminiKey() {
  var k = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  Logger.log(k ? 'GEMINI_API_KEY is set (' + k.length + ' chars).' : 'GEMINI_API_KEY is NOT set.');
}

/* ------------------------------------------------------------------ */
/* Summary tabs (one per team) via menu                               */
/* ------------------------------------------------------------------ */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Breakouts')
    .addItem('Rebuild all summaries', 'buildAllSummaries')
    .addItem('Check Gemini key', 'checkGeminiKey')
    .addToUi();
}

function buildAllSummaries() {
  var built = 0;
  Object.keys(TEAMS).forEach(function (t) {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Responses_' + t);
    if (sh && sh.getLastRow() > 1) { buildSummaryFor_(t); built++; }
  });
  SpreadsheetApp.getActiveSpreadsheet().toast('Rebuilt summaries for ' + built + ' team(s).', 'Breakouts', 4);
}

function buildSummaryFor_(team) {
  var data = getResponses(team).byBucket;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = 'Summary_' + team;
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  var rows = [];
  rows.push([TEAMS[team] + ' — summary', '', '', '', '', '']);
  rows.push(['Rebuilt ' + new Date().toLocaleString(), '', '', '', '', '']);
  rows.push(['Idea', 'By', 'Why', 'Owner', 'When / Scope', 'Measure']);
  var sectionRows = [];
  SUMMARY_SECTIONS.forEach(function (sec) {
    var items = data[sec[0]] || [];
    sectionRows.push(rows.length + 1);
    rows.push([sec[1] + '  (' + items.length + ')', '', '', '', '', '']);
    if (items.length) items.forEach(function (it) { rows.push([it.idea, it.contributor, it.why, it.owner, it.when, it.measure]); });
    else rows.push(['— none yet —', '', '', '', '', '']);
  });
  sh.getRange(1, 1, rows.length, 6).setValues(rows);
  sh.getRange(1, 1, 1, 6).setFontSize(14).setFontWeight('bold');
  sh.getRange(3, 1, 1, 6).setFontWeight('bold').setBackground('#241813').setFontColor('#FBF4EA');
  sectionRows.forEach(function (r) { sh.getRange(r, 1, 1, 6).setFontWeight('bold').setBackground('#FDEEDE').setFontColor('#C24E16'); });
  sh.setColumnWidth(1, 400); sh.setColumnWidth(3, 240); sh.setColumnWidth(6, 240);
  sh.setFrozenRows(3);
}
