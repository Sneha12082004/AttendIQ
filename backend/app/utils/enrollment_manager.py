"""
app/utils/enrollment_manager.py
───────────────────────────────
Face Enrollment and Identity Registry for AttendIQ.

Strictly manages enrolled student identities for the Hackathon Demonstration:
  1. Sneha Banerjee (stu-001, CS2024001)
  2. Aastha Singh   (stu-002, CS2024002)

Any other identity detected by the webcam pipeline is classified as 'UNKNOWN PERSON'.

Responsibilities:
  - Scans backend/enrollment_photos/Sneha_Banerjee and backend/enrollment_photos/Aastha_Singh
  - Ingests user-supplied photographs (.jpg, .jpeg, .png)
  - Performs biometric quality evaluation and face localization
  - Extracts 128-dimensional biometric embeddings and averages across multiple captures
  - Persists template vectors to backend/app/data/enrolled_faces.json
  - Provides instant cosine-similarity multi-candidate matching
"""

import os
import json
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from app.utils.face_pipeline import (
    decode_image,
    compute_face_quality,
    detect_faces,
    extract_face_embedding,
    cosine_similarity,
)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENROLLMENT_DIR = BASE_DIR / "enrollment_photos"
DATA_DIR = BASE_DIR / "app" / "data"
TEMPLATE_FILE = DATA_DIR / "enrolled_faces.json"

ENROLLED_IDENTITIES = {
    "stu-001": {
        "student_id": "stu-001",
        "name": "Sneha Banerjee",
        "reg_number": "CS2024001",
        "email": "student1@attendiq.demo",
        "folder_name": "Sneha_Banerjee",
    },
    "stu-002": {
        "student_id": "stu-002",
        "name": "Aastha Singh",
        "reg_number": "CS2024002",
        "email": "student2@attendiq.demo",
        "folder_name": "Aastha_Singh",
    },
}


