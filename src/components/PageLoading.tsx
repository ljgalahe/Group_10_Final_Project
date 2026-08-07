import styles from "./PageLoading.module.css";

export function PageLoading({ title }: { title?: string }) {
  const ariaLabel = title ? `Opening ${title}` : "Loading";

  return (
    <div
      className={styles.screen}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <p className={styles.label}>
        {title ? (
          <>
            Opening <span className={styles.title}>{title}</span>…
          </>
        ) : (
          "Loading…"
        )}
      </p>

      <div className={styles.lawn} aria-hidden>
        <div className={styles.lawnGrass} />
      </div>

      <div className={styles.crewLane} aria-hidden>
        <div className={styles.crew}>
          <div className={styles.crewArt}>
            <svg viewBox="0 -24 300 204" xmlns="http://www.w3.org/2000/svg">
              <g>
                <path
                  d="M118 52 L118 92 L168 122"
                  stroke="#3d3934"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <path
                  d="M134 48 L134 90 L168 118"
                  stroke="#3d3934"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <path
                  d="M118 52 H134"
                  stroke="#3d3934"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M162 108 C162 96 174 88 194 88 H238 C254 88 264 98 264 112 V126 C264 136 254 142 240 142 H180 C166 142 162 134 162 124 Z"
                  fill="#7a3e3e"
                  stroke="#2c3328"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <rect
                  x="198"
                  y="68"
                  width="40"
                  height="26"
                  rx="3"
                  fill="#3d3934"
                  stroke="#2c3328"
                  strokeWidth="1.8"
                />
                <rect
                  x="204"
                  y="56"
                  width="28"
                  height="14"
                  rx="2"
                  fill="#6b4545"
                  stroke="#2c3328"
                  strokeWidth="1.8"
                />
                <rect x="212" y="46" width="12" height="12" rx="2" fill="#2a2724" />
                <path
                  d="M208 74 H228 M208 80 H228 M208 86 H224"
                  stroke="#57534e"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
                <g className={styles.wheel}>
                  <circle cx="188" cy="152" r="16" fill="#1a1f18" />
                  <circle
                    cx="188"
                    cy="152"
                    r="11"
                    fill="#faf8f4"
                    stroke="#2c3328"
                    strokeWidth="1.8"
                  />
                  <circle cx="188" cy="152" r="4.5" fill="#3d3934" />
                  <path
                    d="M188 141 V152 H199"
                    stroke="#a89f91"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    fill="none"
                  />
                </g>
                <g className={`${styles.wheel} ${styles.wheelRear}`}>
                  <circle cx="242" cy="148" r="20" fill="#1a1f18" />
                  <circle
                    cx="242"
                    cy="148"
                    r="14"
                    fill="#faf8f4"
                    stroke="#2c3328"
                    strokeWidth="1.8"
                  />
                  <circle cx="242" cy="148" r="5.5" fill="#3d3934" />
                  <path
                    d="M242 134 V148 H256"
                    stroke="#a89f91"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    fill="none"
                  />
                </g>
              </g>

              <g transform="translate(78 168) scale(1.32) translate(-78 -168)">
                <g transform="translate(72 112)">
                  <g className={styles.legBack}>
                    <circle cx="0" cy="0" r="4" fill="#384232" opacity="0.02" />
                    <path
                      d="M0 0 Q-3 14 -2 24 Q-1 34 1 44"
                      stroke="#384232"
                      strokeWidth="14"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M-6 40 L-6 46 C-8 46 -12 47 -13 49.5 C-14 52 -11 54 -6 54 L10 54 C14 54 16 52 15.5 49.5 C15 47 12 45.5 9 45.5 L4 45.5 L4 40 Z"
                      fill="#2a2724"
                      stroke="#3d3934"
                      strokeWidth="1.1"
                    />
                    <path
                      d="M-5 46 H8"
                      stroke="#524c45"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                  </g>
                </g>

                <g transform="translate(90 112)">
                  <g className={styles.legFront}>
                    <circle cx="0" cy="0" r="4" fill="#46523c" opacity="0.02" />
                    <path
                      d="M0 0 Q3 14 4 24 Q5 34 6 44"
                      stroke="#46523c"
                      strokeWidth="14"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M-2 40 L-2 45.5 C-4 45.5 -5 47 -5 49.5 C-5 52 -2 54 3 54 L18 54 C22 54 24 52 23 49 C22 46.5 19 45 15 45 L6 45 L6 40 Z"
                      fill="#2a2724"
                      stroke="#3d3934"
                      strokeWidth="1.1"
                    />
                    <path
                      d="M-1 46 H12"
                      stroke="#524c45"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                  </g>
                </g>

                <g className={styles.torso}>
                  <path
                    d="M64 70 L92 82 L118 72"
                    stroke="#e6ebe0"
                    strokeWidth="9"
                    strokeLinecap="round"
                  />
                  <g transform="translate(120 78) scale(0.68)">
                    <path
                      d="M-8 -3 C-9 -8 -4 -11 1 -9 C6 -7 8 -2 6 3 C4 7 -1 8 -5 6 C-9 4 -9 1 -8 -3 Z"
                      fill="#78716c"
                      stroke="#2c3328"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M-3 1 L-1 5 M1 0 L3 4 M4 -1 L6 3"
                      stroke="#57534e"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M-6 0 C-9 -1 -10 2 -8 3.5"
                      stroke="#2c3328"
                      strokeWidth="1.1"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </g>

                  <ellipse
                    cx="78"
                    cy="78"
                    rx="20"
                    ry="28"
                    fill="#faf8f4"
                    stroke="#2c3328"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M62 72 H94 L96 118 H60 Z"
                    fill="#384232"
                    stroke="#2c3328"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M68 72 L72 52 M88 72 L84 52"
                    stroke="#46523c"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <circle cx="72" cy="76" r="2.2" fill="#faf8f4" />
                  <circle cx="84" cy="76" r="2.2" fill="#faf8f4" />
                  <rect
                    x="70"
                    y="92"
                    width="16"
                    height="12"
                    rx="2"
                    fill="none"
                    stroke="#58664a"
                    strokeWidth="1.4"
                  />

                  <path
                    d="M90 68 L108 74 L130 68"
                    stroke="#faf8f4"
                    strokeWidth="9"
                    strokeLinecap="round"
                  />
                  <g transform="translate(132 74) scale(0.68)">
                    <path
                      d="M-8 -3 C-9 -8 -4 -11 1 -9 C6 -7 8 -2 6 3 C4 7 -1 8 -5 6 C-9 4 -9 1 -8 -3 Z"
                      fill="#6b6359"
                      stroke="#2c3328"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M-3 1 L-1 5 M1 0 L3 4 M4 -1 L6 3"
                      stroke="#57534e"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M-6 0 C-9 -1 -10 2 -8 3.5"
                      stroke="#2c3328"
                      strokeWidth="1.1"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </g>
                </g>

                <g className={styles.head}>
                  <path
                    d="M74 54 L78 62 L86 62 L88 54"
                    fill="#e2c4a8"
                    stroke="#2c3328"
                    strokeWidth="1.4"
                  />
                  <ellipse
                    cx="86"
                    cy="38"
                    rx="16"
                    ry="17"
                    fill="#e8c9b0"
                    stroke="#2c3328"
                    strokeWidth="1.9"
                  />
                  <ellipse
                    cx="72"
                    cy="41"
                    rx="3"
                    ry="4"
                    fill="#e2c4a8"
                    stroke="#2c3328"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M72 39 C70.8 40 70.5 42 71.2 44"
                    stroke="#c4a484"
                    strokeWidth="1"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M72 30 C74 20 82 18 90 20"
                    stroke="#3d3934"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.55"
                  />
                  <ellipse
                    cx="93"
                    cy="37"
                    rx="3.2"
                    ry="3.6"
                    fill="#faf8f4"
                    stroke="#2c3328"
                    strokeWidth="1.1"
                  />
                  <circle cx="94.2" cy="37.2" r="1.6" fill="#384232" />
                  <circle cx="94.7" cy="36.6" r="0.55" fill="#faf8f4" />
                  <path
                    d="M89 32 Q93 30 97 32"
                    stroke="#3d3934"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M101.5 37 L104.5 39.5 C105.2 40.5 104.8 42.2 103 42.8 C101.6 43.3 100.8 42.5 100.6 41.4 C100.3 39.6 100.8 37.8 101.5 37 Z"
                    fill="#d4b496"
                    stroke="#b8956e"
                    strokeWidth="1"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M90 48 Q96 52 101 47"
                    stroke="#2c3328"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M69 33 C71 12 99 10 105 31 L106 34 H68 Z"
                    fill="#384232"
                    stroke="#2c3328"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M100 30 C107 30.5 114 32 118 35.5 Q112 38.5 105 37.5 Q101 36.5 100 33.5 Z"
                    fill="#e6ebe0"
                    stroke="#2c3328"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="88"
                    cy="24"
                    r="5.5"
                    fill="#faf8f4"
                    stroke="#2c3328"
                    strokeWidth="1"
                  />
                  <text
                    x="88"
                    y="26.6"
                    textAnchor="middle"
                    fontFamily="Arial Black, Segoe UI, sans-serif"
                    fontSize="6"
                    fontWeight="800"
                    fill="#384232"
                  >
                    GS
                  </text>
                </g>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
