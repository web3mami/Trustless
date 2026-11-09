export type Faction = "good" | "werewolf" | "solo" | "neutral";

export function FactionIcon({
  faction,
  className = "faction-icon",
}: {
  faction: Faction;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {faction === "good" ? (
        <>
          <path d="M2.2 13.8h11.6" />
          <path d="M3.2 13.8V9.6M12.8 13.8V9.6M2.6 9.9l4-2.1M13.4 9.9l-4-2.1" />
          <path d="M6.6 8V4.8h2.8V8" />
          <path d="M6.2 4.8 8 2.2l1.8 2.6" />
          <circle cx="8" cy="6.4" r="0.6" />
          <path d="M7 13.8v-2.4a1 1 0 0 1 2 0v2.4" />
          <path d="M5 11.4h0M11 11.4h0" />
        </>
      ) : faction === "werewolf" ? (
        <>
          <path d="M3 1.8 5.6 5h4.8L13 1.8l.2 5.4 1.4 1.8-3.4 1.4L8 14.2 4.8 10.4 1.4 9l1.4-1.8Z" />
          <path d="M5.2 7.6l1.6.8M10.8 7.6l-1.6.8M7.3 11.4h1.4" />
        </>
      ) : faction === "solo" ? (
        <>
          <path d="M8 1.6 9.7 3.8v5.6H6.3V3.8Z" />
          <path d="M8 4.2v3.8M4.2 9.4h7.6M8 9.4v2.8" />
          <circle cx="8" cy="13.3" r="0.9" />
        </>
      ) : (
        <>
          <circle cx="8" cy="2.6" r="0.7" />
          <path d="M8 3.3v10.2M5.2 13.8h5.6M2.8 4.8h10.4" />
          <path d="M3.6 4.8 2.2 9M3.6 4.8 5 9M12.4 4.8 11 9M12.4 4.8l1.4 4.2" />
          <path d="M1.8 9h3.6a1.8 1.8 0 0 1-3.6 0ZM10.6 9h3.6a1.8 1.8 0 0 1-3.6 0Z" />
        </>
      )}
    </svg>
  );
}
