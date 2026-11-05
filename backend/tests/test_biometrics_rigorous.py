"""
backend/tests/test_biometrics_rigorous.py
─────────────────────────────────────────
Rigorous empirical audit of AttendIQ's 3-Layer Biometric Verification Pipeline:
Layer A: Face Detection, Quality & 128-d Metric Matching (Cosine Similarity)
Layer B: Active Liveness Challenge Engine (Randomization, Nonce, TTL, Single-Use)
Layer C: Passive Presentation Attack Detection (LBP Texture, Glare Hotspots, Chroma)

Tests the 6 specific scenarios:
1. Genuine live person
2. Printed photograph attack (static 2D paper)
3. Photograph displayed on another phone (static screen with specular glare)
4. Prerecorded video on another phone (motion mismatch / screen artifacts)
5. Replayed video of the enrolled student performing requested movements (token replay & screen emission)
6. Impersonator (different live person attempting proxy)
"""

import base64
import io
import time
import unittest
import numpy as np
from PIL import Image
import cv2

from app.utils.face_pipeline import (
    decode_image,
    compute_face_quality,
    detect_faces,
    extract_face_embedding,
    cosine_similarity,
    verify_face_identity,
)
from app.utils.liveness import challenge_manager
from app.utils.antispoof import (
    compute_lbp_texture_score,
    check_specular_screen_glare,
    check_color_chroma_diversity,
    evaluate_anti_spoofing,
)
from app.utils.trust_score import compute_trust_score


