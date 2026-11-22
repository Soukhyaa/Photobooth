/**
 * Vintage Booth API Client
 * Manages anonymous browser identity (UUID) in localStorage and handles
 * communication with the backend /api/memories endpoints.
 */

const TOKEN_STORAGE_KEY = 'vintage_booth_client_token';

/**
 * Retrieve or generate a cryptographically secure UUID for this browser.
 * Never logged or exposed in the UI.
 */
export function getClientToken() {
  let token = null;
  try {
    token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
      token = crypto.randomUUID();
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  } catch (err) {
    console.warn('localStorage inaccessible, using session UUID:', err);
    token = crypto.randomUUID();
  }
  return token;
}

/**
 * Convert a base64 Data URL to a native binary Blob
 */
export function dataUrlToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new Error('Invalid dataUrl supplied to dataUrlToBlob');
  }
  const parts = dataUrl.split(',');
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'image/png';
  const binary = atob(parts[1] || '');
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

/**
 * Helper to build standard headers including anonymous client identity
 */
function getHeaders(customHeaders = {}) {
  return {
    'X-Client-Token': getClientToken(),
    ...customHeaders
  };
}

/**
 * Save a complete photo booth strip session (opt-in)
 */
export async function saveMemory({
  stripBlob,
  photoBlobs = [],
  liveClips = [],
  liveStripBlob = null,
  metadata = {}
}) {
  if (!stripBlob) {
    throw new Error('A composed photo strip Blob is required to save a memory.');
  }
  if (!photoBlobs || photoBlobs.length !== 4) {
    throw new Error(`Expected exactly 4 photo Blobs, got ${photoBlobs ? photoBlobs.length : 0}`);
  }

  const formData = new FormData();
  formData.append('strip_image', stripBlob, 'photo-strip.png');

  photoBlobs.forEach((pBlob, idx) => {
    const ext = pBlob.type === 'image/jpeg' ? 'jpg' : 'png';
    formData.append('photos', pBlob, `photo_${idx + 1}.${ext}`);
  });

  if (liveClips && liveClips.length > 0) {
    liveClips.forEach((cBlob, idx) => {
      if (cBlob) {
        const ext = cBlob.type?.includes('mp4') ? 'mp4' : 'webm';
        formData.append('live_clips', cBlob, `live_clip_${idx + 1}.${ext}`);
      }
    });
  }

  if (liveStripBlob) {
    const ext = liveStripBlob.type?.includes('mp4') ? 'mp4' : 'webm';
    formData.append('live_strip_video', liveStripBlob, `live_strip.${ext}`);
  }

  formData.append('metadata', JSON.stringify(metadata));

  const response = await fetch('/api/memories', {
    method: 'POST',
    headers: getHeaders(),
    body: formData
  });

  if (!response.ok) {
    let errorDetail = 'Failed to save memory';
    try {
      const errJson = await response.json();
      if (errJson?.detail) errorDetail = errJson.detail;
    } catch {
      errorDetail = `Server returned status ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return await response.json();
}

/**
 * List all non-expired memories belonging to this browser
 */
export async function listMemories() {
  const response = await fetch('/api/memories', {
    method: 'GET',
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error(`Failed to load memories (${response.status}: ${response.statusText})`);
  }

  return await response.json();
}

/**
 * Retrieve full detail for a specific memory
 */
export async function getMemory(memoryId) {
  const response = await fetch(`/api/memories/${encodeURIComponent(memoryId)}`, {
    method: 'GET',
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error(`Failed to load memory detail (${response.status}: ${response.statusText})`);
  }

  return await response.json();
}

/**
 * Delete a saved memory permanently
 */
export async function deleteMemory(memoryId) {
  const response = await fetch(`/api/memories/${encodeURIComponent(memoryId)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error(`Failed to delete memory (${response.status}: ${response.statusText})`);
  }

  return await response.json();
}

/**
 * Fetch a protected asset (strip, thumbnail, photo, video) using the client token
 * and return a temporary Object URL.
 */
export async function fetchAuthenticatedBlob(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error(`Asset load error: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * Download a protected asset directly to the user's device
 */
export async function downloadAuthenticatedAsset(url, defaultFilename) {
  const blobUrl = await fetchAuthenticatedBlob(url);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = defaultFilename;
  link.style.position = 'fixed';
  link.style.left = '-9999px';
  link.style.opacity = '0';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (link.parentNode) link.parentNode.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }, 1200);
}

/**
 * Format server-provided ISO expires_at timestamp nicely
 */
export function formatExpiration(expiresAtIso) {
  if (!expiresAtIso) return '';
  const expiresDate = new Date(expiresAtIso);
  const now = new Date();
  const diffMs = expiresDate.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const formattedDate = expiresDate.toLocaleDateString(undefined, options);

  if (diffMs <= 0) {
    return 'Expired today';
  } else if (diffHours < 24) {
    return `Expires today (${diffHours}h remaining)`;
  } else if (diffDays === 1) {
    return `Expires tomorrow (${formattedDate})`;
  } else {
    return `Expires in ${diffDays} days (${formattedDate})`;
  }
}

/**
 * Format creation date
 */
export function formatCreationDate(createdAtIso) {
  if (!createdAtIso) return '';
  const date = new Date(createdAtIso);
  const options = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return date.toLocaleDateString(undefined, options);
}
