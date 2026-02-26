import type { SearchHit } from '../../core/search/searchEngine'

interface SearchPanelProps {
  query: string
  hits: SearchHit[]
  warnings: string[]
  onChangeQuery: (value: string) => void
  onOpenFile: () => void
}

export default function SearchPanel({ query, hits, warnings, onChangeQuery, onOpenFile }: SearchPanelProps) {
  return (
    <aside className="ur-sidebar">
      <div className="ur-card">
        <h3>Document</h3>
        <button className="btn btn-primary btn-sm" onClick={onOpenFile}>
          Open File
        </button>
      </div>

      <div className="ur-card">
        <h3>Search</h3>
        <input value={query} onChange={(event) => onChangeQuery(event.target.value)} placeholder="Search in document..." />
        <p className="ur-muted">{hits.length} results</p>
        <div className="ur-search-results">
          {hits.slice(0, 30).map((hit) => (
            <article key={hit.id} className="ur-search-item">
              <strong>Page {hit.pageIndex + 1}</strong>
              <p>{hit.excerpt}</p>
            </article>
          ))}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="ur-card ur-card-warning">
          <h3>Parser Warnings</h3>
          <ul>
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}

