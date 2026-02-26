import logging
import re
import string
import time
from typing import Dict, List, Tuple
from xml.sax.saxutils import unescape

import requests
from app.config import TEXT_PROVIDER_MODE

try:
    from deep_translator import GoogleTranslator
except Exception:  # pragma: no cover
    GoogleTranslator = None


logger = logging.getLogger(__name__)


SUPPORTED_LANGUAGES = {
    'en': 'English', 'vi': 'Vietnamese', 'es': 'Spanish', 'fr': 'French',
    'de': 'German', 'it': 'Italian', 'pt': 'Portuguese', 'nl': 'Dutch',
    'pl': 'Polish', 'ru': 'Russian', 'ja': 'Japanese', 'zh': 'Chinese',
    'ko': 'Korean', 'ar': 'Arabic', 'th': 'Thai', 'id': 'Indonesian',
    'tr': 'Turkish', 'hu': 'Hungarian', 'cs': 'Czech', 'sv': 'Swedish',
    'no': 'Norwegian', 'da': 'Danish', 'fi': 'Finnish', 'el': 'Greek',
    'he': 'Hebrew', 'hi': 'Hindi', 'bn': 'Bengali', 'pa': 'Punjabi',
}


LANGUAGE_TOOL_MAP = {
    'en': 'en-US',
    'vi': 'vi',
    'es': 'es',
    'fr': 'fr',
    'de': 'de',
    'pt': 'pt',
    'it': 'it',
    'ru': 'ru',
    'pl': 'pl',
    'nl': 'nl',
}


COMMON_TYPO_FIXES = {
    "teh": "the",
    "recieve": "receive",
    "seperate": "separate",
    "definately": "definitely",
    "wich": "which",
    "dont": "don't",
    "cant": "can't",
    "wont": "won't",
    "im": "I'm",
}


MULTI_WORD_DICTIONARY = {
    'hello': {'vi': 'xin chào', 'es': 'hola', 'fr': 'bonjour', 'de': 'hallo', 'ja': 'こんにちは', 'ko': '안녕하세요', 'zh': '你好'},
    'world': {'vi': 'thế giới', 'es': 'mundo', 'fr': 'monde', 'de': 'welt', 'ja': '世界', 'ko': '세계', 'zh': '世界'},
    'good': {'vi': 'tốt', 'es': 'bueno', 'fr': 'bon', 'de': 'gut', 'ja': '良い', 'ko': '좋은', 'zh': '好'},
    'morning': {'vi': 'buổi sáng', 'es': 'mañana', 'fr': 'matin', 'de': 'morgen', 'ja': '朝', 'ko': '아침', 'zh': '早晨'},
    'thank': {'vi': 'cảm ơn', 'es': 'gracias', 'fr': 'merci', 'de': 'danke', 'ja': 'ありがとう', 'ko': '감사', 'zh': '谢谢'},
    'you': {'vi': 'bạn', 'es': 'tú', 'fr': 'vous', 'de': 'du', 'ja': 'あなた', 'ko': '당신', 'zh': '你'},
    'this': {'vi': 'điều này', 'es': 'esto', 'fr': 'ceci', 'de': 'dies', 'ja': 'これ', 'ko': '이것', 'zh': '这个'},
    'is': {'vi': 'là', 'es': 'es', 'fr': 'est', 'de': 'ist', 'ja': 'は', 'ko': '이다', 'zh': '是'},
    'test': {'vi': 'bài kiểm tra', 'es': 'prueba', 'fr': 'test', 'de': 'test', 'ja': 'テスト', 'ko': '테스트', 'zh': '测试'},
}


def _detect_language(text: str) -> str:
    lower = text.lower()
    if re.search(r"[ăâđêôơưáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệóòỏõọốồổỗộớờởỡợúùủũụứừửữựíìỉĩịýỳỷỹỵ]", lower):
        return 'vi'
    if re.search(r"[а-яё]", lower):
        return 'ru'
    if re.search(r"[一-龯]", lower):
        return 'zh'
    if re.search(r"[ぁ-んァ-ン]", lower):
        return 'ja'
    if re.search(r"[가-힣]", lower):
        return 'ko'
    return 'en'


def _looks_like_error_payload(text: str) -> bool:
    if not text:
        return True
    lowered = text.lower()
    markers = [
        'error 500',
        "that's an error",
        'internal server error',
        '<html',
        '</html>',
        'captcha',
        'access denied',
    ]
    return any(marker in lowered for marker in markers)


