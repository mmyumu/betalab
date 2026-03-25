import type { SVGProps } from "react";

type AppleIllustrationProps = SVGProps<SVGSVGElement> & {
  testId?: string;
};

type AppleClusterProps = {
  shadowOpacity?: number;
};

export function AppleLotGlyph({ shadowOpacity = 0.08 }: AppleClusterProps) {
  return (
    <>
      <ellipse cx="49" cy="87" fill="#0f172a" fillOpacity={shadowOpacity} rx="25" ry="6.5" />

      <g transform="translate(-12 8)">
        <path
          d="M49 20C54 8 66 7 73 13"
          stroke="#14532d"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M49 18C43 10 34 8 26 12"
          stroke="#16a34a"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M33 32C22 32 14 42 14 54C14 69 26 80 40 80C46 80 50 77 54 77C58 77 62 80 68 80C82 80 90 68 90 54C90 42 82 32 71 32C62 32 58 37 52 37C46 37 42 32 33 32Z"
          fill="url(#apple-lot-body-left)"
          stroke="#7f1d1d"
          strokeLinejoin="round"
          strokeWidth="5"
        />
        <path
          d="M48 27C51 23 56 20 61 19"
          stroke="#65a30d"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <ellipse cx="37" cy="47" fill="#FCA5A5" opacity="0.5" rx="9" ry="6" />
        <path
          d="M58 13C63 8 72 7 78 11C74 18 66 22 58 21V13Z"
          fill="#86efac"
          stroke="#15803d"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </g>

      <g transform="translate(8 0) scale(0.94)">
        <path
          d="M49 20C54 8 66 7 73 13"
          stroke="#14532d"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M49 18C43 10 34 8 26 12"
          stroke="#16a34a"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M33 32C22 32 14 42 14 54C14 69 26 80 40 80C46 80 50 77 54 77C58 77 62 80 68 80C82 80 90 68 90 54C90 42 82 32 71 32C62 32 58 37 52 37C46 37 42 32 33 32Z"
          fill="url(#apple-lot-body-right)"
          stroke="#7f1d1d"
          strokeLinejoin="round"
          strokeWidth="5"
        />
        <path
          d="M48 27C51 23 56 20 61 19"
          stroke="#65a30d"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <ellipse cx="37" cy="47" fill="#FCA5A5" opacity="0.5" rx="9" ry="6" />
        <path
          d="M58 13C63 8 72 7 78 11C74 18 66 22 58 21V13Z"
          fill="#86efac"
          stroke="#15803d"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </g>

      <g transform="translate(4 18) scale(0.84)">
        <path
          d="M49 20C54 8 66 7 73 13"
          stroke="#14532d"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M49 18C43 10 34 8 26 12"
          stroke="#16a34a"
          strokeLinecap="round"
          strokeWidth="5"
        />
        <path
          d="M33 32C22 32 14 42 14 54C14 69 26 80 40 80C46 80 50 77 54 77C58 77 62 80 68 80C82 80 90 68 90 54C90 42 82 32 71 32C62 32 58 37 52 37C46 37 42 32 33 32Z"
          fill="url(#apple-lot-body-front)"
          stroke="#7f1d1d"
          strokeLinejoin="round"
          strokeWidth="5"
        />
        <path
          d="M48 27C51 23 56 20 61 19"
          stroke="#65a30d"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <ellipse cx="37" cy="47" fill="#FCA5A5" opacity="0.5" rx="9" ry="6" />
        <path
          d="M58 13C63 8 72 7 78 11C74 18 66 22 58 21V13Z"
          fill="#86efac"
          stroke="#15803d"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </g>
    </>
  );
}

export function AppleIllustration({
  className,
  testId = "apple-illustration",
  ...props
}: AppleIllustrationProps) {
  return (
    <svg
      aria-label="Apple lot illustration"
      className={className}
      data-apple-count="3"
      data-testid={testId}
      fill="none"
      viewBox="0 0 96 96"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <AppleLotGlyph />
      <defs>
        <linearGradient id="apple-lot-body-left" x1="52" x2="52" y1="32" y2="80">
          <stop stopColor="#fb7185" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
        <linearGradient id="apple-lot-body-right" x1="52" x2="52" y1="32" y2="80">
          <stop stopColor="#f87171" />
          <stop offset="1" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="apple-lot-body-front" x1="52" x2="52" y1="32" y2="80">
          <stop stopColor="#fb7185" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
      </defs>
    </svg>
  );
}
