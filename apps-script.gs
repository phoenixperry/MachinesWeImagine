/* ============================================================
   Google Apps Script — Machines We Imagine sign-ups
   ------------------------------------------------------------
   One script handles both forms on the website:
     • "Join us" modal (modal.js)   → row in the "Signups" tab
     • Meetup page (meetup.js)      → row in "Meetup signups"
       (incl. show and tell slot requests), and also in "Signups"
       if they ticked the mailing-list box
     • Show and tell is capped at SHOW_TELL_SLOTS. Requests after
       that are recorded as "Waitlist". The meetup page asks
       ?slots=1 for the number left and greys out the box at 0.
   Tabs and headers are created automatically on first use.

   SETUP / UPDATE:
   1. Open your Google Sheet → Extensions → Apps Script.
   2. Replace ALL the code with this file and Save.
   3. Deploy → Manage deployments → ✎ Edit → Version: "New version"
      → Deploy. (Editing the existing deployment keeps the same URL,
      which is already in modal.js and meetup.js.)
      First time only: Deploy → New deployment → "Web app",
      Execute as: Me, Who has access: Anyone.
   4. Open the /exec URL in a browser — it should say
      "MWI signup endpoint is live." If it says
      "Script function not found: doGet", step 3 didn't publish
      the new version yet.
   ============================================================ */

var MAILING_TAB = 'Signups';
var MEETUP_TAB = 'Meetup signups';
var MEETUP_HEADERS = ['Timestamp', 'Name', 'Email', 'Mailing list', 'Show and tell', 'What they\'ll share'];
var SHOW_TELL_SLOTS = 6;

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var name = String(data.name || '').trim();
  var email = String(data.email || '').trim();

  // Server-side check too, in case someone posts directly to the URL
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json_({ ok: false, error: 'invalid' });
  }

  var now = new Date();
  if (data.type === 'meetup') {
    var wantsList = data.mailingList === true;
    var presenting = data.present === true;
    var showTell = 'No';
    // Lock so two people can't both take the last slot at the same moment
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (presenting) showTell = slotsLeft_() > 0 ? 'Yes' : 'Waitlist';
      tab_(MEETUP_TAB, MEETUP_HEADERS)
        .appendRow([now, name, email, wantsList ? 'Yes' : 'No', showTell,
                    presenting ? String(data.topic || '').trim() : '']);
    } finally {
      lock.releaseLock();
    }
    if (wantsList) {
      tab_(MAILING_TAB, ['Timestamp', 'Name', 'Email', 'Source'])
        .appendRow([now, name, email, 'Meetup 7 Oct 2026']);
    }
  } else {
    tab_(MAILING_TAB, ['Timestamp', 'Name', 'Email', 'Source'])
      .appendRow([now, name, email, 'Website']);
  }
  return json_({ ok: true });
}

// Visiting the URL in a browser shows this — confirms the deploy works.
// The meetup page calls it with ?slots=1 to get the show and tell slots left.
function doGet(e) {
  if (e && e.parameter && e.parameter.slots) {
    return json_({ slotsLeft: slotsLeft_() });
  }
  return ContentService.createTextOutput('MWI signup endpoint is live.');
}

// Show and tell slots still free: the cap minus the "Yes" rows.
function slotsLeft_() {
  var sh = tab_(MEETUP_TAB, MEETUP_HEADERS);
  var rows = sh.getLastRow() - 1;
  var taken = 0;
  if (rows > 0) {
    var col = sh.getRange(2, 5, rows, 1).getValues();
    for (var i = 0; i < col.length; i++) {
      if (col[i][0] === 'Yes') taken++;
    }
  }
  return Math.max(0, SHOW_TELL_SLOTS - taken);
}

// Returns the named tab, creating it with headers if it doesn't exist.
function tab_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange('1:1').setFontWeight('bold');
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
