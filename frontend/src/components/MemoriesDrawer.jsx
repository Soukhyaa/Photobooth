import React, { useState, useEffect, useRef } from 'react';
import {
  listMemories,
  getMemory,
  deleteMemory,
  fetchAuthenticatedBlob,
  downloadAuthenticatedAsset,
  formatExpiration,
  formatCreationDate
} from '../utils/api';
import { soundEngine } from '../utils/audio';

export default function MemoriesDrawer({ isOpen, onClose }) {
  const [memories, setMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Selected memory for full inspection
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Active playing video clip in detail view
  const [activePlayingIndex, setActivePlayingIndex] = useState(null);

  // Deletion confirmation state
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cache of object URLs: urlKey -> objectUrl
  const objectUrlsRef = useRef(new Map());

  // Revoke cached Object URLs
  const cleanupObjectUrls = () => {
    objectUrlsRef.current.forEach((blobUrl) => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {}
    });
    objectUrlsRef.current.clear();
  };

  useEffect(() => {
    return () => {
      cleanupObjectUrls();
    };
  }, []);

  // Fetch memories list when drawer opens
  useEffect(() => {
    if (isOpen) {
      soundEngine?.playCurtain?.();
      loadMemories();
    } else {
      setSelectedMemory(null);
      setDetailError(null);
      setDeletingId(null);
    }
  }, [isOpen]);

  const loadMemories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listMemories();
      setMemories(data || []);
    } catch (err) {
      console.error('Failed to load memories:', err);
      setError(err.message || 'Could not load your memories. Please ensure backend is active.');
    } finally {
      setIsLoading(false);
    }
  };

  // Open detail view for a specific memory
  const handleOpenDetail = async (memId) => {
    setIsLoadingDetail(true);
    setDetailError(null);
    setActivePlayingIndex(null);
    try {
      const detail = await getMemory(memId);
      setSelectedMemory(detail);
    } catch (err) {
      console.error('Failed to load memory detail:', err);
      setDetailError('Could not load memory details. Please try again.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Delete memory
  const handleConfirmDelete = async (memId) => {
    setIsDeleting(true);
    try {
      await deleteMemory(memId);
      setMemories((prev) => prev.filter((m) => m.id !== memId));
      if (selectedMemory?.id === memId) {
        setSelectedMemory(null);
      }
      setDeletingId(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert(`Could not delete memory: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Safe authenticated media loader hook
  const useAuthenticatedMedia = (url) => {
    const [mediaSrc, setMediaSrc] = useState(null);

    useEffect(() => {
      if (!url) return;
      if (objectUrlsRef.current.has(url)) {
        setMediaSrc(objectUrlsRef.current.get(url));
        return;
      }

      let isMounted = true;
      fetchAuthenticatedBlob(url)
        .then((blobUrl) => {
          if (isMounted) {
            objectUrlsRef.current.set(url, blobUrl);
            setMediaSrc(blobUrl);
          } else {
            URL.revokeObjectURL(blobUrl);
          }
        })
        .catch((err) => {
          console.warn(`Could not load media at ${url}:`, err);
        });

      return () => {
        isMounted = false;
      };
    }, [url]);

    return mediaSrc;
  };

  // Thumbnail Card Component
  const MemoryCard = ({ memory }) => {
    const thumbSrc = useAuthenticatedMedia(memory.thumbnail_url);

    return (
      <div className="album-memory-card">
        {/* Thumbnail Frame */}
        <div
          className="album-card-preview"
          onClick={() => handleOpenDetail(memory.id)}
          title="Click to view full memory album"
        >
          {thumbSrc ? (
            <img
              src={thumbSrc}
              alt={memory.caption || 'Vintage Photo Strip'}
              className="album-thumb-img"
              loading="lazy"
            />
          ) : (
            <div className="album-thumb-placeholder">
              <span className="spinner-cog">⚙️</span>
              <span>Loading strip...</span>
            </div>
          )}
          <div className="album-hover-inspect">
            <span>🔍 INSPECT</span>
          </div>
        </div>

        {/* Card Info */}
        <div className="album-card-body">
          <div className="album-card-caption" title={memory.caption}>
            {memory.caption || 'UNTITLED MEMORY'}
          </div>

          <div className="album-card-meta-row">
            <span className="album-meta-date">{memory.date_text || formatCreationDate(memory.created_at)}</span>
            <span className="album-meta-tag">
              {memory.design_id === 'solid_colors' ? 'SOLID' : memory.design_id.replace('_', ' ').toUpperCase()}
              {memory.capture_mode === 'live' ? ' • LIVE' : ''}
            </span>
          </div>

          {/* Expiration badge directly from server expires_at */}
          <div className="album-card-expiration">
            <span className="exp-icon">⏳</span>
            <span>{formatExpiration(memory.expires_at)}</span>
          </div>

          {/* Action Row */}
          <div className="album-card-actions">
            <button
              type="button"
              className="album-btn inspect-btn"
              onClick={() => handleOpenDetail(memory.id)}
            >
              OPEN
            </button>

            <button
              type="button"
              className="album-btn dl-btn"
              onClick={() => downloadAuthenticatedAsset(memory.strip_url, `vintage-strip-${memory.id.slice(0, 8)}.png`)}
              title="Download Full-Res PNG Strip"
            >
              📥 PNG
            </button>

            {deletingId === memory.id ? (
              <div className="inline-delete-confirm">
                <span className="confirm-text">Delete?</span>
                <button
                  type="button"
                  className="confirm-yes-btn"
                  onClick={() => handleConfirmDelete(memory.id)}
                  disabled={isDeleting}
                >
                  {isDeleting ? '...' : 'YES'}
                </button>
                <button
                  type="button"
                  className="confirm-no-btn"
                  onClick={() => setDeletingId(null)}
                  disabled={isDeleting}
                >
                  NO
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="album-btn delete-btn"
                onClick={() => setDeletingId(memory.id)}
                title="Delete this memory"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Detail View Sub-Component
  const MemoryDetailView = ({ detail }) => {
    const fullStripSrc = useAuthenticatedMedia(detail.strip_url);
    const videoStripSrc = useAuthenticatedMedia(detail.live_strip_video_url);

    return (
      <div className="album-detail-view">
        <div className="detail-top-nav">
          <button
            type="button"
            className="detail-back-btn"
            onClick={() => setSelectedMemory(null)}
          >
            ◀ BACK TO ALBUM
          </button>
          <div className="detail-title-block">
            <h3 className="detail-caption">{detail.caption || 'UNTITLED MEMORY'}</h3>
            <span className="detail-meta">
              Saved on {formatCreationDate(detail.created_at)} • {formatExpiration(detail.expires_at)}
            </span>
          </div>
        </div>

        <div className="detail-content-columns">
          {/* Left Column: Full Strip Display */}
          <div className="detail-strip-col">
            <div className="detail-strip-card">
              {fullStripSrc ? (
                <img
                  src={fullStripSrc}
                  alt={detail.caption || 'Full Photo Strip'}
                  className="detail-full-strip-img"
                />
              ) : (
                <div className="detail-strip-loading">
                  <span className="spinner-cog">⚙️</span>
                  <span>Loading full-resolution strip...</span>
                </div>
              )}
            </div>

            <div className="detail-strip-downloads">
              <button
                type="button"
                className="detail-action-btn primary-dl"
                onClick={() => downloadAuthenticatedAsset(detail.strip_url, `vintage-strip-${detail.id.slice(0, 8)}.png`)}
              >
                📥 DOWNLOAD STRIP (PNG)
              </button>

              {detail.live_strip_video_url && (
                <button
                  type="button"
                  className="detail-action-btn video-dl"
                  onClick={() => downloadAuthenticatedAsset(detail.live_strip_video_url, `vintage-live-strip-${detail.id.slice(0, 8)}.mp4`)}
                >
                  🎞️ DOWNLOAD LIVE VIDEO STRIP
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Individual Poses & Live Video Clips */}
          <div className="detail-assets-col">
            <div className="detail-section-card">
              <div className="detail-section-header">
                <span className="section-title">INDIVIDUAL POSES (4 FRAMES)</span>
                {detail.capture_mode === 'live' && (
                  <span className="live-pill">✦ LIVE CLIPS AVAILABLE</span>
                )}
              </div>

              <div className="detail-frames-grid">
                {detail.frames?.map((frame) => (
                  <FrameCard
                    key={`frame-${frame.photo_index}`}
                    frame={frame}
                    memoryId={detail.id}
                    isPlaying={activePlayingIndex === frame.photo_index}
                    onTogglePlay={() =>
                      setActivePlayingIndex((prev) =>
                        prev === frame.photo_index ? null : frame.photo_index
                      )
                    }
                  />
                ))}
              </div>
            </div>

            {/* Optional Animated Strip Player */}
            {videoStripSrc && (
              <div className="detail-video-strip-card">
                <div className="detail-section-header">
                  <span className="section-title">ANIMATED VIDEO STRIP PREVIEW</span>
                </div>
                <video
                  src={videoStripSrc}
                  controls
                  loop
                  className="detail-video-player"
                />
              </div>
            )}

            {/* Danger Zone: Delete Memory */}
            <div className="detail-danger-zone">
              {deletingId === detail.id ? (
                <div className="detail-confirm-box">
                  <span>Permanently delete this memory and all its photos?</span>
                  <div className="confirm-buttons">
                    <button
                      type="button"
                      className="confirm-yes-btn"
                      onClick={() => handleConfirmDelete(detail.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'YES, DELETE'}
                    </button>
                    <button
                      type="button"
                      className="confirm-no-btn"
                      onClick={() => setDeletingId(null)}
                      disabled={isDeleting}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="detail-delete-btn"
                  onClick={() => setDeletingId(detail.id)}
                >
                  🗑️ DELETE THIS ENTIRE MEMORY
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Single Frame Card within Detail View
  const FrameCard = ({ frame, memoryId, isPlaying, onTogglePlay }) => {
    const photoSrc = useAuthenticatedMedia(frame.photo_url);
    const videoSrc = useAuthenticatedMedia(frame.live_video_url);

    return (
      <div className="detail-frame-item">
        <div className="frame-media-box">
          {isPlaying && videoSrc ? (
            <video
              src={videoSrc}
              autoPlay
              loop
              playsInline
              className="frame-video-element"
            />
          ) : photoSrc ? (
            <img
              src={photoSrc}
              alt={`Pose #${frame.photo_index}`}
              className="frame-img-element"
            />
          ) : (
            <div className="frame-placeholder">...</div>
          )}

          {frame.live_video_url && (
            <button
              type="button"
              className="frame-play-badge"
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause motion' : 'Play Live Motion'}
            >
              {isPlaying ? '⏸' : '▶ LIVE'}
            </button>
          )}
        </div>

        <div className="frame-footer-actions">
          <span className="frame-idx-label">POSE #{frame.photo_index}</span>
          <div className="frame-btn-row">
            <button
              type="button"
              className="frame-dl-btn"
              onClick={() => downloadAuthenticatedAsset(frame.photo_url, `pose-${frame.photo_index}.png`)}
              title="Download still photo"
            >
              📷 Still
            </button>
            {frame.live_video_url && (
              <button
                type="button"
                className="frame-dl-btn video-pill"
                onClick={() => downloadAuthenticatedAsset(frame.live_video_url, `pose-${frame.photo_index}-live.mp4`)}
                title="Download live clip"
              >
                📹 Clip
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="memories-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="memories-drawer-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-brand">
            <span className="drawer-star">★</span>
            <h2 className="drawer-title">MY PHOTO ALBUM</h2>
            <span className="drawer-star">★</span>
          </div>

          <p className="drawer-subtitle">
            Privately saved in your browser • Automatically archived after 7 days
          </p>

          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close My Memories"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Drawer Main Body */}
        <div className="drawer-body">
          {selectedMemory ? (
            <MemoryDetailView detail={selectedMemory} />
          ) : isLoadingDetail ? (
            <div className="drawer-loading-view">
              <div className="retro-cog-spinner">⚙️</div>
              <p>Opening memory album details...</p>
            </div>
          ) : isLoading ? (
            <div className="drawer-loading-view">
              <div className="retro-cog-spinner">⚙️</div>
              <p>Opening your private photo album...</p>
            </div>
          ) : error ? (
            <div className="drawer-error-view">
              <span className="error-icon">⚠️</span>
              <p className="error-text">{error}</p>
              <button type="button" className="retry-btn" onClick={loadMemories}>
                RETRY
              </button>
            </div>
          ) : memories.length === 0 ? (
            <div className="drawer-empty-view">
              <div className="empty-album-icon">📖</div>
              <h3 className="empty-title">NO MEMORIES SAVED YET</h3>
              <p className="empty-desc">
                Step inside the booth, take your 4 poses, and click <strong>SAVE TO MY MEMORIES</strong> on the preview screen to preserve your vintage strips here.
              </p>
              <div className="empty-tip-pill">
                <span>✦ Private to this browser • Never shared publicly • 7-day retention</span>
              </div>
            </div>
          ) : (
            <div className="album-grid">
              {memories.map((mem) => (
                <MemoryCard key={mem.id} memory={mem} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
