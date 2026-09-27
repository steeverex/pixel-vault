export class VisualSerializer {
  /**
   * Serialize a canvas element to base64 PNG
   */
  static serializeCanvas(canvas: HTMLCanvasElement): string | null {
    try {
      return canvas.toDataURL('image/png');
    } catch (e) {
      console.warn('Could not serialize canvas:', e);
      return null;
    }
  }

  /**
   * Serialize an SVG element to string
   */
  static serializeSVG(svgElement: SVGElement): string | null {
    try {
      const serializer = new XMLSerializer();
      return serializer.serializeToString(svgElement);
    } catch (e) {
      console.warn('Could not serialize SVG:', e);
      return null;
    }
  }

  /**
   * Convert SVG string to base64 image
   */
  static svgToBase64(svgString: string): string {
    const base64 = btoa(unescape(encodeURIComponent(svgString)));
    return `data:image/svg+xml;base64,${base64}`;
  }

  /**
   * Serialize an image element to base64 (fetches the image data)
   */
  static async serializeImage(imgElement: HTMLImageElement): Promise<string | null> {
    try {
      // If image is already base64, return it
      if (imgElement.src.startsWith('data:')) {
        return imgElement.src;
      }

      // Try to fetch and convert to base64
      const response = await fetch(imgElement.src);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Could not serialize image:', e);
      return null;
    }
  }

  /**
   * Take a screenshot of an element using html2canvas (if available)
   */
  static async captureElementScreenshot(element: HTMLElement): Promise<string | null> {
    try {
      // Check if html2canvas is available
      if (typeof (window as any).html2canvas === 'function') {
        const canvas = await (window as any).html2canvas(element);
        return canvas.toDataURL('image/png');
      }
      return null;
    } catch (e) {
      console.warn('Could not capture element screenshot:', e);
      return null;
    }
  }

  /**
   * Process all visual elements in a container
   */
  static async processVisualElements(container: Element): Promise<Map<string, string>> {
    const visualData = new Map<string, string>();

    // Process canvases
    const canvases = container.querySelectorAll('canvas');
    for (const canvas of Array.from(canvases)) {
      const data = this.serializeCanvas(canvas as HTMLCanvasElement);
      if (data) {
        visualData.set(`canvas-${Date.now()}-${Math.random()}`, data);
      }
    }

    // Process SVGs
    const svgs = container.querySelectorAll('svg');
    for (const svg of Array.from(svgs)) {
      const data = this.serializeSVG(svg as SVGElement);
      if (data) {
        visualData.set(`svg-${Date.now()}-${Math.random()}`, data);
      }
    }

    // Process images (async)
    const images = container.querySelectorAll('img');
    for (const img of Array.from(images)) {
      const data = await this.serializeImage(img as HTMLImageElement);
      if (data) {
        visualData.set(`image-${Date.now()}-${Math.random()}`, data);
      }
    }

    return visualData;
  }
}
