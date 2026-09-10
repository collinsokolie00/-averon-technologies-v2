import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActionSurface } from "../src/App.tsx";

describe("Guardian supervised repair approval card", () => {
  it("shows bounded evidence, specialists, verification, rollback and explicit controls", () => {
    const approve = vi.fn(); const reject = vi.fn();
    render(<ActionSurface workspaceName="Averon Technologies" busy={false} onApprove={approve} onReject={reject} action={{ actionId: "guardian-repair-1234567890abcdef12345678", actionType: "guardian.repair.plan", status: "approval_required", approvalStatus: "pending", verificationStatus: "pending", deploymentStatus: "not_performed", websiteId: "averon-website", findingId: "finding-1", severity: "MODERATE", target: "https://averon.example/", specialists: ["frontend", "testing"], expectedResources: ["src/page.tsx"], risk: "medium", summary: "Homepage control is not visible", evidenceSummary: "ui-smoke-missing", proposedOutcome: "Prepare a bounded repair", verificationPlan: ["Probe validates the route."], rollbackPlan: "Use bounded source rollback.", warnings: [] }}/>);
    expect(screen.getByText("Awaiting approval")).toBeTruthy(); expect(screen.getByText("frontend, testing")).toBeTruthy(); expect(screen.getByText("Probe validates the route.")).toBeTruthy(); expect(screen.getByText("Use bounded source rollback.")).toBeTruthy(); expect(screen.getByText("Not performed")).toBeTruthy(); screen.getByRole("button", { name: "Approve" }).click(); screen.getByRole("button", { name: "Reject" }).click(); expect(approve).toHaveBeenCalledOnce(); expect(reject).toHaveBeenCalledOnce();
    expect(screen.getByText("src/page.tsx")).toBeTruthy();
  });
});
