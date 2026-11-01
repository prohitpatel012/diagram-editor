import { CanvasElement, CanvasSettings } from '@/types/canvas';

export interface ExportPngOptions {
  padding?: number;
  scale?: number; // 2 for crisp 2x retina
  withBackground?: boolean;
}

export function exportSvgToPng(
  svgElement: SVGSVGElement,
  elements: CanvasElement[],
  settings: CanvasSettings,
  title: string = 'diagram',
  options: ExportPngOptions = {}
): Promise<void> {
  const { padding = 40, scale = 2, withBackground = true } = options;

  return new Promise((resolve, reject) => {
    try {
      if (!elements || elements.length === 0) {
        alert('Canvas is empty. Add some elements before exporting.');
        return resolve();
      }

      // 1. Calculate bounding box of all elements
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const el of elements) {
        const x1 = Math.min(el.x, el.x + el.width);
        const y1 = Math.min(el.y, el.y + el.height);
        const x2 = Math.max(el.x, el.x + el.width);
        const y2 = Math.max(el.y, el.y + el.height);

        minX = Math.min(minX, x1);
        minY = Math.min(minY, y1);
        maxX = Math.max(maxX, x2);
        maxY = Math.max(maxY, y2);

        // Check for free draw points
        if (el.points && el.points.length > 0) {
          for (const pt of el.points) {
            minX = Math.min(minX, pt.x);
            minY = Math.min(minY, pt.y);
            maxX = Math.max(maxX, pt.x);
            maxY = Math.max(maxY, pt.y);
          }
        }
      }

      const contentWidth = Math.max(100, maxX - minX);
      const contentHeight = Math.max(100, maxY - minY);

      const exportX = minX - padding;
      const exportY = minY - padding;
      const exportWidth = contentWidth + padding * 2;
      const exportHeight = contentHeight + padding * 2;

      // 2. Clone the SVG content group
      const elementsGroup = svgElement.querySelector('#canvas-elements-group');
      if (!elementsGroup) {
        throw new Error('Elements group not found in SVG');
      }

      // Clone SVG
      const clonedSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clonedSvg.setAttribute('width', exportWidth.toString());
      clonedSvg.setAttribute('height', exportHeight.toString());
      clonedSvg.setAttribute('viewBox', `${exportX} ${exportY} ${exportWidth} ${exportHeight}`);

      // Add background rectangle if requested
      if (withBackground && settings.backgroundColor && settings.backgroundColor !== 'transparent') {
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('x', exportX.toString());
        bgRect.setAttribute('y', exportY.toString());
        bgRect.setAttribute('width', exportWidth.toString());
        bgRect.setAttribute('height', exportHeight.toString());
        bgRect.setAttribute('fill', settings.backgroundColor);
        clonedSvg.appendChild(bgRect);
      }

      // Copy defs if any
      const defs = svgElement.querySelector('defs');
      if (defs) {
        clonedSvg.appendChild(defs.cloneNode(true));
      }

      // Copy elements group
      const clonedGroup = elementsGroup.cloneNode(true) as SVGGElement;
      clonedSvg.appendChild(clonedGroup);

      // Serialize SVG
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.crossOrigin = 'anonymous';

      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = exportWidth * scale;
          canvas.height = exportHeight * scale;

          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get 2D context');

          // Smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.scale(scale, scale);

          if (withBackground && settings.backgroundColor && settings.backgroundColor !== 'transparent') {
            ctx.fillStyle = settings.backgroundColor;
            ctx.fillRect(0, 0, exportWidth, exportHeight);
          }

          ctx.drawImage(image, 0, 0);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Canvas toBlob failed'));
              return;
            }

            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'diagram';
            a.download = `${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.png`;
            a.href = downloadUrl;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(downloadUrl);
            URL.revokeObjectURL(url);
            resolve();
          }, 'image/png');
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };

      image.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };

      image.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

