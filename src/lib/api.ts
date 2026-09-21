import { announceChange } from "./events";
import type { AuthUser, CommentaryRecord, NewCommentary } from "./types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = init.body ? { "Content-Type": "application/json" } : {};
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> | undefined) } });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

const post = <T>(url: string, body: unknown = {}) => request<T>(url, { method: "POST", body: JSON.stringify(body) });

// ---- Auth ----------------------------------------------------------------

export interface SessionInfo {
  user: AuthUser | null;
  signupsOpen: boolean;
}

export const getSession = () => request<SessionInfo>("/api/auth/me");
export const login = (email: string, password: string) => post<{ user: AuthUser }>("/api/auth/login", { email, password });
export const register = (email: string, password: string, name?: string) =>
  post<{ user: AuthUser }>("/api/auth/register", { email, password, name });
export const logout = () => post<{ ok: true }>("/api/auth/logout");

// ---- Commentaries --------------------------------------------------------

export async function listCommentaries(book?: number, chapter?: number): Promise<CommentaryRecord[]> {
  const qs = book != null && chapter != null ? `?book=${book}&chapter=${chapter}` : "";
  const { commentaries } = await request<{ commentaries: CommentaryRecord[] }>(`/api/commentaries${qs}`);
  return commentaries;
}

/** PUT the audio straight to R2 using XHR so we can report progress. */
function upload(url: string, blob: Blob, onProgress?: (fraction: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", blob.type); // must match what the server signed
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new ApiError(xhr.status, `Upload failed (${xhr.status}). If this keeps happening, check the bucket's CORS rule.`));
    xhr.onerror = () =>
      reject(new ApiError(0, "Couldn't reach storage. Check your connection, and that the bucket's CORS rule allows this site."));
    xhr.send(blob);
  });
}

/**
 * Three steps: register the recording (get an upload URL), upload the audio to R2, then confirm.
 * If anything after step 1 fails, the half-created recording is removed.
 */
export async function createCommentary(
  meta: NewCommentary,
  blob: Blob,
  onProgress?: (fraction: number) => void,
): Promise<CommentaryRecord> {
  const created = await post<{ id: string; uploadUrl: string }>("/api/commentaries", {
    ...meta,
    mimeType: blob.type,
    sizeBytes: blob.size,
  });

  try {
    await upload(created.uploadUrl, blob, onProgress);
    const { record } = await post<{ record: CommentaryRecord }>(`/api/commentaries/${created.id}/complete`);
    announceChange();
    return record;
  } catch (error) {
    await request(`/api/commentaries/${created.id}`, { method: "DELETE" }).catch(() => undefined);
    throw error;
  }
}

export async function renameCommentary(id: string, title: string): Promise<void> {
  await request(`/api/commentaries/${id}`, { method: "PATCH", body: JSON.stringify({ title }) });
  announceChange();
}

export async function removeCommentary(id: string): Promise<void> {
  await request(`/api/commentaries/${id}`, { method: "DELETE" });
  announceChange();
}
