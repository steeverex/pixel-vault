import type { CaptureResult, ExportResult, ExportOptions } from '../../types';

export class JsonExporter {
  static export(capture: CaptureResult, options: ExportOptions): ExportResult {
    const content = options.prettyPrint 
      ? JSON.stringify(capture, null, 2)
      : JSON.stringify(capture);

    const filename = `pixelvault-capture-${Date.now()}.json`;

    return {
      content,
      filename,
      mimeType: 'application/json',
      size: content.length
    };
  }
}
