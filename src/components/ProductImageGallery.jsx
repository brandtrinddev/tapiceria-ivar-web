import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDrag, useGesture } from '@use-gesture/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExpand,
  faXmark,
  faMagnifyingGlassPlus,
  faMagnifyingGlassMinus,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

const LENS_SIZE = 160;
const MAGNIFIER_ZOOM = 2.5;
const MIN_ZOOM = 1;
const ABSOLUTE_MAX_ZOOM = 4;
const SWIPE_THRESHOLD = 40;

function computeMaxUsefulZoom(naturalWidth, naturalHeight, displayWidth, displayHeight) {
  if (!naturalWidth || !naturalHeight || !displayWidth || !displayHeight) {
    return 1;
  }

  const ratio = Math.min(
    naturalWidth / displayWidth,
    naturalHeight / displayHeight,
  );

  if (ratio <= 1.02) return 1;
  return Math.min(ABSOLUTE_MAX_ZOOM, Math.round(ratio * 100) / 100);
}

function getContainedImageRect(containerWidth, containerHeight, naturalWidth, naturalHeight) {
  if (!naturalWidth || !naturalHeight) {
    return {
      width: containerWidth,
      height: containerHeight,
      offsetX: 0,
      offsetY: 0,
    };
  }

  const containerAspect = containerWidth / containerHeight;
  const imageAspect = naturalWidth / naturalHeight;

  if (imageAspect > containerAspect) {
    const width = containerWidth;
    const height = containerWidth / imageAspect;
    return {
      width,
      height,
      offsetX: 0,
      offsetY: (containerHeight - height) / 2,
    };
  }

  const height = containerHeight;
  const width = containerHeight * imageAspect;
  return {
    width,
    height,
    offsetX: (containerWidth - width) / 2,
    offsetY: 0,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ProductImageGallery({
  images,
  selectedImage,
  onSelectImage,
  productName,
  getThumbUrl,
  onPrevious,
  onNext,
}) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const lightboxStageRef = useRef(null);
  const lightboxImageRef = useRef(null);
  const lightboxZoomRef = useRef(1);
  const lightboxPanRef = useRef({ x: 0, y: 0 });
  const maxLightboxZoomRef = useRef(1);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [magnifier, setMagnifier] = useState(null);
  const [canUseMagnifier, setCanUseMagnifier] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxPan, setLightboxPan] = useState({ x: 0, y: 0 });
  const [maxLightboxZoom, setMaxLightboxZoom] = useState(1);

  const currentIndex = useMemo(
    () => images.indexOf(selectedImage),
    [images, selectedImage],
  );

  const resetLightboxView = useCallback(() => {
    lightboxZoomRef.current = 1;
    lightboxPanRef.current = { x: 0, y: 0 };
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
    if (lightboxImageRef.current) {
      lightboxImageRef.current.style.transform = 'translate3d(0px, 0px, 0) scale(1)';
    }
  }, []);

  const applyLightboxTransform = useCallback(() => {
    const img = lightboxImageRef.current;
    if (!img) return;

    const { x, y } = lightboxPanRef.current;
    const zoom = lightboxZoomRef.current;
    img.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`;
  }, []);

  const syncLightboxState = useCallback(() => {
    setLightboxZoom(lightboxZoomRef.current);
    setLightboxPan({ ...lightboxPanRef.current });
  }, []);

  const updateLightboxZoomLimit = useCallback(() => {
    const img = lightboxImageRef.current;
    if (!img) return;

    const nextMax = computeMaxUsefulZoom(
      img.naturalWidth,
      img.naturalHeight,
      img.clientWidth,
      img.clientHeight,
    );

    maxLightboxZoomRef.current = nextMax;
    setMaxLightboxZoom(nextMax);

    if (lightboxZoomRef.current > nextMax) {
      lightboxZoomRef.current = nextMax;
      setLightboxZoom(nextMax);
      applyLightboxTransform();
    }
  }, [applyLightboxTransform]);

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanUseMagnifier(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!isLightboxOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsLightboxOpen(false);
      }
      if (event.key === 'ArrowLeft') {
        onPrevious();
        resetLightboxView();
      }
      if (event.key === 'ArrowRight') {
        onNext();
        resetLightboxView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, onNext, onPrevious, resetLightboxView]);

  useEffect(() => {
    lightboxZoomRef.current = 1;
    lightboxPanRef.current = { x: 0, y: 0 };
    maxLightboxZoomRef.current = 1;
    setLightboxZoom(1);
    setMaxLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
    setMagnifier(null);
  }, [selectedImage]);

  useEffect(() => {
    if (!isLightboxOpen) return;
    applyLightboxTransform();
  }, [isLightboxOpen, selectedImage, applyLightboxTransform]);

  useEffect(() => {
    if (!isLightboxOpen) return undefined;

    const frameId = requestAnimationFrame(() => updateLightboxZoomLimit());
    const handleResize = () => updateLightboxZoomLimit();
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isLightboxOpen, selectedImage, updateLightboxZoomLimit]);

  const openLightbox = useCallback(() => {
    setHintDismissed(true);
    lightboxZoomRef.current = 1;
    lightboxPanRef.current = { x: 0, y: 0 };
    setIsLightboxOpen(true);
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
  }, []);

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
    lightboxZoomRef.current = 1;
    lightboxPanRef.current = { x: 0, y: 0 };
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
  }, []);

  const updateMagnifier = useCallback(
    (clientX, clientY) => {
      if (!canUseMagnifier || !containerRef.current || !imageRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const { naturalWidth, naturalHeight } = imageRef.current;
      const imageRect = getContainedImageRect(
        containerRect.width,
        containerRect.height,
        naturalWidth,
        naturalHeight,
      );

      const localX = clientX - containerRect.left;
      const localY = clientY - containerRect.top;
      const imageX = localX - imageRect.offsetX;
      const imageY = localY - imageRect.offsetY;

      const isInsideImage =
        imageX >= 0 &&
        imageY >= 0 &&
        imageX <= imageRect.width &&
        imageY <= imageRect.height;

      if (!isInsideImage) {
        setMagnifier(null);
        return;
      }

      const magnifierZoom = Math.min(
        MAGNIFIER_ZOOM,
        naturalWidth / imageRect.width,
        naturalHeight / imageRect.height,
      );

      if (magnifierZoom <= 1.02) {
        setMagnifier(null);
        return;
      }

      setMagnifier({
        lensX: localX,
        lensY: localY,
        backgroundSizeX: imageRect.width * magnifierZoom,
        backgroundSizeY: imageRect.height * magnifierZoom,
        backgroundPosX: -(imageX * magnifierZoom - LENS_SIZE / 2),
        backgroundPosY: -(imageY * magnifierZoom - LENS_SIZE / 2),
      });
    },
    [canUseMagnifier],
  );

  const galleryBind = useDrag(
    ({ swipe: [swipeX], movement: [mx], tap, last }) => {
      if (tap) {
        openLightbox();
        return;
      }
      if (last && Math.abs(mx) > SWIPE_THRESHOLD) {
        setHintDismissed(true);
      }
      if (swipeX === -1) onNext();
      if (swipeX === 1) onPrevious();
    },
    { axis: 'x', filterTaps: true },
  );

  useGesture(
    {
      onDrag: ({
        movement: [mx, my],
        swipe: [swipeX],
        pinching,
        first,
        last,
        cancel,
        memo,
      }) => {
        if (pinching) {
          cancel();
          return memo;
        }

        if (lightboxZoomRef.current > 1) {
          if (first || !memo) {
            memo = { pan: { ...lightboxPanRef.current } };
          }

          lightboxPanRef.current = {
            x: memo.pan.x + mx,
            y: memo.pan.y + my,
          };
          applyLightboxTransform();

          if (last) {
            syncLightboxState();
          }

          return memo;
        }

        if (last) {
          if (swipeX === -1) onNext();
          if (swipeX === 1) onPrevious();
        }

        return memo;
      },
      onPinch: ({ offset: [scale], last }) => {
        const nextZoom = clamp(scale, MIN_ZOOM, maxLightboxZoomRef.current);
        lightboxZoomRef.current = nextZoom;

        if (nextZoom <= 1) {
          lightboxPanRef.current = { x: 0, y: 0 };
        }

        applyLightboxTransform();

        if (last) {
          syncLightboxState();
        }
      },
      onWheel: ({ event, delta: [, deltaY], last }) => {
        event.preventDefault();
        const delta = deltaY > 0 ? -0.15 : 0.15;
        const next = clamp(
          lightboxZoomRef.current + delta,
          MIN_ZOOM,
          maxLightboxZoomRef.current,
        );
        lightboxZoomRef.current = next;

        if (next <= 1) {
          lightboxPanRef.current = { x: 0, y: 0 };
        }

        applyLightboxTransform();

        if (last) {
          syncLightboxState();
        }
      },
    },
    {
      target: lightboxStageRef,
      eventOptions: { passive: false },
      pinch: {
        from: () => [lightboxZoomRef.current, 0],
        scaleBounds: { min: MIN_ZOOM, max: ABSOLUTE_MAX_ZOOM },
        rubberband: false,
      },
      drag: {
        filterTaps: true,
        pointer: { touch: true },
      },
      enabled: isLightboxOpen,
    },
  );

  const adjustZoom = (delta) => {
    const next = clamp(
      lightboxZoomRef.current + delta,
      MIN_ZOOM,
      maxLightboxZoomRef.current,
    );
    lightboxZoomRef.current = next;

    if (next <= 1) {
      lightboxPanRef.current = { x: 0, y: 0 };
    }

    applyLightboxTransform();
    syncLightboxState();
  };

  const handleThumbnailClick = (imageUrl) => {
    onSelectImage(imageUrl);
    setHintDismissed(true);
  };

  const lightboxContent = isLightboxOpen
    ? createPortal(
        <div
          className="product-image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Vista ampliada de ${productName}`}
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="lightbox-close-btn"
            onClick={closeLightbox}
            aria-label="Cerrar vista ampliada"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>

          <div className="lightbox-toolbar" onClick={(event) => event.stopPropagation()}>
            {images.length > 1 && (
              <span className="lightbox-counter">
                {currentIndex + 1} / {images.length}
              </span>
            )}
            <div className="lightbox-zoom-controls">
              <button
                type="button"
                onClick={() => adjustZoom(-0.5)}
                aria-label="Reducir zoom"
                disabled={lightboxZoom <= MIN_ZOOM}
              >
                <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
              </button>
              <span>{Math.round(lightboxZoom * 100)}%</span>
              <button
                type="button"
                onClick={() => adjustZoom(0.5)}
                aria-label="Aumentar zoom"
                disabled={lightboxZoom >= maxLightboxZoom - 0.01}
              >
                <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
              </button>
            </div>
            {maxLightboxZoom <= 1.02 && (
              <span className="lightbox-zoom-note">Detalle máximo de la imagen</span>
            )}
          </div>

          <div className="lightbox-stage" ref={lightboxStageRef} onClick={(event) => event.stopPropagation()}>
            {images.length > 1 && (
              <button
                type="button"
                className="lightbox-nav prev"
                onClick={() => {
                  onPrevious();
                  resetLightboxView();
                }}
                aria-label="Imagen anterior"
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
            )}

            <img
              ref={lightboxImageRef}
              src={selectedImage}
              alt={productName}
              className="lightbox-image"
              draggable={false}
              onLoad={updateLightboxZoomLimit}
            />

            {images.length > 1 && (
              <button
                type="button"
                className="lightbox-nav next"
                onClick={() => {
                  onNext();
                  resetLightboxView();
                }}
                aria-label="Siguiente imagen"
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            )}
          </div>

          {images.length > 1 && (
            <div className="lightbox-thumbnails" onClick={(event) => event.stopPropagation()}>
              {images.map((imgUrl, index) => (
                <button
                  type="button"
                  key={imgUrl}
                  className={`lightbox-thumb ${selectedImage === imgUrl ? 'active' : ''}`}
                  onClick={() => handleThumbnailClick(imgUrl)}
                  aria-label={`Ver imagen ${index + 1}`}
                >
                  <img
                    src={getThumbUrl(imgUrl)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div className="product-detail-images">
        <div className="main-image-wrapper" ref={containerRef}>
          <div
            {...galleryBind()}
            className="main-image-interactive"
            style={{ touchAction: 'pan-y' }}
            onMouseMove={(event) => updateMagnifier(event.clientX, event.clientY)}
            onMouseLeave={() => setMagnifier(null)}
          >
            <img
              ref={imageRef}
              src={selectedImage}
              alt={productName}
              className="product-detail-main-image"
              draggable={false}
            />

            {canUseMagnifier && magnifier && (
              <div
                className="image-magnifier-lens"
                style={{
                  width: LENS_SIZE,
                  height: LENS_SIZE,
                  left: magnifier.lensX - LENS_SIZE / 2,
                  top: magnifier.lensY - LENS_SIZE / 2,
                  backgroundImage: `url("${selectedImage}")`,
                  backgroundSize: `${magnifier.backgroundSizeX}px ${magnifier.backgroundSizeY}px`,
                  backgroundPosition: `${magnifier.backgroundPosX}px ${magnifier.backgroundPosY}px`,
                }}
                aria-hidden="true"
              />
            )}

            {!hintDismissed && (
              <span className="image-zoom-hint">
                {canUseMagnifier
                  ? 'Pasa el cursor para ampliar · Clic para pantalla completa'
                  : 'Toca para ampliar'}
              </span>
            )}
          </div>

          <button
            type="button"
            className="image-expand-btn"
            onClick={openLightbox}
            aria-label="Ver imagen en pantalla completa"
          >
            <FontAwesomeIcon icon={faExpand} />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onPrevious();
                }}
                className="gallery-arrow prev-arrow"
                aria-label="Imagen anterior"
              >
                &#10094;
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onNext();
                }}
                className="gallery-arrow next-arrow"
                aria-label="Siguiente imagen"
              >
                &#10095;
              </button>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="product-detail-thumbnail-gallery">
            {images.map((imgUrl, index) => (
              <img
                key={imgUrl}
                src={getThumbUrl(imgUrl)}
                alt={`${productName} - vista ${index + 1}`}
                className={`product-detail-thumbnail ${selectedImage === imgUrl ? 'active' : ''}`}
                onClick={() => handleThumbnailClick(imgUrl)}
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        )}
      </div>

      {lightboxContent}
    </>
  );
}

export default ProductImageGallery;
