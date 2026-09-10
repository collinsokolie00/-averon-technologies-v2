import { existsSync } from "node:fs";
import { chromium, type Browser, type Page } from "playwright-core";
import type { GuardianCheckResult, GuardianWebsite } from "@averon/shared-types";
import type { GuardianInspector } from "./guardian.service.ts";
import { validateGuardianTarget } from "./guardian.service.ts";

const MAX_ROUTES = 10;
const PAGE_TIMEOUT_MS = 10_000;
const SESSION_TIMEOUT_MS = 45_000;
const MAX_FAILURES_PER_KIND = 10;
const blockedPath = /(?:^|\/)(?:admin|login|logout|account|checkout|payment|booking|book|quote|estimate)(?:\/|$)/i;
const browserKinds = new Set(["ASSETS", "LINKS", "UI_SMOKE", "RUNTIME", "FORMS", "RESPONSIVE"]);
export const guardianBrowserLimits = { maximumRoutes: MAX_ROUTES, crawlDepth: 1, pageTimeoutMs: PAGE_TIMEOUT_MS, sessionTimeoutMs: SESSION_TIMEOUT_MS } as const;

export interface BrowserRouteObservation {
  route: string;
  viewport: "desktop" | "mobile";
  rendered: boolean;
  hasMainContent: boolean;
  horizontalOverflow: boolean;
  internalLinks: string[];
  failedResources: Array<{ url: string; statusCode?: number; errorCode?: string }>;
  runtimeErrors: string[];
  formCount: number;
  formControls: number;
  inspectionArtifact?: "NAVIGATION_CANCELLED" | "SESSION_CLEANUP_CANCELLED";
}
export interface GuardianBrowserDriver { inspect(url: URL, origin: string, viewport: "desktop" | "mobile"): Promise<BrowserRouteObservation>; close(): Promise<void> }
export type GuardianBrowserDriverFactory = () => Promise<GuardianBrowserDriver>;

function safePath(value: string, origin: string) { try { const url = new URL(value); return url.origin === origin ? `${url.pathname}${url.search}` : undefined; } catch { return undefined; } }
function compactError(value: string) { return value.replace(/https?:\/\/[^\s)]+/g, "[url]").replace(/\s+/g, " ").slice(0, 160); }
export function isReportableResourceFailure(resourceType: string, errorCode: string) { return ["image", "stylesheet", "script", "font"].includes(resourceType) && !/ERR_ABORTED|ERR_BLOCKED_BY_CLIENT/i.test(errorCode); }
export function isGuardianReadMethod(method: string) { return method.toUpperCase() === "GET" || method.toUpperCase() === "HEAD"; }
export function isExpectedInspectionCancellation(caught: unknown) {
  const name = caught instanceof Error ? caught.name : ""; const message = caught instanceof Error ? caught.message : String(caught);
  return /Target page, context or browser has been closed|Navigation interrupted by another one|Execution context was destroyed.*navigation|page\.goto:.*net::ERR_ABORTED/i.test(message)
    || (name === "AbortError" && /navigation|page|context|browser|session cleanup/i.test(message));
}
export function isExpectedDomLifecycleArtifact(caught: unknown, state: { pageClosed: boolean; browserConnected: boolean }) {
  return isExpectedInspectionCancellation(caught) && (state.pageClosed || !state.browserConnected);
}
export function installGuardianFormSubmissionGuard() {
  document.addEventListener("submit", (event) => { event.preventDefault(); event.stopImmediatePropagation(); }, true);
  HTMLFormElement.prototype.submit = function guardianBlockedSubmit() {};
  HTMLFormElement.prototype.requestSubmit = function guardianBlockedRequestSubmit() {};
}

