const endpoint = process.env.AVERON_API_VERSION_URL || "http://localhost:8787/api/v1/version";
const response = await fetch(endpoint, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5_000) });
if (!response.ok) throw new Error(`Averon API version check failed with HTTP ${response.status}.`);
const payload = await response.json(); const data = payload?.data;
const requiredDependency = "blog.draft.update=content.blog_drafting"; const requiredAdapter = "blog-update-allowlisted-intent-patch-v1";
if (!data?.actionDependencyFingerprint?.includes(requiredDependency) || data?.blogUpdateAdapterFingerprint !== requiredAdapter || !data?.actionRuntimeFingerprint?.includes(requiredAdapter)) throw new Error("Running API does not contain the current Blog Draft Update action dependencies and payload adapter.");
console.log(JSON.stringify({ ready: true, runtimeStartedAt: data.runtimeStartedAt, actionDependencyFingerprint: data.actionDependencyFingerprint, blogUpdateAdapterFingerprint: data.blogUpdateAdapterFingerprint }));
