export class ScrollCapture {
  private static readonly SCROLL_INCREMENT = 500;
  private static readonly SCROLL_DELAY = 100;
  private static readonly MAX_SCROLL_ATTEMPTS = 100;
  private static readonly STABILITY_THRESHOLD = 3;

  /**
   * Detect if a page is scrollable (long page)
   */
  static isScrollablePage(): boolean {
    const body = document.body;
    const html = document.documentElement;
    
    const scrollHeight = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    );
    
    const viewportHeight = window.innerHeight;
    
    return scrollHeight > viewportHeight * 1.5; // Page is 1.5x viewport height
  }

  /**
   * Capture full page content by scrolling and monitoring for new content
   */
  static async captureFullPage(onProgress?: (progress: number) => void): Promise<{ nodeCount: number; scrollDepth: number }> {
    if (!this.isScrollablePage()) {
      // Not a scrollable page, return basic stats
      return {
        nodeCount: document.querySelectorAll('*').length,
        scrollDepth: 0
      };
    }

    let nodeCount = 0;
    let scrollDepth = 0;
    let stableCount = 0;
    let lastNodeCount = 0;
    let scrollAttempts = 0;

    // Scroll to top first
    window.scrollTo(0, 0);
    await this.delay(this.SCROLL_DELAY);

    while (scrollAttempts < this.MAX_SCROLL_ATTEMPTS) {
      // Current node count
      const currentNodes = document.querySelectorAll('*').length;
      
      // Check if DOM is stable (no new nodes appearing)
      if (currentNodes === lastNodeCount) {
        stableCount++;
      } else {
        stableCount = 0;
        lastNodeCount = currentNodes;
      }

      // If stable for multiple iterations, we're done
      if (stableCount >= this.STABILITY_THRESHOLD) {
        break;
      }

      // Scroll down
      const currentScroll = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      
      if (currentScroll >= maxScroll) {
        // Reached bottom
        break;
      }

      const nextScroll = Math.min(currentScroll + this.SCROLL_INCREMENT, maxScroll);
      window.scrollTo(0, nextScroll);
      scrollDepth = nextScroll;
      
      // Wait for content to load/virtualize
      await this.delay(this.SCROLL_DELAY);

      // Report progress
      if (onProgress) {
        const progress = (nextScroll / maxScroll) * 100;
        onProgress(Math.min(progress, 100));
      }

      scrollAttempts++;
    }

    // Scroll back to top
    window.scrollTo(0, 0);
    await this.delay(this.SCROLL_DELAY);

    nodeCount = document.querySelectorAll('*').length;

    return {
      nodeCount,
      scrollDepth
    };
  }

  /**
   * Capture content with virtualized list handling
   * For virtual lists (like in ChatGPT conversations), we need to scroll slowly
   * to trigger loading of more items
   */
  static async captureVirtualizedList(
    containerSelector: string,
    itemSelector: string,
    onProgress?: (progress: number) => void
  ): Promise<{ totalItems: number; scrollDepth: number }> {
    const container = document.querySelector(containerSelector);
    if (!container) {
      return { totalItems: 0, scrollDepth: 0 };
    }

    let totalItems = 0;
    let scrollDepth = 0;
    let scrollAttempts = 0;
    let lastItemCount = 0;
    let stableCount = 0;

    // Scroll to top
    container.scrollTop = 0;
    await this.delay(this.SCROLL_DELAY);

    while (scrollAttempts < this.MAX_SCROLL_ATTEMPTS) {
      const items = container.querySelectorAll(itemSelector);
      const currentItemCount = items.length;

      // Check if items are stable
      if (currentItemCount === lastItemCount) {
        stableCount++;
      } else {
        stableCount = 0;
        lastItemCount = currentItemCount;
      }

      // If stable, we're done
      if (stableCount >= this.STABILITY_THRESHOLD) {
        break;
      }

      // Scroll down
      const maxScroll = container.scrollHeight - container.clientHeight;
      const currentScroll = container.scrollTop;
      
      if (currentScroll >= maxScroll) {
        break;
      }

      const nextScroll = Math.min(currentScroll + this.SCROLL_INCREMENT, maxScroll);
      container.scrollTop = nextScroll;
      scrollDepth = nextScroll;
      
      await this.delay(this.SCROLL_DELAY);

      if (onProgress) {
        const progress = (nextScroll / maxScroll) * 100;
        onProgress(Math.min(progress, 100));
      }

      scrollAttempts++;
    }

    // Scroll back to top
    container.scrollTop = 0;
    await this.delay(this.SCROLL_DELAY);

    totalItems = container.querySelectorAll(itemSelector).length;

    return {
      totalItems,
      scrollDepth
    };
  }

  /**
   * Wait for specified milliseconds
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get scroll position information
   */
  static getScrollInfo() {
    return {
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: window.innerHeight,
      scrollPercentage: (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    };
  }
}
