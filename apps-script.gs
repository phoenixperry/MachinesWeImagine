/* ============================================================
   Google Apps Script: mailing list collector
   ------------------------------------------------------------
   SETUP (once, ~3 minutes):
   1. Create a Google Sheet. Name the first sheet tab "Signups"
      and put headers in row 1:  Timestamp | Name | Email
   2. In that Sheet: Extensions → Apps Script. Delete the sample
      code and paste this whole file in.
   3. Deploy → New deployment → type "Web app".
        - Execute as: Me
        - Who has access: Anyone
      Click Deploy and authorize when asked.
   4. Copy the Web app URL it gives you (ends in /exec) and paste
      it into SCRIPT_URL at the top of site/modal.js.

   That's it. Every signup appends a row to the Sheet.
   If you redeploy after edits, use "Manage deployments" and edit
   the existing one so the URL stays the same.
   ============================================================ */

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Signups');
  var data = JSON.parse(e.postData.contents);
  sheet.appendRow([new Date(), data.name || '', data.email || '']);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
