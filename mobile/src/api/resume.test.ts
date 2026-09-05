import { configureApiAuth } from "./http";
import { generateJobPdf, tailorJobResume } from "./resume";

function okJson(data: unknown): Response {
  return {
    status: 200,
    ok: true,
    text: async () => JSON.stringify({ ok: true, data }),
    headers: { get: () => "application/json" },
  } as unknown as Response;
}

describe("resume API request building", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    configureApiAuth({ getToken: () => null, onUnauthorized: () => {} });
  });

  it("encodes tailoring options into the summarize query", async () => {
    fetchMock.mockResolvedValueOnce(okJson({ id: "j1" }));
    await tailorJobResume("j1", { force: true, fields: ["summary", "skills"] });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/jobs/j1/summarize?");
    expect(url).toContain("force=1");
    expect(decodeURIComponent(url)).toContain("fields=summary,skills");
  });

  it("omits the query when no options are given", async () => {
    fetchMock.mockResolvedValueOnce(okJson({ id: "j1" }));
    await tailorJobResume("j1");
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/jobs/j1/summarize");
    expect(url).not.toContain("?");
  });

  it("posts to the per-job generate-pdf route", async () => {
    fetchMock.mockResolvedValueOnce(okJson({ id: "j1" }));
    await generateJobPdf("j1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/jobs/j1/generate-pdf");
    expect(init.method).toBe("POST");
  });
});
