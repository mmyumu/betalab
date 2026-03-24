import type { SVGProps } from "react";

type ProduceBasketIllustrationProps = SVGProps<SVGSVGElement> & {
  itemCount?: number;
  testId?: string;
};

export function ProduceBasketIllustration({
  className,
  itemCount = 6,
  testId = "produce-basket-illustration",
  ...props
}: ProduceBasketIllustrationProps) {
  return (
    <svg
      className={className}
      data-item-count={itemCount}
      data-testid={testId}
      fill="none"
      viewBox="0 0 320 220"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <ellipse cx="160" cy="192" fill="#0f172a" fillOpacity="0.08" rx="96" ry="14" />

      <path
        d="M116 86C116 61 134 42 160 42C186 42 204 61 204 86"
        stroke="#94a3b8"
        strokeLinecap="round"
        strokeWidth="10"
      />

      <path
        d="M82 92H238L224 176C222 188 213 196 201 196H119C107 196 98 188 96 176L82 92Z"
        fill="url(#produce-basket-body)"
        stroke="#7c2d12"
        strokeLinejoin="round"
        strokeWidth="8"
      />

      <path d="M102 112H218" stroke="#9a3412" strokeLinecap="round" strokeWidth="8" />
      <path d="M98 136H222" stroke="#9a3412" strokeLinecap="round" strokeWidth="8" />
      <path d="M110 96L118 188" stroke="#9a3412" strokeLinecap="round" strokeWidth="7" />
      <path d="M140 96L144 192" stroke="#9a3412" strokeLinecap="round" strokeWidth="7" />
      <path d="M180 96L176 192" stroke="#9a3412" strokeLinecap="round" strokeWidth="7" />
      <path d="M210 96L202 188" stroke="#9a3412" strokeLinecap="round" strokeWidth="7" />

      <circle cx="118" cy="88" fill="#f59e0b" r="18" />
      <path d="M118 66V56" stroke="#65a30d" strokeLinecap="round" strokeWidth="5" />
      <path d="M118 58C124 58 129 55 132 50" stroke="#84cc16" strokeLinecap="round" strokeWidth="5" />

      <circle cx="152" cy="72" fill="#ef4444" r="18" />
      <circle cx="184" cy="82" fill="#ef4444" r="18" />
      <path d="M168 56C170 46 177 40 186 40" stroke="#16a34a" strokeLinecap="round" strokeWidth="5" />
      <path d="M164 58C157 52 149 50 140 52" stroke="#16a34a" strokeLinecap="round" strokeWidth="5" />

      <ellipse cx="218" cy="90" fill="#22c55e" rx="20" ry="12" transform="rotate(-18 218 90)" />
      <ellipse cx="206" cy="74" fill="#86efac" rx="9" ry="5.5" transform="rotate(-36 206 74)" />

      <defs>
        <linearGradient id="produce-basket-body" x1="160" x2="160" y1="92" y2="196">
          <stop stopColor="#fdba74" />
          <stop offset="1" stopColor="#fb923c" />
        </linearGradient>
      </defs>
    </svg>
  );
}