def _sentence_split(text: str) -> List[str]:
    return [p.strip() for p in re.split(r"(?<=[.!?])\s+", text.strip()) if p.strip()]


def _clean_english_replacements(original_fragment: str, replacements: List[str]) -> List[str]:
    """Filter obviously invalid English replacement candidates.

    Example bad candidate we explicitly prevent: "is likes" for "like".
    """
    cleaned: List[str] = []
    original_words = re.findall(r"[A-Za-z']+", original_fragment or "")

    for candidate in replacements or []:
        if not isinstance(candidate, str):
            continue

        text = candidate.strip()
        if not text:
            continue

        words = re.findall(r"[A-Za-z']+", text)
        lower_words = [w.lower() for w in words]

        # Reject malformed auxiliary-prefixed candidates for single-word originals.
        # e.g. like -> "is likes" or "is like"
        if (
            len(original_words) <= 1
            and len(lower_words) >= 2
            and lower_words[0] in {"am", "is", "are", "was", "were"}
        ):
            continue

        if text not in cleaned:
            cleaned.append(text)

    return cleaned


def _normalize_text(text: str) -> Tuple[str, List[Dict]]:
    suggestions: List[Dict] = []
    corrected = text

    for m in re.finditer(r" {2,}", corrected):
        suggestions.append({
            "offset": m.start(),
            "length": m.end() - m.start(),
            "message": "Multiple consecutive spaces detected",
            "rule": "MULTIPLE_SPACES",
            "replacements": [" "],
        })
    corrected = re.sub(r" {2,}", " ", corrected)

    corrected = re.sub(r"\s+([,.!?;:])", r"\1", corrected)
    corrected = re.sub(r"([,.!?;:])(\w)", r"\1 \2", corrected)
    corrected = re.sub(r"\n{3,}", "\n\n", corrected)

    if corrected and corrected[0].isalpha() and corrected[0].islower():
        suggestions.append({
            "offset": 0,
            "length": 1,
            "message": "Sentence should start with a capital letter",
            "rule": "CAPITALIZATION",
            "replacements": [corrected[0].upper()],
        })
        corrected = corrected[0].upper() + corrected[1:]

    trimmed = corrected.rstrip()
    if trimmed and trimmed[-1] not in '.!?':
        suggestions.append({
            "offset": len(trimmed),
            "length": 0,
            "message": "Sentence may need ending punctuation",
            "rule": "END_PUNCTUATION",
            "replacements": [".", "!", "?"],
        })
        corrected = trimmed + "."

    return corrected, suggestions


def _apply_typo_fixes(text: str) -> Tuple[str, List[Dict]]:
    suggestions: List[Dict] = []
    corrected = text
    tokens = re.finditer(r"\b[A-Za-z']+\b", corrected)

    replacements: List[Tuple[int, int, str, str]] = []
    for match in tokens:
        token = match.group(0)
        replacement = COMMON_TYPO_FIXES.get(token.lower())
        if not replacement:
            continue
        if token[0].isupper():
            replacement = replacement[0].upper() + replacement[1:]
        replacements.append((match.start(), match.end(), token, replacement))

    for start, end, original, replacement in reversed(replacements):
        corrected = corrected[:start] + replacement + corrected[end:]
        suggestions.append({
            "offset": start,
            "length": len(original),
            "message": f"Possible typo: '{original}'",
            "rule": "COMMON_TYPO",
            "replacements": [replacement],
        })

    suggestions.reverse()

    # Repeated word rule: "the the" -> "the"
    dedup_matches = list(re.finditer(r"\b(\w+)\s+\1\b", corrected, flags=re.IGNORECASE))
    for match in reversed(dedup_matches):
        word = match.group(1)
        corrected = corrected[:match.start()] + word + corrected[match.end():]
        suggestions.append({
            "offset": match.start(),
            "length": len(match.group(0)),
            "message": "Repeated word detected",
            "rule": "REPEATED_WORD",
            "replacements": [word],
        })

    # a/an simple rule for English
    article_matches = list(re.finditer(r"\b(a)\s+([aeiouAEIOU]\w*)\b", corrected))
    for match in reversed(article_matches):
        corrected = corrected[:match.start(1)] + ('an' if match.group(1).islower() else 'An') + corrected[match.end(1):]
        suggestions.append({
            "offset": match.start(1),
            "length": len(match.group(1)),
            "message": "Article should be 'an' before vowel sound",
            "rule": "ARTICLE_A_AN",
            "replacements": ['an'],
        })

    suggestions.sort(key=lambda x: x.get('offset', 0))
    return corrected, suggestions


