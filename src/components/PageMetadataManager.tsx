import { useEffect } from "react";
import { useLocation } from "react-router";
import { staticPageIdForPath, type PageMetadata } from "@averon/shared-types";
import { averonApi } from "../lib/averonApi";
import { applyPageMetadata, AVERON_WORKSPACE_ID, fallbackMetadataForPath } from "../metadata/pageMetadata";

const cache = new Map<string, PageMetadata>();

export default function PageMetadataManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    let active = true;
    const fallback = fallbackMetadataForPath(pathname);
    const pageId = staticPageIdForPath(pathname);
    applyPageMetadata(pageId ? cache.get(pageId) ?? fallback : fallback);
    if (pageId) void averonApi.pageMetadata.get(AVERON_WORKSPACE_ID, pageId).then(({ data }) => {
      if (!active) return;
      cache.set(pageId, data);
      applyPageMetadata(data);
    }).catch(() => { /* The route-safe fallback remains active. */ });
    return () => { active = false; };
  }, [pathname]);
  return null;
}
