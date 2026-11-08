// Shared hard limits across the native CAD engine and the authenticated MCP bridge.
// Verify memory/rebuild performance before raising further.
// Assembly history ceiling. Raise only with CAD kernel and bridge regressions on Draft.\nexport const MAX_PROJECT_FEATURES=500;
export const MAX_BRIDGE_STATE_BYTES=450000;
export const MAX_NATIVE_BODIES=80;
