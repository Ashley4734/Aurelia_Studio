import base64
import io
import json
import logging
import os
import signal
import sys
import time
from typing import Optional

try:
    from PIL import Image, ImageOps
except Exception as exc:  # pragma: no cover - environment guard
    print(json.dumps({'success': False, 'error': f'Pillow unavailable: {exc}'}))
    sys.exit(1)

try:
    from psd_tools import PSDImage
    PSD_AVAILABLE = True
except Exception:
    PSD_AVAILABLE = False

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
LOGGER = logging.getLogger(__name__)
TIMEOUT_SECONDS = int(os.environ.get('PSD_PROCESS_TIMEOUT', '25'))


def _timeout_handler(signum, frame):
    raise TimeoutError('Processing timed out')


signal.signal(signal.SIGALRM, _timeout_handler)


def _decode(data: str) -> bytes:
    if ',' in data:
        data = data.split(',', 1)[1]
    return base64.b64decode(data)


def _process_psd(psd_bytes: bytes, artwork: Image.Image, filename: str) -> Optional[Image.Image]:
    if not PSD_AVAILABLE:
        return None
    try:
        psd = PSDImage.open(io.BytesIO(psd_bytes))
        LOGGER.info('PSD opened %sx%s with %s layers', psd.width, psd.height, len(psd))
        target_layer = next((layer for layer in psd.descendants() if getattr(layer, 'visible', True)), None)
        if target_layer is None:
            return None
        smart_bounds = (target_layer.left, target_layer.top, target_layer.right, target_layer.bottom)
        width = smart_bounds[2] - smart_bounds[0]
        height = smart_bounds[3] - smart_bounds[1]
        resized = ImageOps.fit(artwork, (width, height), method=Image.Resampling.LANCZOS)
        composite = psd.composite()
        composite.paste(resized, (smart_bounds[0], smart_bounds[1]), resized if resized.mode == 'RGBA' else None)
        return composite
    except Exception as exc:  # pragma: no cover - defensive
        LOGGER.error('PSD processing failed: %s', exc)
        return None


def _process_image(mockup_bytes: bytes, artwork: Image.Image) -> Image.Image:
    mockup = Image.open(io.BytesIO(mockup_bytes)).convert('RGB')
    artwork = artwork.convert('RGBA') if artwork.mode != 'RGBA' else artwork
    target_width = int(mockup.width * 0.7)
    target_height = int(mockup.height * 0.7)
    fitted = ImageOps.fit(artwork, (target_width, target_height), method=Image.Resampling.LANCZOS)
    x = (mockup.width - fitted.width) // 2
    y = (mockup.height - fitted.height) // 2
    mockup.paste(fitted, (x, y), fitted)
    return mockup


def main():
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw)
        signal.alarm(TIMEOUT_SECONDS)

        mockup_b64 = payload['mockup']
        artwork_b64 = payload['artwork']
        filename = payload.get('filename', 'mockup.psd').lower()

        mockup_bytes = _decode(mockup_b64)
        artwork_bytes = _decode(artwork_b64)
        artwork = Image.open(io.BytesIO(artwork_bytes))

        result_image = None
        method = 'image'

        if filename.endswith('.psd'):
            result_image = _process_psd(mockup_bytes, artwork, filename)
            method = 'psd'

        if result_image is None:
            result_image = _process_image(mockup_bytes, artwork)
            method = 'fallback'

        buffer = io.BytesIO()
        rgb_image = result_image.convert('RGB')
        rgb_image.save(buffer, format='JPEG', quality=90, dpi=(300, 300))
        encoded = base64.b64encode(buffer.getvalue()).decode('utf-8')
        signal.alarm(0)
        print(json.dumps({'success': True, 'result': encoded, 'method': method, 'size': {'width': rgb_image.width, 'height': rgb_image.height}}))
    except Exception as exc:
        LOGGER.error('Processing failed: %s', exc)
        print(json.dumps({'success': False, 'error': str(exc)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
