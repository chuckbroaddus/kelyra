/**
 * Ingest files-bucket path contract (FL-19 / I0 storage).
 * Shape: {uid}/ingest/{batch_id}/** — must match register_ingest_file RPC bind.
 */

/** Expected storage path prefix including trailing slash. */
export function ingestStoragePathPrefix(uid: string, batchId: string): string {
  return `${uid}/ingest/${batchId}/`;
}

/** True when storagePath is strictly under the uid/ingest/batch_id prefix. */
export function isIngestStoragePathBound(
  storagePath: string,
  uid: string,
  batchId: string,
): boolean {
  const prefix = ingestStoragePathPrefix(uid, batchId);
  return (
    typeof storagePath === 'string' &&
    storagePath.length > prefix.length &&
    storagePath.startsWith(prefix)
  );
}
