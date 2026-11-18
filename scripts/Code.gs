// Copy publisher.js into a second Apps Script file named Publisher.gs.
const PUBLISH_HOUR = 23; // Configurable Sydney local hour; trigger runs approximately.
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Itinerary')
    .addItem('Publish itinerary snapshot', 'publishReady')
    .addItem('Install daily publishing', 'installDailyPublisher').addToUi();
}
function publishReady() {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const book = SpreadsheetApp.getActive();
    const source = book.getSheetByName('Itinerary');
    const published = book.getSheetByName('Published');
    const before = published.getDataRange().getDisplayValues();
    const incoming = source.getDataRange().getDisplayValues();
    const next = itinerarySnapshot(incoming.slice(1));
    const stamp = new Date().toISOString();
    // Store a private Drive snapshot before changing Published; never expose it via a web app.
    const backup = DriveApp.createFile('Itinerary snapshot ' + stamp + '.json', JSON.stringify(before), MimeType.PLAIN_TEXT);
    PropertiesService.getDocumentProperties().setProperty('snapshotFile', backup.getId());
    // One rectangular write replaces data and clears leftover cells atomically at range level.
    const size = Math.max(before.length, next.length + 1);
    const rows = [incoming[0], ...next];
    while (rows.length < size) rows.push(Array(20).fill(''));
    published.getRange(1,1,size,20).setNumberFormat('@').setValues(rows);
    published.getRange('A1').setNote('Published ' + stamp + '. Previous snapshot: ' + backup.getUrl());
    PropertiesService.getDocumentProperties().setProperty('lastPublishedAt', stamp);
  } finally { lock.releaseLock(); }
}
function installDailyPublisher() {
  // Run as the Sheet owner. Uses Australia/Sydney timezone including DST, independent of Mac sleep.
  const book = SpreadsheetApp.getActive();
  book.setSpreadsheetTimeZone('Australia/Sydney');
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='publishReady')
    .forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('publishReady').timeBased().atHour(PUBLISH_HOUR).nearMinute(0)
    .everyDays(1).inTimezone('Australia/Sydney').create();
}
