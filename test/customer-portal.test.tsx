// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import type { ReactNode } from "react";

import { CustomerAuthContext, type CustomerAuthContextValue } from "../src/contexts/customerAuthCore";
import { AccountDashboard, AccountSectionPage } from "../src/pages/account/CustomerAccountPages";
import { averonApi } from "../src/lib/averonApi";
import ClientPortalBridge from "../src/pages/client-portal/ClientPortalBridge";

const user = { id: "customer-1", name: "Casey", email: "casey@example.com", company: "Casey Co", emailVerified: true, portalStatus: "active" as const };
const auth: CustomerAuthContextValue = { user, loading: false, login: vi.fn(), register: vi.fn(), loginWithGoogle: vi.fn(), logout: vi.fn(), sendPasswordReset: vi.fn(), verifyEmail: vi.fn() };
const portal = { profile: { id: user.id, name: user.name, email: user.email, company: user.company, phone: "+39 123", notificationPreference: "important", communicationPreference: "email" }, quotes: [], contracts: [], invoices: [], messages: [], notifications: [] };

function view(path: string, page: ReactNode) {
  return render(<CustomerAuthContext.Provider value={auth}><MemoryRouter initialEntries={[path]}><Routes><Route path="/account" element={page}/><Route path="/account/:section" element={page}/></Routes></MemoryRouter></CustomerAuthContext.Provider>);
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("customer portal", () => {
  it("renders authoritative dashboard data without demo account statistics", async () => {
    vi.spyOn(averonApi.customer, "portal").mockResolvedValue({ success: true, data: { ...portal, quotes: [{ id: "quote-1", status: "approved", projectType: "Website" }] }, requestId: "test" });
    view("/account", <AccountDashboard/>);
    expect(await screen.findByText("approved")).toBeTruthy();
    expect(screen.queryByText("AVR-2026-0001")).toBeNull();
  });

  it("does not report workspace eligibility before the deposit invoice is paid", async () => {
    vi.spyOn(averonApi.customer, "portal").mockResolvedValue({ success: true, data: { ...portal, contracts: [{ id: "contract-1", status: "signed", workspaceAccess: true }], invoices: [{ id: "invoice-1", contractId: "contract-1", isDeposit: true, status: "issued" }] }, requestId: "test" });
    const rendered = view("/account", <AccountDashboard/>);
    expect(await screen.findByText("Not ready")).toBeTruthy();
    rendered.unmount();
  });

  it("distinguishes a true empty quotes result from loading", async () => {
    vi.spyOn(averonApi.customer, "portal").mockResolvedValue({ success: true, data: portal, requestId: "test" });
    view("/account/quotes", <AccountSectionPage/>);
    expect(screen.getByText("Loading quotes...")).toBeTruthy();
    expect(await screen.findByText("No quotes are available yet.")).toBeTruthy();
  });

  it("persists profile changes through the authenticated API client", async () => {
    vi.spyOn(averonApi.customer, "portal").mockResolvedValue({ success: true, data: portal, requestId: "test" });
    const update = vi.spyOn(averonApi.customer, "updateProfile").mockResolvedValue({ success: true, data: portal.profile, requestId: "test" });
    view("/account/profile", <AccountSectionPage/>);
    await screen.findByDisplayValue("Casey");
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Casey Updated" } });
    fireEvent.submit(screen.getByText("Save profile").closest("form")!);
    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ name: "Casey Updated" })));
  });

  it("shows API failures instead of an empty-state message", async () => {
    vi.spyOn(averonApi.customer, "portal").mockRejectedValue(new Error("Portal unavailable"));
    view("/account/invoices", <AccountSectionPage/>);
    expect((await screen.findByRole("alert")).textContent).toContain("Portal unavailable");
    expect(screen.queryByText("No invoices have been issued yet.")).toBeNull();
  });

  it("renders authoritative invoice amount without inventing a download action", async () => {
    vi.spyOn(averonApi.customer, "portal").mockResolvedValue({ success: true, data: { ...portal, invoices: [{ id: "invoice-1", title: "Project invoice", status: "issued", amountCents: 12500, currency: "eur" }] }, requestId: "test" });
    view("/account/invoices", <AccountSectionPage/>);
    expect((await screen.findByText(/125/)).textContent).toMatch(/125/);
    expect(screen.queryByText(/download/i)).toBeNull();
  });

  it.each([["notifications", "No notifications yet."], ["messages", "No messages yet."]])("keeps %s loading and empty states distinct", async (section, empty) => {
    vi.spyOn(averonApi.customer, "portal").mockResolvedValue({ success: true, data: portal, requestId: "test" });
    view(`/account/${section}`, <AccountSectionPage/>);
    expect(screen.getByText(`Loading ${section}...`)).toBeTruthy();
    expect(await screen.findByText(empty)).toBeTruthy();
  });

  it("renders delivered-file metadata without exposing storage paths", async () => {
    vi.spyOn(averonApi.projects,"list").mockResolvedValue({success:true,requestId:"test",data:{items:[{id:"project-1",projectReference:"AVR-1",title:"Portal",summary:"Work",status:"active",progressPercent:50,accessEnabled:true,unlocked:true}]}});
    vi.spyOn(averonApi.projects,"workspace").mockResolvedValue({success:true,requestId:"test",data:{project:{id:"project-1",projectReference:"AVR-1",title:"Portal",summary:"Work",status:"active",progressPercent:50,accessEnabled:true,unlocked:true,contractId:"contract-1"},milestones:[],messages:[],changeRequests:[],files:[{id:"file-1",projectId:"project-1",name:"Delivery.pdf",category:"deliverable",mimeType:"application/pdf",sizeBytes:2048,description:"Approved delivery",version:1,customerVisible:true,deliveryStatus:"final",uploadedAt:"2026-09-04T10:00:00Z",downloadCount:0}],invoices:[],payments:[],contract:null,maintenanceScope:{included:[],excluded:[]}}});
    render(<CustomerAuthContext.Provider value={auth}><MemoryRouter><ClientPortalBridge/></MemoryRouter></CustomerAuthContext.Provider>);
    expect(await screen.findByText("Delivery.pdf")).toBeTruthy();expect(screen.getByText("Approved delivery")).toBeTruthy();expect(screen.getByText(/deliverable · application\/pdf/)).toBeTruthy();expect(screen.getByRole("button",{name:"Download Delivery.pdf"})).toBeTruthy();expect(document.body.textContent).not.toContain("storagePath");
  });

  it("shows the truthful delivered-files empty state",async()=>{
    vi.spyOn(averonApi.projects,"list").mockResolvedValue({success:true,requestId:"test",data:{items:[{id:"project-1",projectReference:"AVR-1",title:"Portal",summary:"Work",status:"active",progressPercent:50,accessEnabled:true,unlocked:true}]}});
    vi.spyOn(averonApi.projects,"workspace").mockResolvedValue({success:true,requestId:"test",data:{project:{id:"project-1",projectReference:"AVR-1",title:"Portal",summary:"Work",status:"active",progressPercent:50,accessEnabled:true,unlocked:true,contractId:"contract-1"},milestones:[],messages:[],changeRequests:[],files:[],invoices:[],payments:[],contract:null,maintenanceScope:{included:[],excluded:[]}}});
    render(<CustomerAuthContext.Provider value={auth}><MemoryRouter><ClientPortalBridge/></MemoryRouter></CustomerAuthContext.Provider>);expect(await screen.findByText("No project files have been delivered yet.")).toBeTruthy();
  });
});