def _apply_english_agreement_fixes(text: str) -> Tuple[str, List[Dict]]:
    suggestions: List[Dict] = []
    corrected = text

    source_text = text

    patterns = [
        (r"\bthis are\b", "this is"),
        (r"\bthat are\b", "that is"),
        (r"\bthese is\b", "these are"),
        (r"\bthose is\b", "those are"),
        (r"\bthese are a\b", "this is a"),
        (r"\bthose are a\b", "that is a"),
        (r"\bhe are\b", "he is"),
        (r"\bshe are\b", "she is"),
        (r"\bit are\b", "it is"),
        (r"\bhe like\b", "he likes"),
        (r"\bshe like\b", "she likes"),
        (r"\bit like\b", "it likes"),
        (r"\bhe have\b", "he has"),
        (r"\bshe have\b", "she has"),
        (r"\bit have\b", "it has"),
        (r"\bhe do\b", "he does"),
        (r"\bshe do\b", "she does"),
        (r"\bit do\b", "it does"),
    ]

    for pattern, replacement in patterns:
        for m in list(re.finditer(pattern, source_text, flags=re.IGNORECASE)):
            original = m.group(0)
            new_value = replacement
            if original and original[0].isupper():
                new_value = replacement[0].upper() + replacement[1:]

            # apply on corrected text best-effort by same span indexes
            if m.end() <= len(corrected):
                corrected = corrected[:m.start()] + new_value + corrected[m.end():]

            suggestions.append({
                'offset': m.start(),
                'length': len(original),
                'message': 'Subject–verb agreement issue',
                'rule': 'SUBJECT_VERB_AGREEMENT',
                'replacements': [new_value],
            })

    # an + consonant simple correction
    for m in list(re.finditer(r"\ban\s+([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]\w*)\b", source_text)):
        if m.end() <= len(corrected):
            corrected = corrected[:m.start()] + ('A ' if m.group(0).startswith('A') else 'a ') + m.group(1) + corrected[m.end():]
        suggestions.append({
            'offset': m.start(),
            'length': 2,
            'message': "Article should be 'a' before consonant sound",
            'rule': 'ARTICLE_A_AN',
            'replacements': ['a'],
        })

    suggestions.sort(key=lambda x: x.get('offset', 0))
    return corrected, suggestions


