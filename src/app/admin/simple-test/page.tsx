export default function SimpleTestPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Simple Test Page</h1>
      <p>This is a basic test page without any React Admin dependencies.</p>
      <p>Current time: {new Date().toLocaleString()}</p>
      <button
        onClick={() => alert('Button clicked!')}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: 'pointer'
        }}
      >
        Test Button
      </button>
    </div>
  );
}
