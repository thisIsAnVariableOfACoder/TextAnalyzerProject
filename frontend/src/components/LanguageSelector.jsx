import './LanguageSelector.css'

function LanguageSelector({ value, onChange, disabled = false, includeAuto = false }) {
  const languages = {
    auto: 'Auto Detect',
    en: 'English',
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
    vi: 'Vietnamese',
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

  return (
    <div className="language-selector">
      <label htmlFor="language-select" className="selector-label">
        Language
      </label>
      <select
        id="language-select"
        className="language-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {includeAuto && (
          <optgroup label="Special">
            <option value="auto">Auto Detect</option>
          </optgroup>
        )}
        <optgroup label="Popular Languages">
          {['en', 'es', 'fr', 'de', 'zh', 'ja'].map(code => (
            <option key={code} value={code}>
              {languages[code]}
            </option>
          ))}
        </optgroup>
        <optgroup label="All Languages">
          {Object.entries(languages)
            .filter(([ code]) => code !== 'auto' && !['en', 'es', 'fr', 'de', 'zh', 'ja'].includes(code))
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