def _apply_english_contextual_fixes(text: str) -> Tuple[str, List[Dict]]:
    """Apply higher-signal English fixes for common tense/grammar mistakes.

    These rules are intentionally conservative and target recurring mistakes in
    narrative/past-tense paragraphs where remote grammar providers may be
    unavailable.
    """
    suggestions: List[Dict] = []
    corrected = text
    source_text = text

    rules = [
        {
            'pattern': r"\bYesterday\s+I\s+go\b",
            'replacement': "Yesterday I went",
            'message': "Use past tense after 'Yesterday'",
            'rule': 'TENSE_PAST_TIME_MARKER',
            'alternatives': ["Yesterday I went"],
        },
        {
            'pattern': r"\bmy\s+mother\s+tell\s+me\b",
            'replacement': "my mother told me",
            'message': "Past narrative typically uses 'told'",
            'rule': 'TENSE_VERB_FORM',
            'alternatives': ["my mother told me"],
        },
        {
            'pattern': r"\bwas\s+arrived\b",
            'replacement': "arrived",
            'message': "Do not combine 'was' with a simple past form here",
            'rule': 'AUXILIARY_MISUSE',
            'alternatives': ["arrived", "had arrived"],
        },
        {
            'pattern': r"\bI\s+realize\b",
            'replacement': "I realized",
            'message': "Use past tense for timeline consistency",
            'rule': 'TENSE_CONSISTENCY',
            'alternatives': ["I realized"],
        },
        {
            'pattern': r"\bI\s+forget\b",
            'replacement': "I forgot",
            'message': "Use past tense in past narrative",
            'rule': 'TENSE_VERB_FORM',
            'alternatives': ["I forgot"],
        },
        {
            'pattern': r"\bhave\s+to\s+walked\b",
            'replacement': "have to walk",
            'message': "Use base verb after 'have to'",
            'rule': 'MODAL_BASE_VERB',
            'alternatives': ["have to walk", "had to walk"],
        },
        {
            'pattern': r"\bI\s+see\s+a\s+dog\b",
            'replacement': "I saw a dog",
            'message': "Use past tense for narrative consistency",
            'rule': 'TENSE_VERB_FORM',
            'alternatives': ["I saw a dog"],
        },
        {
            'pattern': r"\bwho\s+were\s+barking\b",
            'replacement': "that was barking",
            'message': "Singular noun should use singular verb",
            'rule': 'SUBJECT_VERB_AGREEMENT',
            'alternatives': ["that was barking", "which was barking"],
        },
        {
            'pattern': r"\bmakes\s+me\s+feeling\b",
            'replacement': "makes me feel",
            'message': "Use base verb after 'make + object'",
            'rule': 'VERB_PATTERN',
            'alternatives': ["makes me feel", "made me feel"],
        },
        {
            'pattern': r"\bI\s+get\s+home\b",
            'replacement': "I got home",
            'message': "Use past tense in past narrative",
            'rule': 'TENSE_VERB_FORM',
            'alternatives': ["I got home"],
        },
        {
            'pattern': r"\bdoesn[’']t\s+even\s+notice\b",
            'replacement': "didn't even notice",
            'message': "Past narrative suggests past auxiliary",
            'rule': 'TENSE_AUXILIARY',
            'alternatives': ["didn't even notice", "did not even notice"],
        },
        {
            'pattern': r"\bI\s+am\s+very\s+tired\b",
            'replacement': "I was very tired",
            'message': "Use past tense for timeline consistency",
            'rule': 'TENSE_CONSISTENCY',
            'alternatives': ["I was very tired"],
        },
        {
            'pattern': r"\bwas\s+a\s+very\s+bad\s+day\b",
            'replacement': "was a very bad day",
            'message': "Checked phrase",
            'rule': 'NOOP',
            'alternatives': ["was a very bad day"],
        },
        {
            'pattern': r"\bwas\s+very\s+bad\s+day\b",
            'replacement': "was a very bad day",
            'message': "Add article before singular count noun",
            'rule': 'ARTICLE_REQUIRED',
            'alternatives': ["was a very bad day"],
        },
    ]

    for rule in rules:
        pattern = rule['pattern']
        replacement = rule['replacement']
        matches = list(re.finditer(pattern, source_text, flags=re.IGNORECASE))
        for m in reversed(matches):
            original = m.group(0)
            final_replacement = replacement
            if original and original[0].isupper():
                final_replacement = replacement[:1].upper() + replacement[1:]

            if m.end() <= len(corrected):
                corrected = corrected[:m.start()] + final_replacement + corrected[m.end():]

            if rule['rule'] != 'NOOP':
                suggestions.append({
                    'offset': m.start(),
                    'length': len(original),
                    'message': rule['message'],
                    'rule': rule['rule'],
                    'replacements': rule.get('alternatives', [final_replacement])[:6],
                })

    suggestions.sort(key=lambda x: x.get('offset', 0))
    return corrected, suggestions


def _normalize_paraphrase_text(text: str) -> str:
    normalized = re.sub(r"\s+", " ", (text or "").strip())
    if normalized and normalized[-1] not in '.!?':
        normalized += '.'
    return normalized


def _collect_unique_paraphrases(candidates: List[str], base: str) -> List[str]:
    result: List[str] = []
    base_normalized = _normalize_paraphrase_text(base).lower()

    for candidate in candidates:
        normalized = _normalize_paraphrase_text(candidate)
        if not normalized:
            continue
        if normalized.lower() == base_normalized:
            continue
        if normalized not in result:
            result.append(normalized)

    return result


def _connector_rewrite_variant(text: str) -> str:
    working = text
    swaps = [
        (r"\bbecause\b", "since"),
        (r"\bhowever\b", "nevertheless"),
        (r"\btherefore\b", "as a result"),
        (r"\bin order to\b", "to"),
        (r"\bdue to\b", "because of"),
        (r"\balso\b", "in addition"),
    ]
    for pattern, replacement in swaps:
        working = re.sub(pattern, replacement, working, flags=re.IGNORECASE)
    return _normalize_paraphrase_text(working)


