import './LanguageSelector.css'

const LANGUAGES = {
  en: 'English',
  vi: 'Vietnamese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  pl: 'Polish',
  ru: 'Russian',
  ja: 'Japanese',
  zh: 'Chinese',
  ko: 'Korean',
  ar: 'Arabic',
  th: 'Thai',
  id: 'Indonesian',
  tr: 'Turkish',
  hu: 'Hungarian',
  cs: 'Czech',
  sv: 'Swedish',
  no: 'Norwegian',
  da: 'Danish',
  fi: 'Finnish',
  el: 'Greek',
  he: 'Hebrew',
  hi: 'Hindi',
  bn: 'Bengali',
  pa: 'Punjabi'
}

const POPULAR = ['vi', 'en', 'zh', 'ja', 'ko', 'fr', 'de', 'es']

function LanguageSelector({ value, onChange, disabled = false, includeAuto = false, compact = false }) {
  return (
    <div className={`language-selector ${compact ? 'language-selector-compact' : ''}`}>
      {!compact && (
        <label htmlFor="language-select" className="selector-label">
          Target Language
        </label>
      )}
      <select
        id="language-select"
        className="language-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {includeAuto && (
          <option value="auto">🔍 Auto Detect</option>
        )}
        <optgroup label="Popular">
          {POPULAR.map(code => (
            <option key={code} value={code}>
              {LANGUAGES[code]}
            </option>
          ))}
        </optgroup>
        <optgroup label="All Languages">
          {Object.entries(LANGUAGES)
            .filter(([code]) => !POPULAR.includes(code))
            .sort(([, a], [, b]) => a.localeCompare(b))
            .map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
        </optgroup>
      </select>
    </div>
  )
}

export default LanguageSelector
