# Shop V1 audit working record

This branch records the dependency audit before consolidation. Main Admin remains locked. Production entrypoints are api/worker.js and _web_worker.js. The audit will classify direct runtime files, indirect dependencies, legacy-but-referenced files, and proven-unused files before deletion.
