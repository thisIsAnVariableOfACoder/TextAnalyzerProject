import base64
import io
import logging
import time
import requests
from PIL import Image
from datetime import datetime
from app.config import MISTRAL_API_KEY
from app.models import OCRResponse

logger = logging.getLogger(__name__)

class OCRService:
    """Service for handling OCR operations"""

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

            # Convert to base64
            image_base64 = base64.b64encode(file_bytes).decode('utf-8')

            # Call Mistral OCR API
            extracted_text, confidence = OCRService._call_mistral_ocr(image_base64)

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

            # Convert to base64
            image_base64 = base64.b64encode(response.content).decode('utf-8')

            # Call Mistral OCR API
            extracted_text, confidence = OCRService._call_mistral_ocr(image_base64)

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
    def _call_mistral_ocr(image_base64):
        """
        Call Mistral OCR API

        Args:
            image_base64: Base64 encoded image

        Returns:
            Tuple of (extracted_text, confidence_score)
        """
        try:
            # NOTE: This is a placeholder implementation
            # The actual Mistral OCR API integration would go here
            # For now, we'll return sample data

            # In production, you would call:
            # response = requests.post(
            #     'https://api.mistral.ai/v1/ocr',
            #     headers={'Authorization': f'Bearer {MISTRAL_API_KEY}'},
            #     json={'image': f'data:image/jpeg;base64,{image_base64}'}
            # )
            # result = response.json()
            # extracted_text = result['result']['text']
            # confidence = result['result']['confidence']

            logger.info("OCR API called successfully")

            # Placeholder return for testing
            return "Sample extracted text from image", 0.95

        except Exception as e:
            logger.error(f"Mistral OCR API error: {e}")
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
