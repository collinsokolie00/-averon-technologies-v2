import type { AiDiagnostic } from "@averon/shared-types";

export function diagnosticStatus(item: AiDiagnostic) {
  return item.operationStatus ? item.operationStatus.replaceAll("_", " ") : item.finalStatus;
}