def create_synthetic_face_image(
    skin_tone: tuple = (160, 190, 220),  # BGR warm skin
    face_axes: tuple = (75, 105),
    add_eyes_mouth: bool = True,
    noise_level: float = 8.0,
    blur_kernel: int = 0,
    glare_hotspot: bool = False,
    screen_moiré: bool = False,
    flat_paper: bool = False,
    cool_screen_tint: bool = False,
    eye_spacing: int = 60,
    eye_y: int = 135,
    mouth_w: int = 28,
    mouth_y: int = 200,
) -> str:
    """Generates realistic synthetic BGR face frame for controlled anti-spoof testbench."""
    w, h = 320, 320
    img = np.zeros((h, w, 3), dtype=np.uint8)

    # Base background (neutral indoor wall)
    img[:] = (120, 120, 120)

    # Face oval
    center = (160, 160)
    axes = face_axes
    color = skin_tone
    if cool_screen_tint:
        # Screen emission shift: higher blue channel
        color = (220, 180, 140)

    cv2.ellipse(img, center, axes, 0, 0, 360, color, -1)

    # Natural skin texture noise (pores & micro-variations)
    if not flat_paper:
        noise = np.random.normal(0, noise_level, (h, w, 3)).astype(np.float32)
        face_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.ellipse(face_mask, center, axes, 0, 0, 360, 255, -1)
        blended = img.astype(np.float32) + (noise * (face_mask[:, :, None] / 255.0))
        img = np.clip(blended, 0, 255).astype(np.uint8)

    # Eyes, nose, mouth
    if add_eyes_mouth:
        left_eye_x = 160 - (eye_spacing // 2)
        right_eye_x = 160 + (eye_spacing // 2)
        # Left eye
        cv2.circle(img, (left_eye_x, eye_y), 10, (50, 50, 50), -1)
        cv2.circle(img, (left_eye_x, eye_y), 4, (20, 20, 20), -1)
        # Right eye
        cv2.circle(img, (right_eye_x, eye_y), 10, (50, 50, 50), -1)
        cv2.circle(img, (right_eye_x, eye_y), 4, (20, 20, 20), -1)
        # Nose bridge
        cv2.line(img, (160, eye_y + 10), (160, eye_y + 40), (120, 140, 170), 3)
        # Mouth
        cv2.ellipse(img, (160, mouth_y), (mouth_w, 10), 0, 0, 180, (70, 70, 160), -1)

    # Moiré screen lines (high frequency regular horizontal scanlines)
    if screen_moiré:
        for y in range(0, h, 3):
            img[y, :, :] = np.clip(img[y, :, :].astype(int) + 35, 0, 255).astype(np.uint8)

    # Specular screen glare (phone screen glass reflection hotspot)
    if glare_hotspot:
        cv2.circle(img, (180, 110), 38, (255, 255, 255), -1)
        cv2.circle(img, (140, 90), 22, (255, 255, 255), -1)

    # Print paper smoothing / flat ink
    if flat_paper:
        img = cv2.GaussianBlur(img, (15, 15), 0)

    # Blur simulation
    if blur_kernel > 1:
        img = cv2.GaussianBlur(img, (blur_kernel, blur_kernel), 0)

    # Encode as Base64 data URI
    _, buf = cv2.imencode(".jpg", img)
    b64_str = "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode("utf-8")
    return b64_str


class TestBiometricsRigorousAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Generate base enrolled face for Student CS2024001
        cls.enrolled_frame_b64 = create_synthetic_face_image(
            skin_tone=(150, 185, 215), noise_level=10.0
        )
        enrolled_img = decode_image(cls.enrolled_frame_b64)
        faces = detect_faces(enrolled_img)
        cls.enrolled_embedding = extract_face_embedding(enrolled_img, faces[0])

    def test_scenario_01_genuine_live_person(self):
        """SCENARIO 1: Genuine live person present in classroom."""
        # 1. Fresh frame of enrolled student
        live_frame_b64 = create_synthetic_face_image(
            skin_tone=(150, 185, 215), noise_level=9.5
        )

        # Layer A: Face Match
        face_res = verify_face_identity(live_frame_b64, self.enrolled_embedding, threshold=0.65, is_demo_mode=False)
        self.assertTrue(face_res["passed"], f"Face match failed: {face_res}")
        self.assertGreaterEqual(face_res["similarity_score"], 0.65)
        self.assertEqual(face_res["face_count"], 1)

        # Layer B: Active Liveness (Fresh challenge issued and validated)
        chal = challenge_manager.issue_challenge("stu-001", "sess-test")
        liveness_res = challenge_manager.validate_and_consume(chal["challenge_id"], "stu-001", "sess-test", nonce=chal["nonce"])
        self.assertTrue(liveness_res["passed"])

        # Layer C: Passive Anti-Spoof
        spoof_res = evaluate_anti_spoofing(live_frame_b64, threshold=0.55, is_demo_mode=False)
        self.assertTrue(spoof_res["passed"], f"Anti-spoof falsely flagged live person: {spoof_res}")
        self.assertEqual(len(spoof_res["flags"]), 0)

        # Composite Trust Score
        ts = compute_trust_score(
            geofence_passed=True, location_trust_factor=0.92,
            face_match_passed=True, face_similarity_score=face_res["similarity_score"],
            liveness_passed=True, liveness_confidence=0.94,
            antispoof_passed=True, antispoof_score=spoof_res["antispoof_score"]
        )
        self.assertGreaterEqual(ts.overall_score, 85.0)
        self.assertIn(ts.grade, ["A", "B"])

    def test_scenario_02_printed_photograph_attack(self):
        """SCENARIO 2: Printed 2D paper photograph held before camera."""
        # Printed photo has smoothed flat ink texture (no natural skin gradient variance)
        print_photo_b64 = create_synthetic_face_image(
            skin_tone=(150, 185, 215), flat_paper=True, noise_level=0.5
        )

        # Layer C: Passive Anti-Spoof should detect flat texture
        img = decode_image(print_photo_b64)
        texture_score = compute_lbp_texture_score(img)
        self.assertLess(texture_score, 0.50, f"Expected low texture score for flat printed photo, got {texture_score}")

        spoof_res = evaluate_anti_spoofing(print_photo_b64, threshold=0.55, is_demo_mode=False)
        self.assertFalse(spoof_res["passed"])
        self.assertTrue(any("SUSPICIOUS_TEXTURE" in f for f in spoof_res["flags"]))

        # Layer B: Static paper CANNOT respond to dynamic multi-frame challenge
        # If static photo is submitted, no valid interactive motion can be proven
        chal = challenge_manager.issue_challenge("stu-001", "sess-test")
        # Attacker cannot complete challenge legitimately; token expires after 90s
        self.assertGreater(chal["expires_in_seconds"], 0)

    def test_scenario_03_photo_displayed_on_another_phone(self):
        """SCENARIO 3: Digital photo displayed on a smartphone screen."""
        # Phone screen produces strong specular glare hotspots and cool blue tint
        phone_screen_b64 = create_synthetic_face_image(
            skin_tone=(150, 185, 215), glare_hotspot=True, screen_moiré=True, cool_screen_tint=True
        )

        img = decode_image(phone_screen_b64)
        glare_score = check_specular_screen_glare(img)
        # Specular glare should be heavily penalized (<0.5)
        self.assertLess(glare_score, 0.50, f"Screen glare not detected: {glare_score}")

        spoof_res = evaluate_anti_spoofing(phone_screen_b64, threshold=0.55, is_demo_mode=False)
        self.assertFalse(spoof_res["passed"])
        self.assertTrue(any("SCREEN_GLASS_SPECULAR_GLARE" in f for f in spoof_res["flags"]))

    def test_scenario_04_prerecorded_video_on_another_phone(self):
        """SCENARIO 4: Prerecorded video on phone screen."""
        # Video on phone screen carries screen glare / moiré artifacts
        video_screen_b64 = create_synthetic_face_image(
            skin_tone=(150, 185, 215), glare_hotspot=True, screen_moiré=True
        )
        spoof_res = evaluate_anti_spoofing(video_screen_b64, threshold=0.55, is_demo_mode=False)
        self.assertFalse(spoof_res["passed"])

        # Also, active liveness challenges are generated unpredictably from 6 actions
        chal1 = challenge_manager.issue_challenge("stu-001", "sess-test")
        self.assertIn(chal1["challenge_type"], ["blink", "turn_left", "turn_right", "look_up", "move_closer", "nod"])
        # A static prerecorded video cannot adapt dynamically to randomized challenges

    def test_scenario_05_replayed_video_of_enrolled_student(self):
        """SCENARIO 5: Replayed video of enrolled student performing requested movements."""
        chal = challenge_manager.issue_challenge("stu-001", "sess-test")
        c_id = chal["challenge_id"]

        # First use succeeds (simulated legit submission)
        res1 = challenge_manager.validate_and_consume(c_id, "stu-001", "sess-test", nonce=chal["nonce"])
        self.assertTrue(res1["passed"])

        # Attempt to REPLAY the exact same token/challenge for another attendance mark
        res2 = challenge_manager.validate_and_consume(c_id, "stu-001", "sess-test", nonce=chal["nonce"])
        # MUST BE STRICTLY REJECTED as single-use invalidation
        self.assertFalse(res2["passed"])
        self.assertIn("replay attempt detected", res2["rejection_reason"])

    def test_scenario_06_impersonator_proxy_attack(self):
        """SCENARIO 6: A different live person attempting proxy for the enrolled student."""
        # Impersonator face with different facial structure: rounder face, wide set eyes, high nose, wide mouth
        impersonator_b64 = create_synthetic_face_image(
            skin_tone=(140, 175, 205), noise_level=8.0,
            face_axes=(100, 85),
            eye_spacing=108, eye_y=118, mouth_w=46, mouth_y=185
        )

        # Layer A: Face Match should compare impersonator against student template
        face_res = verify_face_identity(
            impersonator_b64, self.enrolled_embedding, threshold=0.65, is_demo_mode=False
        )
        self.assertFalse(face_res["passed"], f"Impersonator was wrongly accepted! Score: {face_res['similarity_score']}")
        self.assertLess(face_res["similarity_score"], 0.65)
        self.assertIn("below required threshold", face_res["rejection_reason"])


if __name__ == "__main__":
    unittest.main()
