export function DayScene() {
  return (
    <>
      <div className="login-sky" aria-hidden="true">
        <span className="login-sun" />
      </div>
      <svg className="login-village" viewBox="0 0 1200 220" aria-hidden="true">
        <path
          fill="#1a2a38"
          d="M0 220V148l40-18 28 18 36-44 32 28 22-16 40 32 18-70 16 54 34-28 30 44 48-86 22 50 36-22 28 40 44-56 26 36 50-72 24 48 38-20 42 52 36-64 20 36 48-28 30 40H1200V220H0z"
        />
        <path
          fill="#12202b"
          d="M0 220V176l70-12 46 12 58-36 40 24 80-8 36 20 90-48 54 36 120-20 64 28 88-40 70 32 110-16 74 24H1200V220H0z"
        />
      </svg>
    </>
  );
}
