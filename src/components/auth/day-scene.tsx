export function DayScene() {
  return (
    <>
      <div className="login-sky" aria-hidden="true">
        <span className="login-sun" />
        <svg className="login-network" viewBox="0 0 760 300">
          <path d="M18 128c118-74 216-53 310 13 95 67 193 74 414 7" />
          <path d="M96 192c136-39 240-12 342 44 74 41 164 40 264 14" />
          <circle cx="20" cy="127" r="2.5" />
          <circle cx="172" cy="99" r="2" />
          <circle cx="329" cy="141" r="2.8" />
          <circle cx="502" cy="226" r="2.3" />
          <circle cx="701" cy="250" r="2.6" />
        </svg>
      </div>
      <svg className="login-village" viewBox="0 0 1200 300" aria-hidden="true">
        <path
          className="login-hills-far"
          d="M0 198C96 144 181 158 270 188c91 31 165-52 257-49 84 2 135 62 222 51 97-13 140-65 235-50 82 13 139 48 216 74v86H0Z"
        />
        <path
          className="login-atmospheric-haze"
          d="M0 193c124-17 202 9 302 5 127-5 190-37 308-22 112 14 171 26 284 6 105-19 190-3 306 29v36H0Z"
        />
        <path
          className="login-hills-mid"
          d="M0 239c91-42 163-29 247 2 98 36 175-18 260-36 99-21 151 45 249 42 85-3 134-52 223-47 87 5 146 39 221 69v31H0Z"
        />
        <g className="login-village-back">
          <path d="M18 255v-30h45v30Zm-6-30 29-18 29 18ZM78 256v-41h38v41Zm-6-41 25-20 25 20ZM127 256v-27h54v27Zm-5-27 32-15 33 15ZM291 254v-34h43v34Zm-7-34 28-18 29 18ZM419 258v-40h51v40Zm-7-40 32-21 33 21ZM481 258v-29h42v29Zm-6-29 27-17 27 17ZM598 256v-44h45v44Zm-7-44 29-24 30 24ZM655 257v-31h57v31Zm-7-31 35-18 36 18ZM722 256v-38h42v38Zm-6-38 27-22 28 22ZM1078 255v-39h43v39Zm-6-39 27-22 29 22ZM1132 257v-29h52v29Zm-6-29 32-17 33 17Z" />
        </g>
        <g className="login-distant-village">
          <path d="M48 247v-46l40-29 43 29v46Zm11-46h61l-32-22ZM118 248v-58h47v58Zm-8-58 31-26 32 26Zm37-25v-18h9v26ZM171 248v-36h58v36Zm-8-36 37-20 38 20ZM221 248v-48h68v48Zm-9-48 43-24 44 24Zm49-22v-19h10v24ZM302 249v-42h48v42Zm-7-42 31-23 31 23ZM404 249v-51h58v51Zm-8-51 36-27 38 27Zm43-25v-18h9v24ZM468 249v-39h65v39Zm-8-39 40-22 42 22ZM540 250v-64h52v64Zm-9-64 35-31 35 31Zm20-31 15-18 15 18Z" />
          <path d="M621 249v-43h52v43Zm-8-43 34-24 35 24ZM679 249v-55h62v55Zm-9-55 40-28 40 28Zm45-26v-18h10v24ZM747 249v-38h48v38Zm-7-38 31-21 31 21ZM842 249v-53h55v53Zm-9-53 37-30 37 30Zm47-28v-20h9v27ZM902 249v-70h45v70Zm-8-70 30-32 31 32Zm16-31 14-20 14 20ZM953 249v-43h69v43Zm-10-43 45-25 46 25Zm51-23v-19h10v24ZM1027 249v-57h54v57Zm-9-57 35-29 36 29Zm41-27v-17h10v23ZM1088 249v-40h65v40Zm-9-40 42-23 43 23Z" />
        </g>
        <g className="login-validator-structures">
          <path className="login-beacon-building" d="M348 247v-67l28-25 29 25v67Zm8-67h41l-21-18ZM800 248v-75l30-29 31 29v75Zm8-75h45l-23-21Z" />
          <path className="login-beacon-spire" d="M376 155v-31m-10 10 10-12 10 12M830 144v-35m-11 11 11-14 11 14" />
          <circle className="login-beacon-glow" cx="376" cy="119" r="5" />
          <circle className="login-beacon-glow" cx="830" cy="103" r="5" />
          <path className="login-validator-link" d="M376 119c126-43 324-51 454-16M830 103c108 10 195 40 278 88" />
        </g>
        <g className="login-forest">
          <path d="M0 278l20-47 13 27 23-63 20 56 20-39 18 49 25-75 26 71 17-38 20 51 23-82 29 79 17-38 23 49Zm250 0 18-48 14 29 24-66 22 61 18-38 20 53 23-73 25 71 17-36 20 47Zm401 0 19-45 13 27 23-67 23 63 18-41 21 55 24-77 27 74 18-39 21 51Zm221 0 22-57 15 34 26-76 27 72 21-46 22 61 28-87 30 84 19-47 24 62 25-75 27 70 18-40 24 61H872Z" />
        </g>
        <path
          className="login-hills-front"
          d="M0 270c94-20 158-2 245 17 94 21 166-24 260-19 91 5 144 29 232 21 94-8 147-42 241-33 91 8 148 30 222 44H0Z"
        />
        <g className="login-window-grid">
          <circle cx="87" cy="211" r="2.5" />
          <circle cx="141" cy="207" r="2.5" />
          <circle cx="199" cy="224" r="2.5" />
          <circle cx="254" cy="213" r="2.5" />
          <circle cx="326" cy="221" r="2.5" />
          <circle cx="432" cy="215" r="2.5" />
          <circle cx="565" cy="210" r="2.5" />
          <circle cx="648" cy="219" r="2.5" />
          <circle cx="709" cy="211" r="2.5" />
          <circle cx="870" cy="214" r="2.5" />
          <circle cx="924" cy="202" r="2.5" />
          <circle cx="988" cy="218" r="2.5" />
          <circle cx="1053" cy="210" r="2.5" />
          <circle cx="1121" cy="221" r="2.5" />
        </g>
      </svg>
    </>
  );
}
