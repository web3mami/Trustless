export function DayScene() {
  return (
    <>
      <div className="login-sky" aria-hidden="true">
        <span className="login-sun" />
        <svg className="login-network" viewBox="0 0 520 220">
          <path d="M16 154c62-63 121-44 180-17 67 31 112-57 184-48 46 6 79 35 124 23" />
          <path d="M71 183c57-38 114-30 166-7 69 31 114-28 174-24 30 2 51 14 76 9" />
          <circle cx="18" cy="158" r="3" />
          <circle cx="104" cy="124" r="3" />
          <circle cx="196" cy="137" r="3.5" />
          <circle cx="302" cy="119" r="3" />
          <circle cx="380" cy="89" r="3.5" />
          <circle cx="504" cy="112" r="2.5" />
        </svg>
      </div>
      <svg className="login-village" viewBox="0 0 1200 300" aria-hidden="true">
        <path
          className="login-hills-far"
          d="M0 196C96 142 181 158 270 188c91 31 165-52 257-49 84 2 135 62 222 51 97-13 140-65 235-50 82 13 139 48 216 74v86H0Z"
        />
        <path
          className="login-hills-mid"
          d="M0 235c91-42 163-29 247 2 98 36 175-18 260-36 99-21 151 45 249 42 85-3 134-52 223-47 87 5 146 39 221 69v35H0Z"
        />
        <g className="login-distant-village">
          <path d="M70 236v-43l38-28 42 28v43Zm12-43h56l-30-21Z" />
          <path d="M151 237v-58h47v58Zm-8-58 31-26 32 26Zm37-25v-18h9v26Z" />
          <path d="M205 238v-37h67v37Zm-9-37 43-22 43 22Zm48-21v-17h10v22Z" />
          <path d="M839 239v-49h53v49Zm-10-49 37-31 38 31Zm48-29v-19h9v25Z" />
          <path d="M900 239v-67h42v67Zm-7-67 28-30 28 30Zm22-31v-16h12v16Z" />
          <path d="M949 239v-40h73v40Zm-10-40 47-25 47 25Zm54-24v-18h10v23Z" />
          <path d="M1030 240v-52h49v52Zm-8-52 32-28 33 28Zm40-27v-15h9v21Z" />
        </g>
        <g className="login-validator-structures">
          <path className="login-beacon-building" d="M342 231v-58l30-27 30 27v58Zm8-58h44l-22-20ZM797 233v-66l29-31 30 31v66Zm8-66h43l-22-23Z" />
          <path className="login-beacon-spire" d="M372 146v-34m-12 10 12-13 12 13M826 136V97m-13 11 13-15 13 15" />
          <circle className="login-beacon-glow" cx="372" cy="106" r="6" />
          <circle className="login-beacon-glow" cx="826" cy="90" r="6" />
          <path className="login-validator-link" d="M372 106c135-48 312-54 454-16" />
        </g>
        <g className="login-forest">
          <path d="M17 270l24-55 14 31 24-67 23 61 24-43 20 54 27-83 29 78 20-44 23 57 26-92 33 89 20-42 24 61H17ZM708 278l25-63 17 37 28-82 29 78 24-50 22 65 30-94 31 91 20-55 26 68 28-81 29 74 22-44 27 66H708Z" />
        </g>
        <path
          className="login-hills-front"
          d="M0 270c94-20 158-2 245 17 94 21 166-24 260-19 91 5 144 29 232 21 94-8 147-42 241-33 91 8 148 30 222 44H0Z"
        />
        <g className="login-window-grid">
          <circle cx="111" cy="202" r="3" />
          <circle cx="183" cy="197" r="3" />
          <circle cx="255" cy="211" r="3" />
          <circle cx="883" cy="207" r="3" />
          <circle cx="953" cy="197" r="3" />
          <circle cx="1028" cy="210" r="3" />
        </g>
      </svg>
    </>
  );
}
