import type { Asset } from '../../types';

export class AssetManager {
  /**
   * Collect all assets from a document
   */
  static async collectAssets(document: Document): Promise<Asset[]> {
    const assets: Asset[] = [];

    // Collect images
    const images = document.querySelectorAll('img');
    for (const img of Array.from(images)) {
      const src = (img as HTMLImageElement).src;
      if (src && !src.startsWith('data:')) {
        const asset = await this.fetchAsset(src, 'image');
        if (asset) {
          assets.push(asset);
        }
      }
    }

    // Collect stylesheets
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    for (const link of Array.from(stylesheets)) {
      const href = (link as HTMLLinkElement).href;
      if (href) {
        const asset = await this.fetchAsset(href, 'stylesheet');
        if (asset) {
          assets.push(asset);
        }
      }
    }

    // Collect scripts
    const scripts = document.querySelectorAll('script[src]');
    for (const script of Array.from(scripts)) {
      const src = (script as HTMLScriptElement).src;
      if (src) {
        const asset = await this.fetchAsset(src, 'script');
        if (asset) {
          assets.push(asset);
        }
      }
    }

    // Collect fonts (from @font-face rules)
    const fontUrls = this.extractFontUrls(document);
    for (const fontUrl of fontUrls) {
      const asset = await this.fetchAsset(fontUrl, 'font');
      if (asset) {
        assets.push(asset);
      }
    }

    return assets;
  }

  /**
   * Fetch an asset and convert to base64
   */
  private static async fetchAsset(url: string, type: Asset['type']): Promise<Asset | null> {
    try {
      // Skip data URLs and blob URLs
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        return null;
      }

      // Skip cross-origin requests that might fail
      if (!this.isSameOrigin(url)) {
        console.warn(`Skipping cross-origin asset: ${url}`);
        return null;
      }

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch asset: ${url}`);
        return null;
      }

      const blob = await response.blob();
      const base64 = await this.blobToBase64(blob);

      return {
        type,
        url,
        blob,
        base64,
        mimeType: blob.type
      };
    } catch (e) {
      console.warn(`Error fetching asset ${url}:`, e);
      return null;
    }
  }

  /**
   * Convert blob to base64
   */
  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Check if URL is same origin
   */
  private static isSameOrigin(url: string): boolean {
    try {
      const urlObj = new URL(url, window.location.href);
      return urlObj.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  /**
   * Extract font URLs from @font-face rules
   */
  private static extractFontUrls(document: Document): string[] {
    const fontUrls: string[] = [];
    
    try {
      const rules = Array.from(document.styleSheets).flatMap(sheet => {
        try {
          return Array.from(sheet.cssRules || []);
        } catch {
          return [];
        }
      });

      for (const rule of rules) {
        // Check if it's a font-face rule by checking the cssText
        if (rule.cssText && rule.cssText.includes('@font-face')) {
          const match = rule.cssText.match(/url\(['"]?([^'")]+)['"]?\)/g);
          if (match) {
            for (const urlMatch of match) {
              const url = urlMatch.match(/url\(['"]?([^'")]+)['"]?\)/)?.[1];
              if (url) {
                fontUrls.push(url);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error extracting font URLs:', e);
    }

    return fontUrls;
  }

  /**
   * Create a self-contained version of CSS with embedded assets
   */
  static async embedAssetsInCSS(css: string, baseUrl: string): Promise<string> {
    // Find all url() references
    const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g;
    let embeddedCss = css;
    let match;

    while ((match = urlRegex.exec(css)) !== null) {
      const url = match[1];
      
      // Skip data URLs
      if (url.startsWith('data:')) {
        continue;
      }

      try {
        const absoluteUrl = new URL(url, baseUrl).href;
        const asset = await this.fetchAsset(absoluteUrl, 'image');
        
        if (asset && asset.base64) {
          embeddedCss = embeddedCss.replace(match[0], `url('${asset.base64}')`);
        }
      } catch (e) {
        console.warn(`Failed to embed asset ${url}:`, e);
      }
    }

    return embeddedCss;
  }

  /**
   * Get total size of all assets
   */
  static getTotalAssetSize(assets: Asset[]): number {
    return assets.reduce((total, asset) => {
      if (asset.blob) {
        return total + asset.blob.size;
      }
      return total;
    }, 0);
  }

  /**
   * Filter assets by type
   */
  static filterByType(assets: Asset[], type: Asset['type']): Asset[] {
    return assets.filter(asset => asset.type === type);
  }
}
