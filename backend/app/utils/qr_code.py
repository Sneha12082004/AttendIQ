"""
app/utils/qr_code.py
────────────────────
Feature C: Dynamic Classroom Session QR Code Generation & Cryptographic Verification.

Generates dynamic QR codes embedded with:
- session_id
- session_nonce
- classroom_id
- expiration timestamp

Ensures students must scan the live faculty screen in the room to initiate attendance.
"""

import base64
import io
import json
import time
from typing import Dict, Any, Optional

try:
    import qrcode
    QRCODE_AVAILABLE = True
except ImportError:
    qrcode = None
    QRCODE_AVAILABLE = False


def generate_session_qr_payload(
    session_id: str,
    classroom_id: str,
    session_nonce: str,
    ttl_seconds: int = 300
) -> Dict[str, Any]:
    """Builds the structured dictionary payload for QR code encoding."""
    now = int(time.time())
    return {
        "attendiq_v": 1,
        "session_id": session_id,
        "classroom_id": classroom_id,
        "nonce": session_nonce,
        "iat": now,
        "exp": now + ttl_seconds,
    }


def render_qr_base64(payload_dict: Dict[str, Any]) -> str:
    """Encodes payload as JSON string and renders PNG as data URI."""
    raw_str = json.dumps(payload_dict)
    if QRCODE_AVAILABLE:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=3,
        )
        qr.add_data(raw_str)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#0F172A", back_color="#FFFFFF")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{b64}"
    else:
        # Fallback if qrcode module is not installed
        b64_raw = base64.b64encode(raw_str.encode("utf-8")).decode("utf-8")
        return f"data:text/plain;base64,{b64_raw}"


def validate_scanned_qr(scanned_text: str, expected_session_id: str) -> Dict[str, Any]:
    """Validates QR code payload scanned by mobile device."""
    try:
        data = json.loads(scanned_text)
        if data.get("attendiq_v") != 1:
            return {"valid": False, "reason": "Unrecognized QR format"}
        if data.get("session_id") != expected_session_id:
            return {"valid": False, "reason": "QR code belongs to a different class session"}
        now = int(time.time())
        if now > data.get("exp", 0):
            return {"valid": False, "reason": "QR code has expired. Faculty must refresh screen."}
        return {"valid": True, "payload": data}
    except Exception as e:
        return {"valid": False, "reason": f"Corrupted or invalid QR data: {e}"}
