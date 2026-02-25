import base64
import io
import logging
import time
import requests
from PIL import Image
from datetime import datetime
from app.models import OCRResponse
from app.config import OCR_PROVIDER, OCR_SPACE_API_KEY, OCR_SPACE_LANGUAGE, TESSERACT_LANG

try:
    import pytesseract
except Exception:  # pragma: no cover - optional dependency in some deployments
    pytesseract = None

logger = logging.getLogger(__name__)

class OCRService:
    """Service for handling OCR operations.

    NOTE:
    - Primary OCR path is backend-only (no popup login dependency).
    - Providers: OCR.Space API and/or local Tesseract, with safe fallback.
    """

    @staticmethod
    def process_image_file(file_bytes, file_type='image/jpeg'):
        """
        Process image bytes and extract text using Mistral OCR API

        Args:
            file_bytes: Image file in bytes
            file_type: MIME type of the image

        Returns:
            Dict with extracted text and metadata
        """
        try:
            start_time = time.time()

            # Validate image
            image = Image.open(io.BytesIO(file_bytes))
            width, height = image.size

            if width * height > 10000000:  # 10MP limit
                raise ValueError("Image too large, max 10MP")

            extracted_text, confidence = OCRService._extract_text(file_bytes, image)

            processing_time = time.time() - start_time

            return {
                'extracted_text': extracted_text,
                'confidence_score': confidence,
                'processing_time_ms': processing_time * 1000,
                'image_dimensions': {'width': width, 'height': height}
            }

        except Exception as e:
            logger.error(f"OCR processing error: {e}")
            raise

    @staticmethod
    def process_image_url(image_url):
        """
        Process image from URL using Mistral OCR API

        Args:
            image_url: URL of the image

        Returns:
            Dict with extracted text and metadata
        """
        try:
            start_time = time.time()

            # Download image
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()

            # Validate image
            image = Image.open(io.BytesIO(response.content))
            width, height = image.size

            if width * height > 10000000:
                raise ValueError("Image too large, max 10MP")

            extracted_text, confidence = OCRService._extract_text(response.content, image)

            processing_time = time.time() - start_time

            return {
                'extracted_text': extracted_text,
                'confidence_score': confidence,
                'processing_time_ms': processing_time * 1000,
                'image_dimensions': {'width': width, 'height': height}
            }

        except Exception as e:
            logger.error(f"OCR URL processing error: {e}")
            raise

    @staticmethod
    def _fallback_ocr_result():
        """
        Return fallback OCR result for backend path.

        Returns:
            Tuple of (extracted_text, confidence_score)
        """
        try:
            return (
                "",
                0.0,
            )

        except Exception as e:
            logger.error(f"Backend OCR fallback error: {e}")
            raise

    @staticmethod
    def validate_image(file_bytes, max_size=10485760):  # 10MB
        """
        Validate image file

        Args:
            file_bytes: Image file in bytes
            max_size: Maximum file size in bytes

        Returns:
            True if valid, raises exception otherwise
        """
        try:
            if len(file_bytes) > max_size:
                raise ValueError(f"File too large, max {max_size} bytes")

            img = Image.open(io.BytesIO(file_bytes))
            if img.format not in ['JPEG', 'PNG', 'WEBP', 'PDF']:
                raise ValueError(f"Unsupported format: {img.format}")

            return True

        except Exception as e:
            logger.error(f"Image validation error: {e}")
            raise

    @staticmethod
    def _extract_text(file_bytes: bytes, image: Image.Image):
        """Primary OCR extraction path with backend-only providers.

        Strategy:
        1) OCR.Space API (if explicitly configured or forced)
        2) Local Tesseract OCR
        3) Empty fallback
        """
        provider = (OCR_PROVIDER or "auto").strip().lower()

        if provider in ("ocr_space", "ocr.space"):
            text, conf = OCRService._extract_with_ocr_space(file_bytes)
            if text:
                return text, conf

        if provider in ("tesseract",):
            text, conf = OCRService._extract_with_tesseract(image)
            if text:
                return text, conf

        if provider == "auto":
            # Auto strategy prioritizes cloud OCR first (no local binary required),
            # then local Tesseract as fallback.
            text, conf = OCRService._extract_with_ocr_space(file_bytes)
            if text:
                return text, conf

            text, conf = OCRService._extract_with_tesseract(image)
            if text:
                return text, conf

        return OCRService._fallback_ocr_result()

    @staticmethod
    def _extract_with_tesseract(image: Image.Image):
        if pytesseract is None:
            return "", 0.0

        try:
            # Improve OCR stability
            if image.mode not in ("L", "RGB"):
                image = image.convert("RGB")

            text = pytesseract.image_to_string(image, lang=TESSERACT_LANG or "eng")
            clean = (text or "").strip()
            if not clean:
                return "", 0.0

            # Tesseract doesn't provide a single confidence directly in this call.
            return clean, 0.86
        except Exception as e:
            logger.warning(f"Tesseract OCR failed: {e}")
            return "", 0.0

    @staticmethod
    def _extract_with_ocr_space(file_bytes: bytes):
        try:
            url = "https://api.ocr.space/parse/image"
            files = {
                "filename": ("ocr-image.png", file_bytes)
            }
            payload = {
                "language": OCR_SPACE_LANGUAGE or "eng",
                "isOverlayRequired": False,
                "OCREngine": 2,
                "detectOrientation": True,
                "scale": True,
            }
            headers = {
                "apikey": OCR_SPACE_API_KEY or "helloworld"
            }

            response = requests.post(url, files=files, data=payload, headers=headers, timeout=40)
            response.raise_for_status()
            data = response.json()

            if data.get("IsErroredOnProcessing"):
                logger.warning(f"OCR.Space error: {data.get('ErrorMessage')}")
                return "", 0.0

            parsed_results = data.get("ParsedResults") or []
            if not parsed_results:
                return "", 0.0

            extracted_parts = []
            for result in parsed_results:
                txt = (result.get("ParsedText") or "").strip()
                if txt:
                    extracted_parts.append(txt)

            if not extracted_parts:
                return "", 0.0

            return "\n".join(extracted_parts), 0.9
        except Exception as e:
            logger.warning(f"OCR.Space extraction failed: {e}")
            return "", 0.0