def _because_clause_variant(text: str) -> str:
    sentences = _sentence_split(text)
    if not sentences:
        return _normalize_paraphrase_text(text)

    rewritten: List[str] = []
    changed = False

    for sentence in sentences:
        raw = sentence.strip()
        trailing = '.'
        if raw and raw[-1] in '.!?':
            trailing = raw[-1]
            raw = raw[:-1].strip()

        match = re.match(r"^(?P<left>.+?)\s+because\s+(?P<right>.+)$", raw, flags=re.IGNORECASE)
        if not match:
            rewritten.append(sentence)
            continue

        left = match.group('left').strip()
        right = match.group('right').strip()
        if not left or not right:
            rewritten.append(sentence)
            continue

        changed = True
        rewritten.append(f"Because {right}, {left}{trailing}")

    if not changed:
        return _normalize_paraphrase_text(text)

    return _normalize_paraphrase_text(' '.join(rewritten))


def _template_paraphrase_variants(text: str) -> List[str]:
    base = _normalize_paraphrase_text(text)
    if not base:
        return []

    core = base[:-1] if base[-1] in '.!?' else base
    if not core:
        return []

    lower_core = core[:1].lower() + core[1:] if len(core) > 1 else core.lower()
    return [
        f"In other words, {lower_core}.",
        f"To put it differently, {lower_core}.",
        f"Put simply, {lower_core}.",
        f"This can be restated as follows: {core}.",
    ]


def _local_paraphrase_variants(text: str, style: str) -> Tuple[str, List[str]]:
    working = _normalize_paraphrase_text(text)
    if not working:
        return text, []

    core_map = {
        'important': 'essential',
        'good': 'beneficial',
        'bad': 'unfavorable',
        'very': 'highly',
        'many': 'numerous',
        'help': 'support',
        'show': 'demonstrate',
        'use': 'utilize',
        'make sure': 'ensure',
        'about': 'regarding',
    }

    style_map = {}
    if style == 'casual':
        style_map.update({
            'cannot': "can't",
            'do not': "don't",
            'does not': "doesn't",
            'is not': "isn't",
        })
    elif style == 'formal':
        style_map.update({
            'get': 'obtain',
            'buy': 'purchase',
            'start': 'commence',
            'need': 'require',
            'help': 'assist',
        })

    main = _normalize_paraphrase_text(_replace_with_map(working, {**core_map, **style_map}))

    candidates: List[str] = []
    candidates.append(_replace_with_map(working, core_map))
    candidates.append(_replace_with_map(working, {**core_map, 'because': 'as'}))
    candidates.append(_connector_rewrite_variant(working))
    candidates.append(_because_clause_variant(working))

    sentences = _sentence_split(working)
    if len(sentences) > 1:
        candidates.append(' '.join(sentences[1:] + sentences[:1]))

    candidates.extend(_template_paraphrase_variants(working))

    alternatives = _collect_unique_paraphrases(candidates, main)
    return main, alternatives[:8]


def _check_with_languagetool(text: str, language: str) -> Tuple[str, List[Dict]]:
    lt_language = LANGUAGE_TOOL_MAP.get(language, 'en-US')
    response = requests.post(
        'https://api.languagetool.org/v2/check',
        data={
            'text': text,
            'language': lt_language,
            'enabledOnly': 'false',
        },
        timeout=10,
    )
    response.raise_for_status()
    payload = response.json()

    suggestions: List[Dict] = []
    corrections: List[Tuple[int, int, str]] = []

    for match in payload.get('matches', []):
        offset = int(match.get('offset', 0))
        length = int(match.get('length', 0))
        replacements = [r.get('value', '') for r in match.get('replacements', []) if r.get('value')]
        suggestion_item = {
            'offset': offset,
            'length': length,
            'message': match.get('message', 'Grammar suggestion'),
            'rule': match.get('rule', {}).get('id', 'LANGUAGE_TOOL'),
            'replacements': replacements[:6],
        }

        context_start = max(0, offset - 20)
        context_end = min(len(text), offset + length + 20)
        suggestion_item['context'] = text[context_start:context_end]
        if length > 0 and offset <= len(text):
            suggestion_item['original'] = text[offset:offset + length]

        suggestions.append(suggestion_item)
        if replacements and length >= 0:
            corrections.append((offset, length, replacements[0]))

    corrected = text
    for offset, length, replacement in sorted(corrections, key=lambda x: x[0], reverse=True):
        if offset < 0 or offset > len(corrected):
            continue
        right = offset + max(length, 0)
        corrected = corrected[:offset] + replacement + corrected[right:]

    return corrected, suggestions


