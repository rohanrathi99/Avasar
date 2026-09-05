import { drainSseFrames } from "./sse";

describe("drainSseFrames", () => {
  it("extracts complete frames and keeps a partial remainder", () => {
    const buffer = 'data: {"a":1}\n\ndata: {"b":2}\n\ndata: {"c"';
    const { data, rest } = drainSseFrames(buffer);
    expect(data).toEqual(['{"a":1}', '{"b":2}']);
    expect(rest).toBe('data: {"c"');
  });

  it("ignores comment/heartbeat lines", () => {
    const buffer = ": heartbeat\n\ndata: {\"ok\":true}\n\n";
    const { data, rest } = drainSseFrames(buffer);
    expect(data).toEqual(['{"ok":true}']);
    expect(rest).toBe("");
  });

  it("handles CRLF frame separators", () => {
    const buffer = "data: one\r\n\r\ndata: two\r\n\r\n";
    const { data } = drainSseFrames(buffer);
    expect(data).toEqual(["one", "two"]);
  });

  it("returns everything as remainder when no frame is complete", () => {
    const { data, rest } = drainSseFrames("data: partial");
    expect(data).toEqual([]);
    expect(rest).toBe("data: partial");
  });
});