class EnrollmentManager:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        (ENROLLMENT_DIR / "Sneha_Banerjee").mkdir(parents=True, exist_ok=True)
        (ENROLLMENT_DIR / "Aastha_Singh").mkdir(parents=True, exist_ok=True)
        self.templates: Dict[str, Dict[str, Any]] = {}
        self._load_templates()

    def _generate_deterministic_seed_template(self, seed_name: str) -> List[float]:
        """Generates a reproducible, normalized 128-d vector for initial bootstrap."""
        np.random.seed(abs(hash(seed_name)) % (2**31 - 1))
        # 64 spatial features (zero-mean) + 64 contrast features (zero-mean)
        v1 = np.random.randn(64).astype(np.float32)
        v1 = v1 - np.mean(v1)
        v1 = v1 / (np.linalg.norm(v1) + 1e-6)

        v2 = np.random.randn(64).astype(np.float32)
        v2 = v2 - np.mean(v2)
        v2 = v2 / (np.linalg.norm(v2) + 1e-6)

        vec = np.concatenate([v1, v2])
        vec = vec / (np.linalg.norm(vec) + 1e-6)
        return [round(float(x), 5) for x in vec]

    def _load_templates(self):
        """Loads enrolled face templates from JSON, or syncs from photos folder."""
        if TEMPLATE_FILE.exists():
            try:
                with open(TEMPLATE_FILE, "r") as f:
                    self.templates = json.load(f)
            except Exception as e:
                print(f"[EnrollmentManager] Warning: failed to parse {TEMPLATE_FILE}: {e}")
                self.templates = {}

        # Check if photos exist on disk to ingest or update
        updated_from_disk = self.scan_and_sync_photos()
        if not updated_from_disk and not self.templates:
            # Fallback bootstrap so system works immediately out of the box
            for stu_id, meta in ENROLLED_IDENTITIES.items():
                self.templates[stu_id] = {
                    "student_id": stu_id,
                    "name": meta["name"],
                    "reg_number": meta["reg_number"],
                    "embedding": self._generate_deterministic_seed_template(meta["name"]),
                    "photos_count": 0,
                    "source": "bootstrap_template",
                }
            self._save_templates()

    def _save_templates(self):
        try:
            with open(TEMPLATE_FILE, "w") as f:
                json.dump(self.templates, f, indent=2)
        except Exception as e:
            print(f"[EnrollmentManager] Error saving templates: {e}")

    def scan_and_sync_photos(self) -> bool:
        """
        Scans enrollment_photos/ directory for Sneha Banerjee and Aastha Singh.
        If photos exist, extracts embeddings and updates templates.
        """
        any_updated = False
        valid_exts = {".jpg", ".jpeg", ".png", ".webp"}

        for stu_id, meta in ENROLLED_IDENTITIES.items():
            folder = ENROLLMENT_DIR / meta["folder_name"]
            if not folder.exists():
                folder.mkdir(parents=True, exist_ok=True)
                continue

            photo_files = [p for p in folder.iterdir() if p.suffix.lower() in valid_exts]
            if not photo_files:
                continue

            embeddings: List[List[float]] = []
            valid_photos = 0

            for p in sorted(photo_files):
                try:
                    with open(p, "rb") as f:
                        raw = f.read()
                    bgr = decode_image(raw)
                    if bgr is None:
                        continue
                    q = compute_face_quality(bgr)
                    faces = detect_faces(bgr)
                    if not faces:
                        continue
                    emb = extract_face_embedding(bgr, faces[0])
                    embeddings.append(emb)
                    valid_photos += 1
                except Exception as ex:
                    print(f"[EnrollmentManager] Error processing {p}: {ex}")

            if embeddings:
                avg_vec = np.mean(embeddings, axis=0)
                norm = np.linalg.norm(avg_vec)
                if norm > 1e-6:
                    avg_vec = avg_vec / norm
                final_emb = [round(float(v), 5) for v in avg_vec]

                self.templates[stu_id] = {
                    "student_id": stu_id,
                    "name": meta["name"],
                    "reg_number": meta["reg_number"],
                    "embedding": final_emb,
                    "photos_count": valid_photos,
                    "source": f"disk_photos ({valid_photos} images)",
                }
                any_updated = True

        if any_updated:
            self._save_templates()
        return any_updated

    def match_face(
        self,
        submitted_embedding: List[float],
        expected_student_id: Optional[str] = None,
        threshold: float = 0.40,
    ) -> Dict[str, Any]:
        """
        Compares submitted embedding against Sneha Banerjee and Aastha Singh.
        Returns recognized status, name, similarity score, and color code:
          - GREEN for Sneha Banerjee / Aastha Singh
          - AMBER for UNKNOWN PERSON
        """
        candidates: List[Dict[str, Any]] = []

        for stu_id, data in self.templates.items():
            enrolled_emb = data.get("embedding", [])
            if not enrolled_emb:
                continue
            sim = cosine_similarity(submitted_embedding, enrolled_emb)
            candidates.append({
                "student_id": stu_id,
                "name": data["name"],
                "reg_number": data.get("reg_number", ""),
                "similarity": round(sim, 3),
            })

        # Sort descending by similarity
        candidates.sort(key=lambda c: c["similarity"], reverse=True)

        best_match = candidates[0] if candidates else None
        max_sim = best_match["similarity"] if best_match else 0.0

        if best_match and max_sim >= threshold:
            # If expected_student_id is specified (e.g. logged-in user), verify matching identity
            if expected_student_id and best_match["student_id"] != expected_student_id:
                return {
                    "recognized": False,
                    "student_id": best_match["student_id"],
                    "name": f"MISMATCH ({best_match['name']})",
                    "similarity": max_sim,
                    "threshold": threshold,
                    "color": "amber",
                    "status": "IMPERSONATION_ATTEMPT",
                    "candidates": candidates,
                }

            return {
                "recognized": True,
                "student_id": best_match["student_id"],
                "name": best_match["name"],
                "reg_number": best_match["reg_number"],
                "similarity": max_sim,
                "threshold": threshold,
                "color": "green",
                "status": "VERIFIED_ENROLLED",
                "candidates": candidates,
            }

        # Below threshold -> UNKNOWN PERSON
        return {
            "recognized": False,
            "student_id": None,
            "name": "UNKNOWN PERSON",
            "reg_number": None,
            "similarity": max_sim,
            "threshold": threshold,
            "color": "amber",
            "status": "UNKNOWN_PERSON",
            "candidates": candidates,
        }

    def enroll_from_webcam(self, student_id: str, frame_b64: str) -> Dict[str, Any]:
        """Enrolls student face directly from a live webcam capture."""
        if student_id not in ENROLLED_IDENTITIES:
            return {"success": False, "error": f"Invalid student ID: {student_id}"}
        bgr = decode_image(frame_b64)
        if bgr is None:
            return {"success": False, "error": "Could not decode camera frame"}
        faces = detect_faces(bgr)
        if not faces:
            return {"success": False, "error": "No face detected in camera view"}
        new_emb = extract_face_embedding(bgr, faces[0])
        meta = ENROLLED_IDENTITIES[student_id]

        import time
        fname = f"webcam_enroll_{int(time.time())}.jpg"
        save_path = ENROLLMENT_DIR / meta["folder_name"] / fname
        try:
            import cv2
            cv2.imwrite(str(save_path), bgr)
        except Exception:
            pass

        self.templates[student_id] = {
            "student_id": student_id,
            "name": meta["name"],
            "reg_number": meta["reg_number"],
            "embedding": new_emb,
            "photos_count": self.templates.get(student_id, {}).get("photos_count", 0) + 1,
            "source": "webcam_direct_capture",
        }
        self._save_templates()
        return {"success": True, "name": meta["name"], "student_id": student_id}

    def get_enrolled_summary(self) -> List[Dict[str, Any]]:
        summary = []
        for stu_id, meta in ENROLLED_IDENTITIES.items():
            tmpl = self.templates.get(stu_id, {})
            summary.append({
                "student_id": stu_id,
                "name": meta["name"],
                "reg_number": meta["reg_number"],
                "is_enrolled": bool(tmpl.get("embedding")),
                "photos_count": tmpl.get("photos_count", 0),
                "source": tmpl.get("source", "none"),
            })
        return summary


# Global singleton instance
enrollment_manager = EnrollmentManager()
