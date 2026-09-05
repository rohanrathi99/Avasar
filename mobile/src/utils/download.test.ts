import { formatBytes, sanitizeFileName } from "./download";

describe("formatBytes", () => {
  it("formats across units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(1_500_000)).toBe("1.4 MB");
  });

  it("handles invalid input", () => {
    expect(formatBytes(Number.NaN)).toBe("0 B");
    expect(formatBytes(-10)).toBe("0 B");
  });
});

describe("sanitizeFileName", () => {
  it("strips unsafe characters and preserves extensions", () => {
    expect(sanitizeFileName("My Resume (v2).pdf")).toBe("My_Resume_v2_.pdf");
    expect(sanitizeFileName("a/b\\c:d.txt")).toBe("a_b_c_d.txt");
  });

  it("falls back when the name reduces to nothing", () => {
    expect(sanitizeFileName("///")).toBe("download");
    expect(sanitizeFileName("", "resume.pdf")).toBe("resume.pdf");
  });
});
