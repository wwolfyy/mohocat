export default function MinimalAdminPage() {
  return (
    <div>
      <h1>Minimal Admin Dashboard</h1>
      <p>This page should load if basic routing works.</p>
      <ul>
        <li>Current time: {new Date().toISOString()}</li>
        <li>Page loaded successfully</li>
      </ul>
    </div>
  );
}
