// Google App Script to update links based on spreadsheet edits.
// Expects headers in the first row like:
// alias | url | expires_at

const WEBHOOK_URL = '<replace me>';
const WEBHOOK_TOKEN = '<replace me>';

async function updateLinks(event) {
  if (event) {
    if (event.range.getRowIndex() == 1) {
      console.log("Skipped header change!", "value:", event.value, "sheet:", event.source.getSheetName());
      return;
    }

    const headers = getRowData(event.source, 1);
    const values = getRowData(event.source, event.range.getRowIndex());
    const record = createObject(headers, values);
    const modifiedColumn = event.range.getColumn();

    record.row_number = event.range.getRowIndex();
    record.modified_column = headers[modifiedColumn - 1];
    record.old_value = event.oldValue;
    record.sheet_name = event.source.getSheetName();

    console.log(JSON.stringify(record));

    await UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + WEBHOOK_TOKEN,
      },
      payload: JSON.stringify(record),
    });
  } else {
    console.log('no event');
  }
}

function getHeaders(sheet) {
  const headersMatrix = sheet.getSheetValues(1, 1, 1, sheet.getLastColumn());
  return headersMatrix[0] || null;
}

function getRowData(sheet, row) {
  const valueMatrix = sheet.getSheetValues(row, 1, row, sheet.getLastColumn());
  return valueMatrix[0] || null;
}

function createObject(headers, values) {
  return headers.reduce((acc, header, i) => {
    acc[header] = values[i] || null;
    // acc['_type_' + header] = typeof values[i];
    return acc;
  }, {});
}
