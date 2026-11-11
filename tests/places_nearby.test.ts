import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));
vi.mock("@/lib/db", () => ({ query: mockQuery }));

import { GET } from "@/app/api/places/nearby/route";

describe("GET /api/places/nearby", () => {
  beforeEach(() => mockQuery.mockReset());

  it("passes PostGIS coordinates as longitude, then latitude", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const request = new NextRequest(
      "http://localhost/api/places/nearby?latitude=12.9668&longitude=77.5369&radius=10000",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.any(String),
      [77.5369, 12.9668, 10000, null, null, "all", "distance"],
    );
  });
});
