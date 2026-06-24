// src/components/Leaderboard.jsx

export default function Leaderboard({ rows, loading }) {
  return (
    <>
      <h3 style={{ fontSize: 15, margin: '4px 0 2px' }}>Top contributors</h3>
      <p className="hint" style={{ marginBottom: 8 }}>Ranked by resources shared, then by helpfulness votes received.</p>

      {loading ? (
        <div className="loading"><span className="skel" />Loading leaderboard…</div>
      ) : (
        <div className="lb-table">
          <div className="lb-row head">
            <span style={{ width: 34 }}>#</span>
            <span className="lb-name">Name</span>
            <span className="lb-stat">Uploads</span>
            <span className="lb-stat">Helpful votes</span>
          </div>
          {rows.length ? rows.map((r, i) => (
            <div className="lb-row" key={r.name}>
              <span className={`lb-rank${i === 0 ? ' r1' : i === 1 ? ' r2' : i === 2 ? ' r3' : ''}`}>{i + 1}</span>
              <span className="lb-name">{r.name}</span>
              <span className="lb-stat"><b>{r.uploads}</b></span>
              <span className="lb-stat"><b>{r.upvotes}</b></span>
            </div>
          )) : (
            <div className="lb-row"><span className="hint">No contributors yet — add the first resource to top the board.</span></div>
          )}
        </div>
      )}
    </>
  );
}
