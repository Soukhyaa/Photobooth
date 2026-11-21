import React from 'react';

export default function ReviewSet({ capturedPhotos, selectedFilter, onRetake }) {
  return (
    <div className="review-set-container">
      <div className="review-set-header">
        <div className="review-badge">
          <span className="badge-star">★</span>
          <span>4 POSES CAPTURED IN MEMORY</span>
          <span className="badge-star">★</span>
        </div>
        <h2 className="review-title">Review Your Four Shots</h2>
        <p className="review-subtitle">
          Filter: <strong>{selectedFilter.name}</strong> • Temporary memory only (not saved or uploaded)
        </p>
      </div>

      {/* 4 Photo Grid */}
      <div className="review-photos-grid">
        {capturedPhotos.map((photo, index) => (
          <div key={photo.id || index} className="review-photo-card">
            <div className="photo-card-inner">
              <img
                src={photo.dataUrl}
                alt={`Photo pose ${index + 1}`}
                className="review-photo-img"
              />
              <div className="photo-card-badge">
                <span>POSE #{index + 1}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Controls */}
      <div className="review-actions-bar">
        <button
          type="button"
          className="review-retake-btn"
          onClick={onRetake}
          aria-label="Retake all four photos"
        >
          <span className="btn-icon">🔄</span>
          <span>RETAKE ENTIRE SET</span>
        </button>

        <div className="stage-milestone-pill">
          <span>Stage 3 Completed: 4 Photos Captured Sequentially!</span>
        </div>
      </div>
    </div>
  );
}
