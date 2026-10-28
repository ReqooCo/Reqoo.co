# Quotation revisions

Existing quotations are Rev 0 without a backfill. One additive archive table stores the complete previous document and item snapshot in the same D1 batch as replacement of the current items. The quotation ID, number, share token and order linkage remain stable. Archive rows reject updates and deletes.

Editors submit expectedRevision and expectedUpdatedAt. The archive insert checks the persisted header and revision inside the transaction; conflicts abort the entire batch. Revising resets approval. Conversion requires acceptance, uses a deterministic order ID and checks the source revision in the transaction. No provider payment is made by these operations.

Deploy migration 0013 through the existing deploy workflow before the API and web workers. Reapplying it is safe. Do not drop the archive table or restore an older database during rollback. If rolling back to code predating revision support, disable quotation editing/conversion until a forward fix is deployed: older application code cannot preserve new revision semantics. Archives remain available for a forward deployment. Original versions overwritten before this release cannot be reconstructed.

Run `node tests/admin-quotation-revisions.mjs` and the Documents workspace regression workflow. Tests use an isolated in-memory SQLite database only.
