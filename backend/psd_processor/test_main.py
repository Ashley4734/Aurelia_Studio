import base64
import io
import json
import subprocess
import sys
from pathlib import Path

try:
    from PIL import Image
except Exception:
    print('skipping - Pillow unavailable in test environment')
    sys.exit(0)

def _encode(img: Image.Image) -> str:
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


def test_fallback_image_processing():
    mockup = Image.new('RGB', (400, 300), 'white')
    artwork = Image.new('RGB', (200, 100), 'black')
    payload = {
        'mockup': _encode(mockup),
        'artwork': _encode(artwork),
        'filename': 'test.png'
    }
    proc = subprocess.run(
        ['python3', str(Path(__file__).parent / 'main.py')],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        check=False,
    )
    data = json.loads(proc.stdout.strip()) if proc.stdout else {}
    if proc.returncode != 0 and 'Pillow unavailable' in proc.stdout:
        print('skipping - Pillow unavailable in test environment')
        return
    assert proc.returncode == 0, proc.stderr
    assert data.get('success') is True
    assert 'result' in data
    assert data.get('method') == 'fallback'


if __name__ == '__main__':
    test_fallback_image_processing()
    print('ok')