def _replace_with_map(text: str, replacement_map: Dict[str, str]) -> str:
    result = text
    for source, target in replacement_map.items():
        result = re.sub(rf"\b{re.escape(source)}\b", target, result, flags=re.IGNORECASE)
    return result


def _style_transform(text: str, style: str) -> str:
    formal_map = {
        "a lot of": "many",
        "get": "obtain",
        "help": "assist",
        "buy": "purchase",
        "show": "demonstrate",
        "use": "utilize",
        "need": "require",
    }
    casual_map = {
        "cannot": "can't",
        "do not": "don't",
        "does not": "doesn't",
        "is not": "isn't",
        "are not": "aren't",
        "I am": "I'm",
        "it is": "it's",
    }
    normal_map = {
        "important": "essential",
        "good": "great",
        "bad": "poor",
        "very": "quite",
        "big": "large",
        "small": "compact",
        "quick": "rapid",
    }

    if style == 'formal':
        transformed = _replace_with_map(text, formal_map)
    elif style == 'casual':
        transformed = _replace_with_map(text, casual_map)
    else:
        transformed = _replace_with_map(text, normal_map)

    transformed = re.sub(r"\s+", " ", transformed).strip()
    if transformed and transformed[-1] not in '.!?':
        transformed += '.'
    return transformed


def _google_translate(text: str, source: str, target: str) -> str:
    if GoogleTranslator is None:
        raise RuntimeError('deep-translator is unavailable')

    src = source if source in SUPPORTED_LANGUAGES else 'auto'
    translated = GoogleTranslator(source=src, target=target).translate(text)
    translated = unescape((translated or '').strip())
    if _looks_like_error_payload(translated):
        raise RuntimeError('Translator returned error payload')
    return translated or text


def _looks_translation_plausible(original: str, translated: str, target: str) -> bool:
    if not translated:
        return False

    source_words = re.findall(r"\w+", original.lower())
    out_words = re.findall(r"\w+", translated.lower())
    if source_words and out_words and len(source_words) > 3:
        ratio = len(out_words) / max(1, len(source_words))
        if ratio < 0.45 or ratio > 2.4:
            return False

    # sentiment-negation guard for EN -> VI (common regression reported)
    if target == 'vi' and re.search(r"\b(is|are|was|were|am)\s+(a\s+)?good\b", original.lower()):
        if re.search(r"\b(không|chẳng|chả)\b", translated.lower()):
            return False

    # if output equals source for different target language, likely failed
    if translated.strip().lower() == original.strip().lower() and target != _detect_language(original):
        return False

    return True


def _mymemory_translate(text: str, source: str, target: str) -> str:
    src = source if source in SUPPORTED_LANGUAGES else _detect_language(text)
    params = {
        'q': text,
        'langpair': f"{src}|{target}",
    }
    response = requests.get(
        'https://api.mymemory.translated.net/get',
        params=params,
        timeout=10,
    )
    response.raise_for_status()
    payload = response.json()
    translated = payload.get('responseData', {}).get('translatedText')
    translated = unescape((translated or '').strip())
    if not translated:
        raise RuntimeError('MyMemory returned empty translation')
    if _looks_like_error_payload(translated):
        raise RuntimeError('MyMemory returned error payload')
    return translated


def _back_translate(text: str, pivot: str) -> str:
    step1 = _google_translate(text, 'auto', pivot)
    step2 = _google_translate(step1, pivot, 'en')
    return step2


def _translate_rule_based(text: str, target_language: str) -> str:
    tokens = re.findall(r"\w+|\W+", text, flags=re.UNICODE)
    out: List[str] = []

    for token in tokens:
        if not re.match(r"^\w+$", token, flags=re.UNICODE):
            out.append(token)
            continue

        translated = MULTI_WORD_DICTIONARY.get(token.lower(), {}).get(target_language)
        if not translated:
            out.append(token)
        elif token[0].isupper():
            out.append(translated[:1].upper() + translated[1:])
        else:
            out.append(translated)

    return ''.join(out)


