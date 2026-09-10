import { useEffect, useState } from "react";
import { AVERON_PUBLIC_PAGE_CONTENT, pageContentSection, type PageContent, type StaticPageId } from "@averon/shared-types";
import { averonApi } from "../lib/averonApi";
export const AVERON_CONTENT_WORKSPACE_ID = "averon";
export function usePageContent(pageId: "home" | "services") {
  const fallback = AVERON_PUBLIC_PAGE_CONTENT[pageId]; const [content, setContent] = useState<PageContent>(fallback);
  useEffect(() => { let active = true; void averonApi.pageContent.get(AVERON_CONTENT_WORKSPACE_ID, pageId as StaticPageId).then(({ data }) => { if (active && data.workspaceId === AVERON_CONTENT_WORKSPACE_ID && data.pageId === pageId) setContent(data); }).catch(() => undefined); return () => { active = false; }; }, [pageId]);
  return { content, section: (sectionId: string) => pageContentSection(content, sectionId)?.fields ?? {} };
}