class PlaywrightGuardianDriver implements GuardianBrowserDriver {
  private readonly browser: Browser;
  constructor(browser: Browser) { this.browser = browser; }
  async inspect(url: URL, origin: string, viewport: "desktop" | "mobile"): Promise<BrowserRouteObservation> {
    const context = await this.browser.newContext({ viewport: viewport === "desktop" ? { width: 1440, height: 900 } : { width: 390, height: 844 }, javaScriptEnabled: true, ignoreHTTPSErrors: false });
    await context.addInitScript(installGuardianFormSubmissionGuard);
    const page = await context.newPage(); const failedResources: BrowserRouteObservation["failedResources"] = []; const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(compactError(error.message)));
    page.on("console", (message) => { const value = compactError(message.text()); if (message.type() === "error" && !/Failed to load resource|ERR_BLOCKED_BY_CLIENT/i.test(value)) runtimeErrors.push(value); });
    page.on("requestfailed", (request) => { const path = safePath(request.url(), origin); const errorCode = compactError(request.failure()?.errorText ?? "RESOURCE_FAILED"); if (path && isReportableResourceFailure(request.resourceType(), errorCode)) failedResources.push({ url: path, errorCode }); });
    page.on("response", (response) => { const path = safePath(response.url(), origin); if (path && response.status() >= 400 && ["image", "stylesheet", "script", "font"].includes(response.request().resourceType())) failedResources.push({ url: path, statusCode: response.status() }); });
    await page.route("**/*", async (route) => { const request = route.request(); const target = request.url(); let parsed: URL; try { parsed = new URL(target); } catch { return route.abort("blockedbyclient"); } if (!isGuardianReadMethod(request.method()) || !["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin) return route.abort("blockedbyclient"); try { await validateGuardianTarget(target, origin); } catch { return route.abort("blockedbyclient"); } return route.continue(); });
    let rendered: boolean; try { const response = await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT_MS }); rendered = Boolean(response && response.status() >= 200 && response.status() < 400); } catch (caught) { if (isExpectedInspectionCancellation(caught)) { await context.close().catch(() => undefined); return observationArtifact(url, viewport, "NAVIGATION_CANCELLED"); } rendered = false; }
    const observed = await this.observe(page, url, origin, viewport, rendered).catch((caught) => isExpectedDomLifecycleArtifact(caught, { pageClosed: page.isClosed(), browserConnected: this.browser.isConnected() }) ? observationArtifact(url, viewport, "SESSION_CLEANUP_CANCELLED") : observationFailure(`${url.pathname}${url.search}`, viewport, "DOM_INSPECTION_FAILED"));
    await context.close(); return { ...observed, failedResources: [...failedResources, ...observed.failedResources], runtimeErrors: [...new Set([...runtimeErrors, ...observed.runtimeErrors])] };
  }
  private async observe(page: Page, url: URL, origin: string, viewport: "desktop" | "mobile", rendered: boolean): Promise<BrowserRouteObservation> {
    const dom = await page.evaluate(() => ({ text: (document.querySelector("main")?.textContent ?? document.body?.textContent ?? "").trim(), width: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, links: [...document.querySelectorAll<HTMLAnchorElement>("a[href]")].map((item) => item.href), forms: document.forms.length, controls: document.querySelectorAll("form input, form select, form textarea, form button").length }));
    const internalLinks = [...new Set(dom.links.flatMap((value) => { try { const target = new URL(value); return target.origin === origin && !blockedPath.test(target.pathname) ? [`${target.pathname}${target.search}`] : []; } catch { return []; } }))];
    return { route: `${url.pathname}${url.search}`, viewport, rendered, hasMainContent: dom.text.length >= 20, horizontalOverflow: dom.width > dom.clientWidth + 1, internalLinks, failedResources: [], runtimeErrors: [], formCount: dom.forms, formControls: dom.controls };
  }
  close() { return this.browser.close(); }
}

export async function createPlaywrightGuardianDriver(): Promise<GuardianBrowserDriver> {
  const configured = process.env.GUARDIAN_CHROME_EXECUTABLE?.trim(); const candidates = [configured, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].filter((item): item is string => Boolean(item)); const executablePath = candidates.find(existsSync); if (!executablePath) throw new Error("GUARDIAN_BROWSER_UNAVAILABLE");
  return new PlaywrightGuardianDriver(await chromium.launch({ executablePath, headless: true }));
}

export class GuardianBrowserInspector implements GuardianInspector {
  private readonly createDriver: GuardianBrowserDriverFactory;
  private readonly resolve?: (hostname: string) => Promise<string[]>;
  private readonly sessionTimeoutMs: number;
  constructor(createDriver: GuardianBrowserDriverFactory = createPlaywrightGuardianDriver, resolve?: (hostname: string) => Promise<string[]>, sessionTimeoutMs = SESSION_TIMEOUT_MS) { this.createDriver = createDriver; this.resolve = resolve; this.sessionTimeoutMs = sessionTimeoutMs; }
  async inspect(website: GuardianWebsite): Promise<GuardianCheckResult[]> {
    const requested = website.checks.filter((kind) => browserKinds.has(kind)); if (!requested.length) return [];
    if (!website.baseUrl) return requested.map((kind) => ({ kind, status: "NOT_CHECKED", summary: "Browser inspection requires a configured website URL.", reason: "CONFIGURATION_REQUIRED" }));
    let base: URL; try { base = this.resolve ? await validateGuardianTarget(website.baseUrl, new URL(website.baseUrl).origin, this.resolve) : await validateGuardianTarget(website.baseUrl, new URL(website.baseUrl).origin); } catch { return requested.map((kind) => ({ kind, status: "NOT_CHECKED", summary: "Browser inspection target was denied.", reason: "GUARDIAN_TARGET_DENIED" })); }
    let driver: GuardianBrowserDriver; try { driver = await this.createDriver(); } catch { return requested.map((kind) => ({ kind, status: "NOT_CHECKED", summary: "The read-only browser is unavailable.", reason: "GUARDIAN_BROWSER_UNAVAILABLE" })); }
    const observations: BrowserRouteObservation[] = []; const routes = new Set<string>(["/", ...website.importantRoutes].slice(0, MAX_ROUTES));
    let timer: ReturnType<typeof setTimeout> | undefined; let expired = false;
    const crawl = async () => { for (const route of routes) { if (observations.length / 2 >= MAX_ROUTES || expired) break; const value = new URL(route, base).toString(); let target: URL; try { target = this.resolve ? await validateGuardianTarget(value, base.origin, this.resolve) : await validateGuardianTarget(value, base.origin); } catch { observations.push(observationFailure(route, "desktop", "GUARDIAN_TARGET_DENIED")); continue; } let desktop: BrowserRouteObservation; try { desktop = await driver.inspect(target, base.origin, "desktop"); } catch (caught) { desktop = isExpectedInspectionCancellation(caught) ? observationArtifact(target, "desktop", "SESSION_CLEANUP_CANCELLED") : observationFailure(route, "desktop", "GUARDIAN_BROWSER_ROUTE_FAILED"); } observations.push(desktop); if (route === "/") for (const discovered of desktop.internalLinks) if (routes.size < MAX_ROUTES && !blockedPath.test(discovered)) routes.add(discovered); if (!expired) { try { observations.push(await driver.inspect(target, base.origin, "mobile")); } catch (caught) { observations.push(isExpectedInspectionCancellation(caught) ? observationArtifact(target, "mobile", "SESSION_CLEANUP_CANCELLED") : observationFailure(route, "mobile", "GUARDIAN_BROWSER_ROUTE_FAILED")); } } } };
    try { await Promise.race([crawl(), new Promise<void>((resolve) => { timer = setTimeout(() => { expired = true; resolve(); }, this.sessionTimeoutMs); })]); if (expired) observations.push(observationFailure("/", "desktop", "GUARDIAN_BROWSER_SESSION_TIMEOUT")); } finally { if (timer) clearTimeout(timer); await driver.close().catch(() => undefined); }
    return this.results(requested, observations);
  }
  private results(requested: GuardianWebsite["checks"], observations: BrowserRouteObservation[]): GuardianCheckResult[] {
    const timedOut = observations.some((item) => item.runtimeErrors.includes("GUARDIAN_BROWSER_SESSION_TIMEOUT")); const artifacts = observations.filter((item) => item.inspectionArtifact); const usable = observations.filter((item) => !item.inspectionArtifact && !item.runtimeErrors.includes("GUARDIAN_BROWSER_SESSION_TIMEOUT")); if (!usable.length && (timedOut || artifacts.length)) { const reason = timedOut ? "GUARDIAN_BROWSER_SESSION_TIMEOUT" : "GUARDIAN_INSPECTION_CANCELLED"; return requested.map((kind) => ({ kind, status: "NOT_CHECKED", summary: "The bounded browser inspection ended without authoritative page evidence.", reason })); } const output: GuardianCheckResult[] = []; const pass = (kind: GuardianCheckResult["kind"], summary: string): GuardianCheckResult => ({ kind, status: "PASS", summary }); const failure = (kind: GuardianCheckResult["kind"], item: BrowserRouteObservation, signature: string, summary: string, target = item.route): GuardianCheckResult => ({ kind, status: "FAIL", target, summary, evidence: { signature, viewport: item.viewport, route: item.route } }); const limited = (items: GuardianCheckResult[]) => [...new Map(items.map((item) => [`${item.kind}|${item.target}|${item.evidence?.signature}|${item.evidence?.viewport}`, item])).values()].slice(0, MAX_FAILURES_PER_KIND);
    for (const kind of requested) {
      if (kind === "ASSETS") { const broken = usable.flatMap((item) => item.failedResources.map((resource) => ({ item, resource }))); output.push(...(broken.length ? limited(broken.map(({ item, resource }) => failure(kind, item, resource.errorCode ?? `http-${resource.statusCode}`, "A rendered static resource failed.", resource.url))) : [pass(kind, "No failed same-origin rendered static resources were observed.")])); }
      else if (kind === "LINKS") { const failed = usable.filter((item) => !item.rendered); output.push(...(failed.length ? limited(failed.map((item) => failure(kind, item, "internal-link-failed", "An internal rendered navigation route failed."))) : [pass(kind, "Bounded same-origin rendered navigation links responded.")])); }
      else if (kind === "UI_SMOKE") { const failed = usable.filter((item) => !item.rendered || !item.hasMainContent); output.push(...(failed.length ? limited(failed.map((item) => failure(kind, item, item.rendered ? "main-content-missing" : "page-render-failed", "The page failed the deterministic render smoke check."))) : [pass(kind, "Rendered pages contained usable main content.")])); }
      else if (kind === "RUNTIME") { const errors = usable.flatMap((item) => item.runtimeErrors.map((error) => ({ item, error }))); output.push(...(errors.length ? limited(errors.map(({ item, error }) => failure(kind, item, `runtime-${createSafeSignature(error)}`, `A serious runtime error was observed: ${error}`))) : [pass(kind, "No uncaught page or serious console errors were observed.")])); }
      else if (kind === "FORMS") { const forms = usable.filter((item) => item.formCount > 0); output.push(forms.length ? forms.some((item) => item.formControls === 0) ? failure(kind, forms.find((item) => item.formControls === 0)!, "form-controls-missing", "A rendered form had no controls.") : { kind, status: "PASS", summary: "Rendered forms contained controls; no forms were submitted." } : { kind, status: "PASS", summary: "No forms were present; no submission was attempted." }); }
      else if (kind === "RESPONSIVE") { const failed = usable.filter((item) => !item.rendered || item.horizontalOverflow); output.push(...(failed.length ? limited(failed.map((item) => failure(kind, item, item.horizontalOverflow ? "horizontal-overflow" : "responsive-render-failed", "A viewport failed the deterministic responsive smoke check."))) : [pass(kind, "Desktop and mobile smoke viewports rendered without horizontal overflow.")])); }
    }
    return output;
  }
}
function createSafeSignature(value: string) { let hash = 0; for (const character of value) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0; return Math.abs(hash).toString(16); }
function observationFailure(route: string, viewport: "desktop" | "mobile", error: string): BrowserRouteObservation { return { route, viewport, rendered: false, hasMainContent: false, horizontalOverflow: false, internalLinks: [], failedResources: [], runtimeErrors: [error], formCount: 0, formControls: 0 }; }
function observationArtifact(url: URL, viewport: "desktop" | "mobile", artifact: NonNullable<BrowserRouteObservation["inspectionArtifact"]>): BrowserRouteObservation { return { route: `${url.pathname}${url.search}`, viewport, rendered: false, hasMainContent: false, horizontalOverflow: false, internalLinks: [], failedResources: [], runtimeErrors: [], formCount: 0, formControls: 0, inspectionArtifact: artifact }; }

export class CompositeGuardianInspector implements GuardianInspector {
  private readonly inspectors: GuardianInspector[];
  constructor(inspectors: GuardianInspector[]) { this.inspectors = inspectors; }
  async inspect(website: GuardianWebsite) { const batches = await Promise.all(this.inspectors.map((item) => item.inspect(website))); const browser = batches.slice(1).flat(); const browserResultKinds = new Set(browser.map((item) => item.kind)); return [...batches[0]!.filter((item) => !(item.status === "NOT_CHECKED" && browserResultKinds.has(item.kind))), ...browser]; }
}
