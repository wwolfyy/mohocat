export default function AdminStandalone() {
  return (
    <html lang="en" data-oid="8etina6">
      <head data-oid="f5d.sn7">
        <title data-oid="1n9_ao2">Mountain Cats Admin</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
          data-oid="7minsb2"
        />

        <style data-oid="1:lam.f">{`
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
      <body data-oid="tmsajw4">
        <div className="header" data-oid="c7-d37u">
          <div className="nav" data-oid="y6t3pw7">
            <h1 data-oid="tqld_1u">🐱 Mountain Cats Admin</h1>
            <a href="/" data-oid="29-sgu2">
              ← Back to Site
            </a>
          </div>
        </div>

        <div className="container" data-oid="fs0z3h7">
          <div className="card" data-oid="adeo_jk">
            <h1 className="title" data-oid="s8xz_wy">
              Admin Dashboard
            </h1>
            <p className="subtitle" data-oid="nnmn6di">
              Manage your mountain cats media and tagging system
            </p>

            <div className="actions" data-oid="o.-nk:s">
              <a
                href="/admin/tag-images"
                className="action-card"
                data-oid="85.ve9n"
              >
                <div
                  style={{ fontSize: "2rem", marginBottom: "0.5rem" }}
                  data-oid="pux11:q"
                >
                  🖼️
                </div>
                <h3 data-oid="6z7932_">Tag Images</h3>
                <p data-oid="o1d:fuu">Tag untagged images with cat names</p>
              </a>

              <a
                href="/admin/tag-videos"
                className="action-card"
                data-oid="kr2574w"
              >
                <div
                  style={{ fontSize: "2rem", marginBottom: "0.5rem" }}
                  data-oid="d.gwk-_"
                >
                  🎥
                </div>
                <h3 data-oid="dic352f">Tag Videos</h3>
                <p data-oid="vqbfpxj">Tag untagged videos with cat names</p>
              </a>

              <a href="/admin/cats" className="action-card" data-oid="ns7r98z">
                <div
                  style={{ fontSize: "2rem", marginBottom: "0.5rem" }}
                  data-oid="onl561c"
                >
                  🐱
                </div>
                <h3 data-oid="v6pk41n">Manage Cats</h3>
                <p data-oid="5s9wgu8">Add, edit, or remove cat profiles</p>
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
