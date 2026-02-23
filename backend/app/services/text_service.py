import logging
import time
import requests
from typing import List, Dict
from app.config import LANGUAGE_TOOL_API_KEY, GOOGLE_TRANSLATE_API_KEY, MISTRAL_API_KEY
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
        Generate paraphrased versions using Mistral API

        Strategy varies by style:
        - normal: General paraphrasing preserving meaning
        - formal: Complex vocabulary and professional tone
        - casual: Conversational tone with simple language
        """
        paraphrases = []

        try:
            # Only use Mistral for paraphrasing if key is configured
            if not MISTRAL_API_KEY:
                logger.warning("MISTRAL_API_KEY not configured, returning original text")
                return [text]

            prompts = {
                'normal': f"Paraphrase this text while maintaining the exact meaning: {text}",
                'formal': f"Rewrite this text in a more formal, professional tone: {text}",
                'casual': f"Rewrite this text in a casual, conversational tone with simple language: {text}"
            }

            prompt = prompts.get(style, prompts['normal'])

            # Call Mistral Chat API for paraphrasing
            headers = {
                "Authorization": f"Bearer {MISTRAL_API_KEY}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": "mistral-small-latest",
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "temperature": 0.7,
                "max_tokens": len(text.split()) * 2  # Allow space for longer paraphrase
            }

            response = requests.post(
                "https://api.mistral.ai/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=30
            )

            if response.status_code != 200:
                logger.warning(f"Mistral API error: {response.text}, returning original text")
                return [text]

            result = response.json()
            paraphrased = result["choices"][0]["message"]["content"]
            paraphrases.append(paraphrased)

            # Generate one alternative with different style
            if style != 'formal':
                alt_prompt = prompts['formal']
            else:
                alt_prompt = prompts['normal']

            payload["messages"] = [{"role": "user", "content": alt_prompt}]

            response = requests.post(
                "https://api.mistral.ai/v1/chat/completions",
                json=payload,
                headers=headers,
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                alt_paraphrased = result["choices"][0]["message"]["content"]
                if alt_paraphrased != paraphrased:
                    paraphrases.append(alt_paraphrased)

            # Remove duplicates and empty entries
            paraphrases = [p for p in paraphrases if p and p != text]
            paraphrases = list(dict.fromkeys(paraphrases))  # Remove duplicates

            return paraphrases if paraphrases else [text]

        except Exception as e:
            logger.warning(f"Paraphrase generation error: {e}, returning original text")
            return [text]

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

        Args:
            text: Text to translate
            source_lang: Source language code
            target_lang: Target language code

        Returns:
            Tuple of (translated_text, detected_language)
        """
        try:
            if not GOOGLE_TRANSLATE_API_KEY:
                raise ValueError("GOOGLE_TRANSLATE_API_KEY not configured")

            # Prepare the request to Google Translate API
            headers = {
                "Content-Type": "application/json"
            }

            payload = {
                "q": text,
                "target_language": target_lang,
                "key": GOOGLE_TRANSLATE_API_KEY
            }

            # Add source language if not auto-detect
            if source_lang != 'auto':
                payload["source_language"] = source_lang

            response = requests.post(
                "https://translation.googleapis.com/language/translate/v2",
                json=payload,
                headers=headers,
                timeout=15
            )

            if response.status_code != 200:
                error_msg = f"Google Translate API error {response.status_code}: {response.text}"
                logger.error(error_msg)
                raise Exception(error_msg)

            result = response.json()
            translated_text = result["data"]["translations"][0]["translatedText"]

            # Try to get detected source language
            detected_language = result["data"]["translations"][0].get("detectedSourceLanguage", source_lang)

            logger.info(f"Translation successful: {source_lang} -> {target_lang}")

            return translated_text, detected_language

        except Exception as e:
            logger.error(f"Google Translate API error: {e}")
            # Fallback: return original text
            raise

    @staticmethod
    def get_supported_languages() -> Dict[str, str]:
        """Get all supported languages"""
        return SUPPORTED_LANGUAGES