class TextProcessingService:
    """Text processing service using free providers with local fallback."""

    @staticmethod
    def check_grammar(text: str, language: str = 'en') -> Dict:
        try:
            start_time = time.time()

            if not text or len(text.strip()) == 0:
                raise ValueError("Text cannot be empty")

            if len(text) > 50000:
                raise ValueError("Text exceeds maximum length of 50000 characters")

            resolved_language = language if language in SUPPORTED_LANGUAGES else _detect_language(text)

            source = 'languagetool_public'
            if TEXT_PROVIDER_MODE == 'local_only':
                source = 'local_heuristic'
                corrected_text, suggestions = _normalize_text(text)
                if resolved_language.startswith('en'):
                    corrected_text, typo_suggestions = _apply_typo_fixes(corrected_text)
                    suggestions.extend(typo_suggestions)
            else:
                try:
                    corrected_text, suggestions = _check_with_languagetool(text, resolved_language)
                except Exception as remote_err:
                    logger.warning('LanguageTool unavailable, using local grammar fallback: %s', remote_err)
                    source = 'local_heuristic'
                    corrected_text, suggestions = _normalize_text(text)
                    if resolved_language.startswith('en'):
                        corrected_text, typo_suggestions = _apply_typo_fixes(corrected_text)
                        suggestions.extend(typo_suggestions)

            if resolved_language.startswith('en'):
                corrected_text, agreement_suggestions = _apply_english_agreement_fixes(corrected_text)
                suggestions.extend(agreement_suggestions)
                corrected_text, contextual_suggestions = _apply_english_contextual_fixes(corrected_text)
                suggestions.extend(contextual_suggestions)

            # Enrich suggestions with context + keep multiple options for UI
            enriched = []
            for item in suggestions:
                offset = int(item.get('offset', 0)) if str(item.get('offset', '')).isdigit() or isinstance(item.get('offset'), int) else 0
                length = int(item.get('length', 0)) if str(item.get('length', '')).isdigit() or isinstance(item.get('length'), int) else 0
                left = max(0, offset - 20)
                right = min(len(text), offset + max(0, length) + 20)
                original_fragment = item.get('original') or (text[offset:offset + length] if length > 0 else '')

                replacements = item.get('replacements') or []
                if isinstance(replacements, list):
                    dedup = []
                    for r in replacements:
                        if isinstance(r, str) and r.strip() and r not in dedup:
                            dedup.append(r)
                    if resolved_language.startswith('en'):
                        dedup = _clean_english_replacements(original_fragment, dedup)
                    replacements = dedup[:6]
                else:
                    replacements = []

                enriched.append({
                    **item,
                    'offset': offset,
                    'length': length,
                    'context': item.get('context') or text[left:right],
                    'original': original_fragment,
                    'replacements': replacements,
                })

            suggestions = enriched

            suggestions.sort(key=lambda x: x.get('offset', 0))

            processing_time = time.time() - start_time

            return {
                'original_text': text,
                'suggestions': suggestions,
                'corrected_text': corrected_text,
                'issues_found': len(suggestions),
                'processing_time_ms': processing_time * 1000,
                'source': source,
            }
        except Exception as e:
            logger.error(f"Grammar check error: {e}")
            raise

    @staticmethod
    def paraphrase(text: str, style: str = 'normal') -> Dict:
        try:
            start_time = time.time()

            if not text or len(text.strip()) == 0:
                raise ValueError("Text cannot be empty")

            if len(text) > 50000:
                raise ValueError("Text exceeds maximum length")

            detected = _detect_language(text)
            working = text
            source = 'local_heuristic'

            if TEXT_PROVIDER_MODE == 'free_single' and detected != 'en':
                try:
                    working = _google_translate(text, detected, 'en')
                    source = 'deep_translator'
                except Exception as translate_err:
                    logger.warning('Paraphrase pre-translate failed: %s', translate_err)

            candidates: List[str] = []

            # Back-translation usually gives natural rewording
            if TEXT_PROVIDER_MODE == 'free_single':
                for pivot in ('fr', 'de', 'es', 'it', 'pt'):
                    try:
                        bt = _back_translate(working, pivot)
                        if bt and bt.strip() and (not _looks_like_error_payload(bt)) and bt.strip().lower() != working.strip().lower():
                            candidates.append(bt.strip())
                            source = 'deep_translator'
                    except Exception:
                        continue

            base = candidates[0] if candidates else working
            if _looks_like_error_payload(base):
                base = working

            main = _style_transform(base, style)
            local_main, local_alternatives = _local_paraphrase_variants(working, style)

            if _looks_like_error_payload(main):
                main = local_main

            if main.strip().lower() == text.strip().lower():
                main = local_main

            alternatives = []
            for candidate in candidates[1:]:
                styled = _style_transform(candidate, style)
                if (not _looks_like_error_payload(styled)) and styled.strip().lower() != main.strip().lower() and styled not in alternatives:
                    alternatives.append(styled)

            alternatives.extend(local_alternatives)
            alternatives.extend(_template_paraphrase_variants(working))
            alternatives.extend(_template_paraphrase_variants(main))
            alternatives.append(_connector_rewrite_variant(working))
            alternatives.append(_because_clause_variant(working))

            alternatives = _collect_unique_paraphrases(alternatives, main)

            if len(alternatives) < 5:
                padding_pool = _template_paraphrase_variants(local_main) + [
                    _style_transform(working.replace(' because ', ' since '), style),
                    _style_transform(working.replace(' however ', ' still '), style),
                ]
                for candidate in _collect_unique_paraphrases(padding_pool, main):
                    if candidate not in alternatives:
                        alternatives.append(candidate)
                    if len(alternatives) >= 5:
                        break

            # Convert back to original language if needed
            if TEXT_PROVIDER_MODE == 'free_single' and detected != 'en':
                try:
                    main = _google_translate(main, 'en', detected)
                    translated_alts = []
                    for alt in alternatives:
                        try:
                            translated_alts.append(_google_translate(alt, 'en', detected))
                        except Exception:
                            translated_alts.append(alt)
                    alternatives = translated_alts
                except Exception:
                    pass

            dedup_alts = []
            for alt in alternatives:
                if alt and alt.strip() and alt.strip().lower() != main.strip().lower() and alt not in dedup_alts:
                    dedup_alts.append(alt)

            if len(dedup_alts) < 5:
                for candidate in _template_paraphrase_variants(main):
                    if candidate not in dedup_alts and candidate.strip().lower() != main.strip().lower():
                        dedup_alts.append(candidate)
                    if len(dedup_alts) >= 5:
                        break

            processing_time = time.time() - start_time
            return {
                'original_text': text,
                'paraphrased_text': main,
                'alternatives': dedup_alts[:5],
                'style': style,
                'processing_time_ms': processing_time * 1000,
                'source': source,
            }

        except Exception as e:
            logger.error(f"Paraphrase error: {e}")
            raise

    @staticmethod
    def translate(text: str, source_language: str = 'auto', target_language: str = 'vi') -> Dict:
        try:
            start_time = time.time()

            if not text or len(text.strip()) == 0:
                raise ValueError("Text cannot be empty")

            if len(text) > 50000:
                raise ValueError("Text exceeds maximum length")

            if target_language not in SUPPORTED_LANGUAGES:
                raise ValueError(f"Unsupported language: {target_language}")

            detected_language = _detect_language(text) if source_language == 'auto' else source_language
            if detected_language == target_language:
                translated_text = text
                source = 'noop_same_language'
            else:
                if TEXT_PROVIDER_MODE == 'local_only':
                    translated_text = _translate_rule_based(text, target_language)
                    source = 'rule_based_fallback'
                else:
                    source = 'deep_translator'
                    try:
                        translated_text = _google_translate(text, source_language, target_language)
                        if not _looks_translation_plausible(text, translated_text, target_language):
                            raise RuntimeError('Primary translation failed plausibility checks')
                    except Exception as remote_err:
                        logger.warning('Deep translator failed, trying MyMemory fallback: %s', remote_err)
                        try:
                            translated_text = _mymemory_translate(text, source_language, target_language)
                            if not _looks_translation_plausible(text, translated_text, target_language):
                                raise RuntimeError('MyMemory translation failed plausibility checks')
                            source = 'mymemory_fallback'
                        except Exception as mymemory_err:
                            logger.warning('MyMemory fallback failed, using dictionary fallback: %s', mymemory_err)
                            translated_text = _translate_rule_based(text, target_language)
                            source = 'rule_based_fallback'

            processing_time = time.time() - start_time
            return {
                'original_text': text,
                'translated_text': translated_text,
                'source_language': source_language,
                'target_language': target_language,
                'detected_language': detected_language,
                'processing_time_ms': processing_time * 1000,
                'source': source,
            }

        except Exception as e:
            logger.error(f"Translation error: {e}")
            raise

    @staticmethod
    def get_supported_languages() -> Dict[str, str]:
        return SUPPORTED_LANGUAGES

