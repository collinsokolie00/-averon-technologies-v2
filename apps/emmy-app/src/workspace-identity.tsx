import { useState } from "react";
import type { Workspace } from "@averon/shared-types";
import { workspaceLogo } from "./workspace-identity-config";

export function WorkspaceIdentityMark({ workspace, className = "workspace-monogram" }: { workspace: Pick<Workspace, "name" | "slug" | "logoUrl">; className?: string }) { const [failed, setFailed] = useState(false); const src = workspaceLogo(workspace); return <span className={`${className} workspace-identity-mark`}>{src && !failed ? <img src={src} alt="" onError={() => setFailed(true)}/> : <span aria-hidden="true">{workspace.name.slice(0, 1).toUpperCase()}</span>}</span>; }
