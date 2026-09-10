export const failureCorpus = [
  { id: "over-selection", category: "team", expected: "reject", detail: "SEO plus unrelated marketing, blog, research, and analytics workers" },
  { id: "under-selection", category: "team", expected: "reject", detail: "Backend/database request without database coverage" },
  { id: "contradiction", category: "verification", expected: "needs_input", detail: "Two unsupported values for the same material subject" },
  { id: "fake-provenance", category: "grounding", expected: "reject", detail: "Worker supplies an unknown sourceRef" },
  { id: "unsupported-live", category: "grounding", expected: "needs_input", detail: "Current ranking claimed without a live source" },
  { id: "execution-claim", category: "rights", expected: "reject", detail: "Worker claims deployment, database change, email, website update, or invoice charge" },
  { id: "malformed-output", category: "schema", expected: "reject", detail: "Repair-exhausted worker payload does not match its schema" },
  { id: "unnecessary-critic", category: "verification", expected: "reject", detail: "Critic selected for a trivial SEO metadata task" },
  { id: "missing-critic", category: "verification", expected: "reject", detail: "Security-sensitive plan omits independent verification" },
  { id: "workspace-contamination", category: "tenancy", expected: "reject", detail: "Lumora evidence enters an Averon or Movento result" },
] as const;
