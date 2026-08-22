/**
 * Minimal, dependency-light XLSX (OOXML SpreadsheetML) writer.
 *
 * Builds a valid `.xlsx` workbook from tabular data using `jszip` (already a
 * project dependency), so no additional spreadsheet library is required. Each
 * sheet is written with inline strings to avoid the shared-strings table.
 */

import JSZip from "jszip";

export type XlsxSheet = {
  /** Sheet tab name. Sanitized and de-duplicated automatically. */
  name: string;
  /** Ordered column headers rendered as a bold first row. */
  headers: string[];
  /** Row data aligned to `headers`. Cell values may be primitives or null. */
  rows: Array<Array<string | number | boolean | null | undefined>>;
};

/** Characters Excel forbids in a sheet name, plus length limit of 31. */
function sanitizeSheetName(name: string, taken: Set<string>): string {
  let cleaned = name
    .replace(/[[\]:*?/\\]/g, " ")
    .trim()
    .slice(0, 31);
  if (cleaned.length === 0) cleaned = "Sheet";
  let candidate = cleaned;
  let suffix = 1;
  while (taken.has(candidate.toLowerCase())) {
    const tail = `_${suffix++}`;
    candidate = `${cleaned.slice(0, 31 - tail.length)}${tail}`;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

/** Escape text for use inside an XML text node. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Strip characters that are illegal in XML 1.0 documents. */
function stripInvalidXmlChars(value: string): string {
  // Keep tab (0x09), newline (0x0A), carriage return (0x0D), and code points
  // at or above 0x20; drop the rest, which are illegal in XML 1.0.
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code === 0x09 || code === 0x0a || code === 0x0d || code >= 0x20) {
      out += ch;
    }
  }
  return out;
}

/** Convert a zero-based column index to its spreadsheet letters (0 -> A). */
function columnLetter(index: number): string {
  let result = "";
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

type NormalizedCell =
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "string"; value: string };

function normalizeCell(
  value: string | number | boolean | null | undefined,
): NormalizedCell {
  if (value === null || value === undefined)
    return { kind: "string", value: "" };
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? { kind: "number", value }
      : { kind: "string", value: String(value) };
  }
  if (typeof value === "boolean") return { kind: "boolean", value };
  return { kind: "string", value: stripInvalidXmlChars(value) };
}

function renderCell(
  ref: string,
  styleId: number,
  cell: NormalizedCell,
): string {
  const style = styleId > 0 ? ` s="${styleId}"` : "";
  if (cell.kind === "number") {
    return `<c r="${ref}"${style}><v>${cell.value}</v></c>`;
  }
  if (cell.kind === "boolean") {
    return `<c r="${ref}"${style} t="b"><v>${cell.value ? 1 : 0}</v></c>`;
  }
  if (cell.value.length === 0) {
    return `<c r="${ref}"${style}/>`;
  }
  return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(
    cell.value,
  )}</t></is></c>`;
}

function renderSheetXml(sheet: XlsxSheet): string {
  const rowsXml: string[] = [];

  const headerCells = sheet.headers
    .map((header, colIndex) =>
      renderCell(`${columnLetter(colIndex)}1`, 1, {
        kind: "string",
        value: stripInvalidXmlChars(header),
      }),
    )
    .join("");
  rowsXml.push(`<row r="1">${headerCells}</row>`);

  sheet.rows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const cells = sheet.headers
      .map((_header, colIndex) =>
        renderCell(
          `${columnLetter(colIndex)}${rowNumber}`,
          0,
          normalizeCell(row[colIndex]),
        ),
      )
      .join("");
    rowsXml.push(`<row r="${rowNumber}">${cells}</row>`);
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rowsXml.join(
    "",
  )}</sheetData></worksheet>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`;

/**
 * Build a `.xlsx` workbook from the provided sheets and return it as a Buffer.
 */
export async function buildXlsxWorkbook(
  inputSheets: XlsxSheet[],
): Promise<Buffer> {
  const takenNames = new Set<string>();
  const sheets =
    inputSheets.length > 0
      ? inputSheets
      : [{ name: "Sheet1", headers: [], rows: [] }];
  const named = sheets.map((sheet) => ({
    ...sheet,
    name: sanitizeSheetName(sheet.name, takenNames),
  }));

  const zip = new JSZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${named
      .map(
        (_sheet, index) =>
          `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join("")}</Types>`,
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  );

  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${named
      .map(
        (sheet, index) =>
          `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
      )
      .join("")}</sheets></workbook>`,
  );

  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${named
      .map(
        (_sheet, index) =>
          `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
      )
      .join(
        "",
      )}<Relationship Id="rId${named.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  );

  zip.file("xl/styles.xml", STYLES_XML);

  named.forEach((sheet, index) => {
    zip.file(`xl/worksheets/sheet${index + 1}.xml`, renderSheetXml(sheet));
  });

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
}
