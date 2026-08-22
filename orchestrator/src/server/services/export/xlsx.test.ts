import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildXlsxWorkbook } from "./xlsx";

async function loadWorkbook(buffer: Buffer) {
  return JSZip.loadAsync(buffer);
}

describe("buildXlsxWorkbook", () => {
  it("produces a valid zip with the expected OOXML parts", async () => {
    const buffer = await buildXlsxWorkbook([
      { name: "Jobs", headers: ["id", "title"], rows: [["1", "Engineer"]] },
    ]);

    const zip = await loadWorkbook(buffer);
    expect(zip.file("[Content_Types].xml")).not.toBeNull();
    expect(zip.file("xl/workbook.xml")).not.toBeNull();
    expect(zip.file("xl/styles.xml")).not.toBeNull();
    expect(zip.file("xl/worksheets/sheet1.xml")).not.toBeNull();
  });

  it("writes headers and cell values into the sheet", async () => {
    const buffer = await buildXlsxWorkbook([
      {
        name: "Data",
        headers: ["name", "count", "active"],
        rows: [["Ada", 42, true]],
      },
    ]);

    const zip = await loadWorkbook(buffer);
    const sheet = await zip.file("xl/worksheets/sheet1.xml")?.async("string");
    expect(sheet).toContain('<t xml:space="preserve">name</t>');
    expect(sheet).toContain('<t xml:space="preserve">Ada</t>');
    expect(sheet).toContain("<v>42</v>");
    expect(sheet).toContain('t="b"><v>1</v>');
  });

  it("escapes XML-special characters in values", async () => {
    const buffer = await buildXlsxWorkbook([
      {
        name: "Escapes",
        headers: ["value"],
        rows: [["<a> & \"b\" 'c'"]],
      },
    ]);

    const zip = await loadWorkbook(buffer);
    const sheet = await zip.file("xl/worksheets/sheet1.xml")?.async("string");
    expect(sheet).toContain("&lt;a&gt; &amp; &quot;b&quot; &apos;c&apos;");
  });

  it("sanitizes and de-duplicates sheet names", async () => {
    const buffer = await buildXlsxWorkbook([
      { name: "Report:2024", headers: ["a"], rows: [] },
      { name: "Report 2024", headers: ["a"], rows: [] },
    ]);

    const zip = await loadWorkbook(buffer);
    const workbook = await zip.file("xl/workbook.xml")?.async("string");
    // Colon is illegal in a sheet name and must be replaced.
    expect(workbook).not.toContain("Report:2024");
    // The two names collide after sanitization and must be made unique.
    expect(workbook).toContain('name="Report 2024"');
    expect(workbook).toContain('name="Report 2024_1"');
  });

  it("handles an empty sheet list by emitting a default sheet", async () => {
    const buffer = await buildXlsxWorkbook([]);
    const zip = await loadWorkbook(buffer);
    expect(zip.file("xl/worksheets/sheet1.xml")).not.toBeNull();
  });
});
