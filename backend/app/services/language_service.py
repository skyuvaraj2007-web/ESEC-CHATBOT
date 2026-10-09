import re
from typing import Dict, Any, Optional

class LanguageService:
    """
    Intelligent language, script, code-switching, and conversational style detection layer
    with special support for Tanglish (Romanized Tamil) and Indian languages.
    """

    # Unambiguous Tanglish indicators (vocabulary, roots, and markers)
    TANGLISH_KEYWORDS = {
        # Question words & Pronouns
        "enna", "edhu", "yaaru", "enga", "epdi", "eppadi", "yen", "edhukku", "yeppo",
        "indha", "andha", "idhu", "adhu", "edhu", "adha", "idha", "adhula", "idhula",
        "enakku", "unakku", "ungalukku", "namakku", "avan", "aval", "avanga", "ivanga",
        "idhellam", "adhellam", "adhuku", "idhuku",
        
        # Verbs & Conjugations
        "irukku", "irukkura", "irukkaru", "irundhadhu", "irundha", "irukkum", "irukadhu",
        "sollu", "sollunga", "sonna", "pannu", "pannunga", "pannidhu", "pannirukku",
        "paaru", "paakalam", "paathu", "theriyudhu", "puriyudhu", "kaatu", "kaatunga",
        "venum", "vendam", "mudiyum", "mudiyadhu", "irukka", "illai", "illa", "illaye",
        
        # Spatial, Adjectives & Prepositions
        "mela", "keela", "nadula", "pakkathula", "veliya",
        "ulla", "inga", "anga", "romba", "konjam", "chinna", "periya", "nalla",
        "rendu", "moonu", "naalu", "oru", "onnume", "ellam", "ellarum", "vera",
        
        # Discourse markers & Conversational Particles
        "dhaan", "kooda", "mattum", "aana", "aanalum", "aprom", "appo", "nu"
    }

    # Tanglish Phrases
    TANGLISH_PHRASES = [
        "detail ah", "simple ah", "clear ah", "correct ah", "super ah", "fast ah",
        "enna color", "enna text", "enna object", "enna objects", "compare pannu",
        "left side la", "right side la", "center la", "bottom la", "top la",
        "image la", "photo la", "background la", "foreground la", "nu sollu", "nu ezhudhi"
    ]

    # Script Unicode Ranges
    TAMIL_REGEX = re.compile(r'[\u0B80-\u0BFF]')
    DEVANAGARI_REGEX = re.compile(r'[\u0900-\u097F]')
    MALAYALAM_REGEX = re.compile(r'[\u0D00-\u0D7F]')
    TELUGU_REGEX = re.compile(r'[\u0C00-\u0C7F]')
    KANNADA_REGEX = re.compile(r'[\u0C80-\u0CFF]')
    BENGALI_REGEX = re.compile(r'[\u0980-\u09FF]')
    LATIN_REGEX = re.compile(r'[a-zA-Z]')

    # Hindi conversational Romanized indicators
    HINDI_LATIN_KEYWORDS = {
        "kya", "hai", "hain", "yeh", "woh", "isme", "usme", "batao", "dikhao",
        "kaun", "kaha", "kaise", "kyun", "thoda", "kuch", "laal", "peela", "hara",
        "neela", "safed", "kala", "bada", "chota", "dono", "ek", "do", "teen"
    }

    # Malayalam conversational Romanized indicators
    MALAYALAM_LATIN_KEYWORDS = {
        "entha", "ullathu", "undu", "ithu", "athu", "ivide", "avide", "parayu",
        "kanikku", "chuvanna", "pacha", "manja", "neela", "vellaya", "karuppa",
        "cheriya", "valiya", "randu", "onnu", "ee"
    }

    # Common English short follow-up tokens that should inherit conversational language context
    SHORT_FOLLOWUP_TOKENS = {
        "color", "size", "shape", "position", "location", "why", "explain", "compare",
        "detail", "next", "which", "how", "what", "where", "who", "more"
    }

    @classmethod
    def detect_language_and_style(
        cls,
        text: str,
        user_preference: Optional[str] = None,
        conversation_history: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Detects primary language, writing script, style, and determines the exact response language & guidelines.
        Supports language inheritance from conversation history for ultra-short follow-up questions.
        """
        text_clean = text.strip()
        lower_text = text_clean.lower()
        words = re.findall(r'[a-zA-Z0-9\u0b80-\u0d7f]+', lower_text)
        
        # 1. Check Unicode Scripts
        tamil_chars = len(cls.TAMIL_REGEX.findall(text_clean))
        deva_chars = len(cls.DEVANAGARI_REGEX.findall(text_clean))
        malayalam_chars = len(cls.MALAYALAM_REGEX.findall(text_clean))
        telugu_chars = len(cls.TELUGU_REGEX.findall(text_clean))
        kannada_chars = len(cls.KANNADA_REGEX.findall(text_clean))
        bengali_chars = len(cls.BENGALI_REGEX.findall(text_clean))
        latin_chars = len(cls.LATIN_REGEX.findall(text_clean))
        
        # If user explicitly specified non-auto preference, respect that
        if user_preference and user_preference != "auto":
            pref = user_preference.lower().strip()
            if pref in ("ta-latn", "tanglish"):
                return {
                    "input_language": "tanglish",
                    "response_language": "tanglish",
                    "script": "latin",
                    "style": "conversational",
                    "prompt_directive": (
                        "CRITICAL: The user explicitly requests responses in NATURAL TANGLISH (spoken Tamil written using Roman/English characters).\n"
                        "Respond in conversational Tanglish matching the user's natural cadence (e.g., 'Indha image la oru red circle irukku'). "
                        "Do NOT translate into formal English or Tamil Unicode script."
                    )
                }
            elif pref in ("ta", "ta-in", "tamil"):
                return {
                    "input_language": "ta",
                    "response_language": "ta",
                    "script": "tamil",
                    "style": "conversational",
                    "prompt_directive": (
                        "CRITICAL: The user explicitly requests the response in TAMIL (தமிழ்).\n"
                        "பதிலை இயல்பான, தெளிவான தமிழில் வழங்கவும்.\n"
                        "Explain the uploaded image and answer the user query entirely in natural Tamil script (தமிழ்).\n"
                        "Preserve standard technical terms when appropriate and explain them in natural Tamil. Do NOT respond in English or Tanglish."
                    )
                }
            elif pref in ("hi", "hi-in", "hindi"):
                return {
                    "input_language": "hi",
                    "response_language": "hi",
                    "script": "devanagari",
                    "style": "conversational",
                    "prompt_directive": (
                        "CRITICAL: The user explicitly requests the response in HINDI (हिन्दी).\n"
                        "उत्तर स्वाभाविक और स्पष्ट हिंदी में दें।\n"
                        "Explain the uploaded image and answer the user query entirely in natural Hindi script (हिन्दी).\n"
                        "Preserve standard technical terms when appropriate and explain them in natural Hindi. Do NOT respond in English."
                    )
                }
            elif pref in ("ml", "ml-in", "malayalam"):
                return {
                    "input_language": "ml",
                    "response_language": "ml",
                    "script": "malayalam",
                    "style": "conversational",
                    "prompt_directive": (
                        "CRITICAL: The user explicitly requests the response in MALAYALAM (മലയാളം).\n"
                        "സ്വാഭാവികവും വ്യക്തവുമായ മലയാളത്തിൽ മറുപടി നൽകുക.\n"
                        "Explain the uploaded image and answer the user query entirely in natural Malayalam script (മലയാളം).\n"
                        "Preserve standard technical terms when appropriate and explain them in natural Malayalam. Do NOT respond in English."
                    )
                }
            elif pref in ("en", "en-in", "en-us", "english"):
                return {
                    "input_language": "en",
                    "response_language": "en",
                    "script": "latin",
                    "style": "conversational",
                    "prompt_directive": "CRITICAL: The user requested English. Respond entirely in natural, fluent English."
                }

        # 2. Check Pure Indic Scripts
        if tamil_chars > 2 and tamil_chars >= latin_chars:
            is_mixed = latin_chars > 3
            return {
                "input_language": "ta" if not is_mixed else "mixed",
                "response_language": "ta",
                "script": "tamil",
                "style": "conversational",
                "prompt_directive": (
                    "CRITICAL: The user's query is in TAMIL SCRIPT (தமிழ்).\n"
                    "பதிலை இயல்பான, தெளிவான தமிழில் வழங்கவும்.\n"
                    "YOU MUST RESPOND ENTIRELY IN NATURAL TAMIL SCRIPT (தமிழ்), explaining the image in Tamil.\n"
                    "Preserve standard technical terms when appropriate and explain them in natural Tamil."
                )
            }
            
        if deva_chars > 2 and deva_chars >= latin_chars:
            return {
                "input_language": "hi",
                "response_language": "hi",
                "script": "devanagari",
                "style": "conversational",
                "prompt_directive": (
                    "CRITICAL: The user's query is in HINDI (हिन्दी).\n"
                    "उत्तर स्वाभाविक और स्पष्ट हिंदी में दें।\n"
                    "YOU MUST RESPOND ENTIRELY IN NATURAL HINDI SCRIPT (हिन्दी), explaining the image in Hindi.\n"
                    "Preserve standard technical terms when appropriate and explain them in natural Hindi."
                )
            }
            
        if malayalam_chars > 2:
            return {
                "input_language": "ml",
                "response_language": "ml",
                "script": "malayalam",
                "style": "conversational",
                "prompt_directive": (
                    "CRITICAL: The user's query is in MALAYALAM (മലയാളം).\n"
                    "സ്വാഭാവികവും വ്യക്തവുമായ മലയാളത്തിൽ മറുപടി നൽകുക.\n"
                    "YOU MUST RESPOND ENTIRELY IN NATURAL MALAYALAM SCRIPT (മലയാളം), explaining the image in Malayalam.\n"
                    "Preserve standard technical terms when appropriate and explain them in natural Malayalam."
                )
            }
            
        if telugu_chars > 2:
            return {
                "input_language": "te",
                "response_language": "te",
                "script": "telugu",
                "style": "conversational",
                "prompt_directive": "CRITICAL: The user is communicating in Telugu. YOU MUST respond in natural Telugu, regardless of prior conversation language."
            }
            
        if kannada_chars > 2:
            return {
                "input_language": "kn",
                "response_language": "kn",
                "script": "kannada",
                "style": "conversational",
                "prompt_directive": "CRITICAL: The user is communicating in Kannada. YOU MUST respond in natural Kannada, regardless of prior conversation language."
            }
            
        if bengali_chars > 2:
            return {
                "input_language": "bn",
                "response_language": "bn",
                "script": "bengali",
                "style": "conversational",
                "prompt_directive": "CRITICAL: The user is communicating in Bengali. YOU MUST respond in natural Bengali, regardless of prior conversation language."
            }

        # 3. Analyze Latin Text for Tanglish / Hindi / Malayalam / English
        tanglish_score = 0
        for w in words:
            if w in cls.TANGLISH_KEYWORDS:
                tanglish_score += 2
            elif any(w.endswith(sfx) for sfx in ("la", "oda", "ah", "ukku", "nu", "kulla", "aana")):
                # Avoid regular English words ending in 'la' (e.g. umbrella, gorilla, formula)
                if w not in ("umbrella", "formula", "gorilla", "vanilla", "dracula", "nebula"):
                    tanglish_score += 1
                
        for phrase in cls.TANGLISH_PHRASES:
            if phrase in lower_text:
                tanglish_score += 3

        # Check for Short Follow-Up Language Inheritance from conversation history
        if tanglish_score == 0 and len(words) <= 3 and conversation_history:
            # Check last 3 messages in history to see if conversation was in Tanglish or Tamil
            recent_texts = [m.get("content", "") for m in conversation_history[-3:] if isinstance(m, dict)]
            joined_hist = " ".join(recent_texts).lower()
            hist_has_tanglish = any(k in joined_hist for k in ("irukku", "indha", "adhu", "idhu", "enna", "la ", "oda "))
            if hist_has_tanglish and any(w in cls.SHORT_FOLLOWUP_TOKENS for w in words):
                tanglish_score += 3

        # Check Romanized Hindi
        hindi_score = sum(2 for w in words if w in cls.HINDI_LATIN_KEYWORDS)
        # Check Romanized Malayalam
        malayalam_score = sum(2 for w in words if w in cls.MALAYALAM_LATIN_KEYWORDS)

        # Classification decision
        if tanglish_score >= 2 or (tanglish_score > 0 and tamil_chars > 0):
            is_mixed = any(w in ("image", "photo", "object", "objects", "color", "background", "detail", "compare", "side", "text", "explain", "circle", "triangle", "rectangle") for w in words)
            return {
                "input_language": "tanglish" if not is_mixed else "mixed",
                "response_language": "tanglish",
                "script": "latin",
                "style": "conversational",
                "prompt_directive": (
                    "CRITICAL: The user is communicating in TANGLISH (Romanized conversational Tamil / Tamil-English code-switching).\n"
                    "YOU MUST RESPOND IN NATURAL TANGLISH (Romanized Tamil mixed casually with English technical words).\n"
                    "Examples of natural Tanglish responses:\n"
                    "- 'Indha image la oru red circle, green triangle, and yellow rectangle irukku.'\n"
                    "- 'Left side la irukkuradhu red circle.'\n"
                    "- 'Adhu red color.'\n"
                    "- 'Adhu left side la irukku.'\n"
                    "- 'Green triangle, red circle vida konjam perusa theriyudhu.'\n"
                    "- 'Adhuku pakkathula green triangle irukku.'\n"
                    "- 'Right side la green triangle irukku. Rendume vera vera shapes and colors.'\n"
                    "- 'Image la \"VISIONAI TEST 2026\" nu text irukku.'\n"
                    "DO NOT translate this into formal English. DO NOT convert it into Tamil Unicode script. Match their conversational Tanglish style perfectly."
                )
            }
            
        if hindi_score >= 2:
            return {
                "input_language": "hi",
                "response_language": "hi",
                "script": "latin",
                "style": "conversational",
                "prompt_directive": "CRITICAL: The user is communicating in conversational Romanized Hindi. Respond naturally in conversational Hindi."
            }
            
        if malayalam_score >= 2:
            return {
                "input_language": "ml",
                "response_language": "ml",
                "script": "latin",
                "style": "conversational",
                "prompt_directive": "CRITICAL: The user is communicating in conversational Romanized Malayalam. Respond naturally in conversational Malayalam."
            }

        # Default to English
        return {
            "input_language": "en",
            "response_language": "en",
            "script": "latin",
            "style": "conversational",
            "prompt_directive": (
                "CRITICAL: The user's latest question is in ENGLISH.\n"
                "YOU MUST RESPOND IN FLUENT ENGLISH, even if previous messages in the conversation history were in Tanglish or Tamil."
            )
        }
