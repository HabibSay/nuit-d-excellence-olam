(function () {
  'use strict';

  const PDF_FILE = PDF_CONFIG.file;
  const PDF_FALLBACK = PDF_CONFIG.fallback;

  let currentPageFlip = null;

  // DOM elements
  const flipbookEl = document.getElementById('flipbook');
  const flipbookWrapper = document.getElementById('flipbook-viewer');
  const pdfFallback = document.getElementById('pdf-fallback');
  const pdfFrame = document.getElementById('pdf-frame');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const pageIndicator = document.getElementById('page-indicator');
  const loadingOverlay = document.getElementById('loading');
  const flipbookNav = document.getElementById('flipbook-nav');

  /**
   * Show or hide the loading overlay
   */
  function setLoading(visible) {
    loadingOverlay.style.display = visible ? 'flex' : 'none';
  }

  /**
   * Switch to iframe fallback view
   */
  function showFallback() {
    flipbookWrapper.style.display = 'none';
    flipbookNav.style.display = 'none';
    pdfFallback.style.display = 'block';
    pdfFrame.src = PDF_FALLBACK;
    setLoading(false);
  }

  /**
   * Initialize the flipbook viewer
   */
  async function initFlipbook() {
    setLoading(true);

    try {
      const pdf = await pdfjsLib.getDocument(PDF_FILE).promise;
      const numPages = pdf.numPages;

      // Determine optimal scale based on viewport
      const scale = window.innerWidth < 768 ? 1.5 : 2;

      // Render all pages
      const pageElements = [];
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: scale });

        const pageDiv = document.createElement('div');
        pageDiv.className = 'flipbook-page';

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        pageDiv.appendChild(canvas);
        pageElements.push(pageDiv);
      }

      // Initialize StPageFlip
      const wrapperWidth = flipbookEl.parentElement.clientWidth;
      const mobile = wrapperWidth < 500;

      // Calculate page dimensions maintaining aspect ratio
      const firstPage = pageElements[0];
      const canvasEl = firstPage.querySelector('canvas');
      const aspectRatio = canvasEl.height / canvasEl.width;

      const pageWidth = mobile ? wrapperWidth - 20 : Math.min(wrapperWidth / 2 - 30, 400);
      const pageHeight = pageWidth * aspectRatio;

      currentPageFlip = new St.PageFlip(flipbookEl, {
        width: pageWidth,
        height: pageHeight,
        size: 'fixed',
        showCover: true,
        mobileScrollSupport: true,
        swipeDistance: 30,
        usePortrait: true,
        maxShadowOpacity: 0.3,
        autoSize: true,
      });

      currentPageFlip.loadFromHTML(pageElements);

      // Update navigation
      prevBtn.disabled = false;
      nextBtn.disabled = false;

      currentPageFlip.on('flip', () => {
        updatePageIndicator();
      });

      updatePageIndicator();
    } catch (err) {
      console.error('Error loading PDF with flipbook, switching to fallback:', err);
      showFallback();
    } finally {
      setLoading(false);
    }
  }

  /**
   * Update the page indicator text
   */
  function updatePageIndicator() {
    if (!currentPageFlip) return;
    const current = currentPageFlip.getCurrentPageIndex() + 1;
    const total = currentPageFlip.getPageCount();
    pageIndicator.textContent = 'Page ' + current + ' / ' + total;

    prevBtn.disabled = current <= 1;
    nextBtn.disabled = current >= total;
  }

  // Event listeners
  prevBtn.addEventListener('click', () => {
    if (currentPageFlip) currentPageFlip.flipPrev();
  });

  nextBtn.addEventListener('click', () => {
    if (currentPageFlip) currentPageFlip.flipNext();
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!currentPageFlip) return;
    if (e.key === 'ArrowLeft') currentPageFlip.flipPrev();
    if (e.key === 'ArrowRight') currentPageFlip.flipNext();
  });

  // Touch swipe is handled natively by StPageFlip

  // Handle resize - reload to recalculate dimensions
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (currentPageFlip && pdfFallback.style.display === 'none') {
        initFlipbook();
      }
    }, 300);
  });

  // Initial load
  initFlipbook();
})();
