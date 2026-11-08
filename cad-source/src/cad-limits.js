// Shared hard limits across the native CAD engine and the authenticated MCP bridge.
// Large assemblies: 1000 history features; load/memory and rebuild latency remain QA gates.
// Do not increase the native body or bridge payload limits without independent testing.
export const MAX_PROJECT_FEATURES=1000;
export const MAX_BRIDGE_STATE_BYTES=450000;
export const MAX_NATIVE_BODIES=80;
