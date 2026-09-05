import { ApiError, configureApiAuth, fetchApi, NetworkError } from "./http";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => JSON.stringify(body),
    headers: { get: () => "application/json" },
  } as unknown as Response;
}

describe("fetchApi", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    configureApiAuth({ getToken: () => null, onUnauthorized: () => {} });
  });

  it("unwraps the { ok, data } envelope", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ ok: true, data: { hello: "world" }, meta: { requestId: "r1" } }),
    );
    await expect(fetchApi("/thing")).resolves.toEqual({ hello: "world" });
  });

  it("attaches the bearer token when present", async () => {
    configureApiAuth({ getToken: () => "tok123", onUnauthorized: () => {} });
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: 1 }));
    await fetchApi("/thing");
    const [, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok123",
    );
  });

  it("throws ApiError with code + message on an error envelope", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          ok: false,
          error: { code: "NOT_FOUND", message: "Missing" },
          meta: { requestId: "r2" },
        },
        404,
      ),
    );
    await expect(fetchApi("/thing")).rejects.toMatchObject({
      name: "ApiError",
      code: "NOT_FOUND",
      status: 404,
      requestId: "r2",
    });
  });

  it("invokes the unauthorized handler on a 401", async () => {
    const onUnauthorized = jest.fn();
    configureApiAuth({ getToken: () => "t", onUnauthorized });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { ok: false, error: { code: "UNAUTHORIZED", message: "no" }, meta: {} },
        401,
      ),
    );
    await expect(fetchApi("/me")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("suppresses the unauthorized handler when asked", async () => {
    const onUnauthorized = jest.fn();
    configureApiAuth({ getToken: () => "t", onUnauthorized });
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { ok: false, error: { code: "UNAUTHORIZED", message: "no" }, meta: {} },
        401,
      ),
    );
    await expect(
      fetchApi("/me", { suppressUnauthorizedHandler: true }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("wraps a fetch rejection as a NetworkError", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(fetchApi("/thing")).rejects.toBeInstanceOf(NetworkError);
  });

  it("serializes a JSON body and sets the content-type", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: null }));
    await fetchApi("/login", { method: "POST", body: { a: 1 } });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });
});
