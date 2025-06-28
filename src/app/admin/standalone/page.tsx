export default function AdminStandalone() {
  return (
    <html lang="en">
      <head>
        <title>Mountain Cats Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          body {
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
          }
          .header {
            background: white;
            padding: 1rem 2rem;
            border-bottom: 1px solid #e5e7eb;
            margin-bottom: 2rem;
          }
          .nav {
            display: flex;
            gap: 1rem;
            align-items: center;
          }
          .nav a {
            padding: 0.5rem 1rem;
            text-decoration: none;
            color: #374151;
            border-radius: 0.375rem;
          }
          .nav a:hover {
            background-color: #f3f4f6;
          }
          .card {
            background: white;
            padding: 2rem;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          .title {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 1rem;
            color: #111827;
          }
          .subtitle {
            color: #6b7280;
            margin-bottom: 2rem;
          }
          .actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
          }
          .action-card {
            padding: 1.5rem;
            border: 1px solid #e5e7eb;
            border-radius: 0.5rem;
            text-decoration: none;
            color: inherit;
            transition: all 0.2s;
          }
          .action-card:hover {
            border-color: #d1d5db;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
        `}</style>
      </head>
      <body>
        <div className="header">
          <div className="nav">
            <h1>🐱 Mountain Cats Admin</h1>
            <a href="/">← Back to Site</a>
          </div>
        </div>

        <div className="container">
          <div className="card">
            <h1 className="title">Admin Dashboard</h1>
            <p className="subtitle">Manage your mountain cats media and tagging system</p>

            <div className="actions">
              <a href="/admin/tag-images-new" className="action-card">
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🖼️</div>
                <h3>Tag Images</h3>
                <p>Tag untagged images with cat names</p>
              </a>

              <a href="/admin/tag-videos-new" className="action-card">
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎥</div>
                <h3>Tag Videos</h3>
                <p>Tag untagged videos with cat names</p>
              </a>

              <a href="/admin/cats" className="action-card">
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🐱</div>
                <h3>Manage Cats</h3>
                <p>Add, edit, or remove cat profiles</p>
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
