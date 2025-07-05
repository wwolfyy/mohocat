export default function SimpleTestPage() {
  return (
    <div
      style={{ padding: "2rem", fontFamily: "sans-serif" }}
      data-oid="bgqfmiv"
    >
      <h1 data-oid="hzx6y:x">Simple Test Page</h1>
      <p data-oid="eb.ffvv">
        This is a basic test page without any React Admin dependencies.
      </p>
      <p data-oid="zvnculw">Current time: {new Date().toLocaleString()}</p>
      <button
        onClick={() => alert("Button clicked!")}
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "0.25rem",
          cursor: "pointer",
        }}
        data-oid="5_wg-jp"
      >
        Test Button
      </button>
    </div>
  );
}
