import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { AccountSectionPage, ContractsPage } from "../src/pages/account/CustomerAccountPages";

const fixtures = vi.hoisted(() => ({
  user: {id:"customer-1",name:"Internal Customer",company:"Internal",email:"internal@example.test"},
  contract: {id:"contract-1",customerId:"customer-1",customerName:"Internal Customer",title:"Stored agreement",scope:"Exact stored scope, deliverables, cancellation and payment terms.",contractVersion:"v7",status:"assigned",projectReference:"INTERNAL-1",depositAmountCents:25000,currency:"eur",workspaceAccess:true},
  sign: vi.fn(), decide: vi.fn(), portal: vi.fn(), paid: false,
}));
vi.mock("../src/contexts/useCustomerAuth",()=>({useCustomerAuth:()=>({user:fixtures.user,logout:vi.fn()})}));
vi.mock("../src/services/customerWorkflow",()=>({
  signContract:fixtures.sign,
  subscribeCustomerContracts:(_id:string,next:(data:unknown[])=>void)=>{next([fixtures.contract]);return ()=>{};},
  subscribeCustomerInvoices:(_id:string,next:(data:unknown[])=>void)=>{next([{id:"invoice-1",contractId:"contract-1",isDeposit:true,status:fixtures.paid?"paid":"issued",amountCents:25000,currency:"eur"}]);return ()=>{};},
  subscribeCustomerPayments:(_id:string,next:(data:unknown[])=>void)=>{next([]);return ()=>{};},
}));
vi.mock("../src/lib/averonApi",()=>({averonApi:{customer:{portal:fixtures.portal},business:{decideQuote:fixtures.decide}}}));
vi.mock("../src/lib/stripe",()=>({stripeFrontendReady:true,createDepositCheckoutSession:vi.fn()}));
afterEach(cleanup);
beforeEach(()=>{vi.clearAllMocks();fixtures.paid=false;fixtures.sign.mockResolvedValue(undefined);fixtures.decide.mockResolvedValue({});fixtures.portal.mockResolvedValue({data:{profile:null,contracts:[],invoices:[],messages:[],notifications:[],quotes:[{id:"quote-1",projectType:"Internal offer",message:"Customer inquiry",status:"approved",revision:3,adminReply:"Actual offer scope and conditions",amountCents:25000,currency:"eur"}]}});});

for(const paid of [false,true]) it(`renders actual terms and permits typed acceptance with paid=${paid}`,async()=>{
  fixtures.paid=paid;render(<MemoryRouter><ContractsPage/></MemoryRouter>);
  expect(await screen.findByText(fixtures.contract.scope)).toBeTruthy();expect(screen.getByText(/Version: v7/)).toBeTruthy();
  const sign=screen.getByRole("button",{name:"Sign Contract"}) as HTMLButtonElement;
  expect(sign.disabled).toBe(false);fireEvent.click(sign);
  await waitFor(()=>expect(fixtures.sign).toHaveBeenCalledWith(fixtures.contract,"Internal Customer"));
});

for(const decision of ["accepted","rejected"] as const) it(`customer can view commercial terms and submit ${decision} for the displayed revision`,async()=>{
  render(<MemoryRouter initialEntries={["/account/quotes"]}><Routes><Route path="/account/:section" element={<AccountSectionPage/>}/></Routes></MemoryRouter>);
  expect(await screen.findByText("Actual offer scope and conditions")).toBeTruthy();expect(screen.getByText("EUR 250.00")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:decision==="accepted"?"Accept quote":"Reject quote"}));
  await waitFor(()=>expect(fixtures.decide).toHaveBeenCalledWith("quote-1",decision,3));
});

it("quote revision conflict is shown without pretending acceptance succeeded",async()=>{
  fixtures.decide.mockRejectedValue(new Error("Review the current quote before deciding."));
  render(<MemoryRouter initialEntries={["/account/quotes"]}><Routes><Route path="/account/:section" element={<AccountSectionPage/>}/></Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button",{name:"Accept quote"}));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent","Review the current quote before deciding.");
});
