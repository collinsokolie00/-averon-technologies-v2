import { describe, expect, it } from "vitest";

import { developmentCustomerCredentials } from "../src/contexts/customerAuthPolicy";

describe("development customer authentication policy", () => {
  it("exposes configured credentials only on localhost development", () => {
    expect(developmentCustomerCredentials({ email: "dev@example.test", password: "secret", hostname: "localhost", isDevelopment: true }))
      .toEqual({ email: "dev@example.test", password: "secret" });
  });

  it.each([
    { hostname: "averontechnologies.com", isDevelopment: true },
    { hostname: "localhost", isDevelopment: false },
  ])("never exposes development credentials outside local development", ({ hostname, isDevelopment }) => {
    expect(developmentCustomerCredentials({ email: "dev@example.test", password: "secret", hostname, isDevelopment })).toBeNull();
  });

  it("fails closed when either local credential is absent", () => {
    expect(developmentCustomerCredentials({ email: "", password: "secret", hostname: "localhost", isDevelopment: true })).toBeNull();
    expect(developmentCustomerCredentials({ email: "dev@example.test", password: "", hostname: "localhost", isDevelopment: true })).toBeNull();
  });
});
