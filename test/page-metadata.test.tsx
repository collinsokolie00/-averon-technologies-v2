import { act, render, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AVERON_PUBLIC_METADATA, STATIC_PAGE_IDS, staticPageIdForPath } from "@averon/shared-types";
import PageMetadataManager from "../src/components/PageMetadataManager";
import { applyPageMetadata, fallbackMetadataForPath } from "../src/metadata/pageMetadata";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../src/lib/averonApi", () => ({ averonApi: { pageMetadata: { get } } }));

function Navigation() { const navigate = useNavigate(); return <button onClick={() => navigate("/services")}>Services</button>; }

beforeEach(() => { document.head.innerHTML = ""; get.mockReset(); get.mockImplementation(async (_workspaceId: string, pageId: keyof typeof AVERON_PUBLIC_METADATA) => ({ success: true, requestId: "metadata", data: AVERON_PUBLIC_METADATA[pageId] })); });

describe("canonical page metadata", () => {
  it("resolves every static route to one stable page ID", () => { expect(STATIC_PAGE_IDS.map((id) => staticPageIdForPath(AVERON_PUBLIC_METADATA[id].route))).toEqual([...STATIC_PAGE_IDS]); });
  it("updates title description canonical and OG from the canonical reader across navigation", async () => {
    const view = render(<MemoryRouter initialEntries={["/"]}><PageMetadataManager /><Navigation /></MemoryRouter>);
    await waitFor(() => expect(document.title).toBe(AVERON_PUBLIC_METADATA.home.title));
    await act(async () => view.getByText("Services").click());
    await waitFor(() => expect(document.title).toBe(AVERON_PUBLIC_METADATA.services.title));
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(AVERON_PUBLIC_METADATA.services.metaDescription);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("http://localhost:3000/services");
    expect(document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[property="og:description"]')).toHaveLength(1);
    expect(get).toHaveBeenCalledWith("averon", "services");
  });
  it("accepts one canonical backend record and projects that exact record into the mounted DOM", async () => {
    const canonical = { ...AVERON_PUBLIC_METADATA.products, title: "Canonical Products Record", metaDescription: "Canonical products description.", ogTitle: "Canonical Products OG", ogDescription: "Canonical products OG description." };
    get.mockResolvedValue({ success: true, requestId: "canonical-reader", data: canonical });
    render(<MemoryRouter initialEntries={["/products"]}><PageMetadataManager /></MemoryRouter>);
    await waitFor(() => expect(document.title).toBe(canonical.title));
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(canonical.metaDescription);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("http://localhost:3000/products");
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe(canonical.ogTitle);
    expect(document.querySelector('meta[property="og:description"]')?.getAttribute("content")).toBe(canonical.ogDescription);
    expect(get).toHaveBeenCalledTimes(1);
  });
  it("retains a safe fallback when canonical loading fails", async () => { get.mockRejectedValue(new Error("offline")); render(<MemoryRouter initialEntries={["/technology"]}><PageMetadataManager /></MemoryRouter>); await waitFor(() => expect(document.title).toBe(AVERON_PUBLIC_METADATA.technology.title)); });
  it("derives dynamic blog metadata from existing canonical article content", () => { const metadata = fallbackMetadataForPath("/blog/ai-changing-modern-businesses"); expect(metadata.pageId).toBe("blog:ai-changing-modern-businesses"); expect(metadata.title).toContain("How AI is changing modern businesses"); expect(metadata.canonicalPath).toBe("/blog/ai-changing-modern-businesses"); });
  it("head application remains singleton-safe", () => { document.head.innerHTML = '<meta name="description"><meta name="description"><meta property="og:title"><meta property="og:title">'; applyPageMetadata(AVERON_PUBLIC_METADATA.home, "https://averon.example"); expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1); expect(document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1); expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://averon.example/"); });
});
