import logging
import time
import requests
from typing import List, Dict
from app.config import LANGUAGE_TOOL_API_KEY
from app.models import ProcessingType

logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'nl': 'Dutch', 'pl': 'Polish',
    'ru': 'Russian', 'ja': 'Japanese', 'zh': 'Chinese', 'ko': 'Korean',
    'ar': 'Arabic', 'th': 'Thai', 'vi': 'Vietnamese', 'id': 'Indonesian',
    'tr': 'Turkish', 'hu': 'Hungarian', 'cs': 'Czech', 'sv': 'Swedish',
    'no': 'Norwegian', 'da': 'Danish', 'fi': 'Finnish', 'el': 'Greek',
    'he': 'Hebrew', 'hi': 'Hindi', 'bn': 'Bengali', 'pa': 'Punjabi',
}

class TextProcessingService:
    """Service for text processing: grammar checking, paraphrasing, translation"""

    @staticmethod
    def check_grammar(text: str, language: str = 'en') -> Dict:
        """
        Check grammar using LanguageTool API

        Args:
            text: Text to check
            language: Language code (e.g., 'en', 'es', 'fr')

        Returns:
            Dict with corrections and suggestions
        """
        try:
            start_time = time.time()

            # Validate input
            if not text or len(text.strip()) == 0:
                raise ValueError("Text cannot be empty")

            if len(text) > 50000:
                raise ValueError("Text exceeds maximum length of 50000 characters")

            # Call LanguageTool API
            response = requests.post(
                'https://api.languagetool.org/v2/check',
                data={
                    'text': text,
                    'language': language,
                    'enabledOnly': False
                },
                timeout=10
            )

            response.raise_for_status()
            result = response.json()

            processing_time = time.time() - start_time

            # Parse results
            suggestions = []
            corrected_text = text

            for match in result.get('matches', []):
                offset = match['offset']
                length = match['length']
                replacements = match.get('replacements', [])

                suggestion = {
                    'offset': offset,
                    'length': length,
                    'message': match.get('message', ''),
                    'rule': match.get('rule', {}).get('id', ''),
                    'replacements': [r['value'] for r in replacements[:3]]  # Top 3
                }
                suggestions.append(suggestion)

            return {
                'original_text': text,
                'suggestions': suggestions,
                'corrected_text': corrected_text,
                'issues_found': len(suggestions),
                'processing_time_ms': processing_time * 1000
            }

        except Exception as e:
            logger.error(f"Grammar check error: {e}")
            raise

    @staticmethod
    def paraphrase(text: str, style: str = 'normal') -> Dict:
        """
        Paraphrase text using multiple strategies

        Args:
            text: Text to paraphrase
            style: Style ('normal', 'formal', 'casual')

        Returns:
            Dict with paraphrased text and alternatives
        """
        try:
            start_time = time.time()

            if not text or len(text.strip()) == 0:
                raise ValueError("Text cannot be empty")

            if len(text) > 50000:
                raise ValueError("Text exceeds maximum length")

            # Generate paraphrases using different strategies
            alternatives = TextProcessingService._generate_paraphrases(text, style)

            processing_time = time.time() - start_time

            return {
                'original_text': text,
                'paraphrased_text': alternatives[0] if alternatives else text,
                'alternatives': alternatives[1:4] if len(alternatives) > 1 else [],
                'style': style,
                'processing_time_ms': processing_time * 1000
            }

        except Exception as e:
            logger.error(f"Paraphrase error: {e}")
            raise

    @staticmethod
    def _generate_paraphrases(text: str, style: str) -> List[str]:
        """
        Generate paraphrased versions of text

        Strategy varies by style:
        - normal: Simple synonym replacement
        - formal: Complex vocabulary, passive voice
        - casual: Conversational tone, contractions
        """
        paraphrases = []

        try:
            # Strategy 1: Synonym-based paraphrasing
            paraphrases.append(TextProcessingService._synonym_paraphrase(text))

            # Strategy 2: Restructuring
            paraphrases.append(TextProcessingService._restructure_paraphrase(text))

            # Strategy 3: Style-based paraphrasing
            if style == 'formal':
                paraphrases.append(TextProcessingService._formalize_text(text))
            elif style == 'casual':
                paraphrases.append(TextProcessingService._casualize_text(text))

            # Remove duplicates and empty entries
            paraphrases = [p for p in paraphrases if p and p != text]
            paraphrases = list(dict.fromkeys(paraphrases))  # Remove duplicates

            return paraphrases if paraphrases else [text]

        except Exception as e:
            logger.warning(f"Paraphrase generation warning: {e}")
            return [text]

    @staticmethod
    def _synonym_paraphrase(text: str) -> str:
        """Basic synonym-based paraphrasing (placeholder)"""
        # In production, integrate with Mistral or similar API
        return f"{text} (synonym version)"

    @staticmethod
    def _restructure_paraphrase(text: str) -> str:
        """Restructure sentences (placeholder)"""
        return f"{text} (restructured version)"

    @staticmethod
    def _formalize_text(text: str) -> str:
        """Make text more formal"""
        return f"{text} (formal version)"

    @staticmethod
    def _casualize_text(text: str) -> str:
        """Make text more casual"""
        return f"{text} (casual version)"

    @staticmethod
    def translate(text: str, source_language: str = 'auto',
                 target_language: str = 'en') -> Dict:
        """
        Translate text between languages

        Args:
            text: Text to translate
            source_language: Source language code ('auto' for detection)
            target_language: Target language code

        Returns:
            Dict with translated text and metadata
        """
        try:
            start_time = time.time()

            if not text or len(text.strip()) == 0:
                raise ValueError("Text cannot be empty")

            if len(text) > 50000:
                raise ValueError("Text exceeds maximum length")

            if target_language not in SUPPORTED_LANGUAGES:
                raise ValueError(f"Unsupported language: {target_language}")

            # Use Google Translate API (via free endpoint)
            translated_text, detected_language = \
                TextProcessingService._google_translate(text, source_language, target_language)

            processing_time = time.time() - start_time

            return {
                'original_text': text,
                'translated_text': translated_text,
                'source_language': source_language,
                'target_language': target_language,
                'detected_language': detected_language,
                'processing_time_ms': processing_time * 1000
            }

        except Exception as e:
            logger.error(f"Translation error: {e}")
            raise

    @staticmethod
    def _google_translate(text: str, source_lang: str, target_lang: str):
        """
        Translate using Google Translate API

        Note: Using free endpoint for development
        """
        try:
            # In production, use official Google Translate API
            # For now, use free service endpoint
            url = 'https://translate.googleapis.com/translate_a/element.js'

            params = {
                'cb': 'GoogleTranslateOnLoad',
                'client': 'gtx',
                'sl': source_lang if source_lang != 'auto' else 'auto',
                'tl': target_lang,
                'u': text
            }

            # Placeholder: In production, implement proper translation
            logger.info(f"Translation placeholder: {source_lang} -> {target_lang}")

            # Return translated text (placeholder)
            return f"[{target_lang}] {text}", source_lang

        except Exception as e:
            logger.error(f"Google Translate API error: {e}")
            # Fallback response
            return text, 'unknown'

    @staticmethod
    def get_supported_languages() -> Dict[str, str]:
        """Get all supported languages"""
        return SUPPORTED_LANGUAGES
