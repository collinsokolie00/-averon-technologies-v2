// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";

import { CustomerAuthContext, type CustomerAuthContextValue } from "../src/contexts/customerAuthCore";
import { CustomerAuthPage } from "../src/pages/auth/CustomerAuthPages";

afterEach(cleanup);

function auth(overrides: Partial<CustomerAuthContextValue> = {}): CustomerAuthContextValue {
  return {
    user: null,
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    sendPasswordReset: vi.fn(),
    verifyEmail: vi.fn(),
    ...overrides,
  };
}

function view(value: CustomerAuthContextValue) {
  return render(
    <CustomerAuthContext.Provider value={value}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<CustomerAuthPage mode="login" />} />
          <Route path="/account" element={<p>Authenticated portal</p>} />
        </Routes>
      </MemoryRouter>
    </CustomerAuthContext.Provider>,
  );
}

describe("development customer login", () => {
  it("uses the normal auth context and navigates to the portal", async () => {
    const loginAsDevelopmentCustomer = vi.fn().mockResolvedValue(undefined);
    view(auth({ developmentLoginAvailable: true, loginAsDevelopmentCustomer }));
    fireEvent.click(screen.getByRole("button", { name: "Developer test login" }));
    await waitFor(() => expect(loginAsDevelopmentCustomer).toHaveBeenCalledOnce());
    expect(await screen.findByText("Authenticated portal")).toBeTruthy();
  });

  it("does not render the development action when unavailable", () => {
    view(auth());
    expect(screen.queryByRole("button", { name: "Developer test login" })).toBeNull();
  });
});
