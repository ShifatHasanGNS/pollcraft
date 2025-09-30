const emeraldGradient =
  "bg-[linear-gradient(135deg,#10b981,#047857)] hover:bg-[linear-gradient(135deg,#0ea271,#03624a)]";

const buttonFocus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";

export const buttonPrimary =
  `inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold tracking-wide text-emerald-50 shadow-sm shadow-[rgba(4,120,87,0.35)] transition ${emeraldGradient} ${buttonFocus} disabled:cursor-not-allowed disabled:opacity-60`;

export const buttonPrimaryTall =
  `inline-flex h-12 items-center justify-center rounded-full px-8 text-lg font-semibold tracking-wide text-emerald-50 shadow shadow-[rgba(6,95,70,0.4)] transition ${emeraldGradient} ${buttonFocus} disabled:cursor-not-allowed disabled:opacity-60`;

export const buttonSecondary =
  "inline-flex h-11 items-center justify-center rounded-full border border-emerald-200/20 bg-emerald-500/10 px-6 text-sm font-semibold text-emerald-50 shadow-sm shadow-[rgba(4,120,87,0.25)] transition hover:border-emerald-200/35 hover:bg-emerald-500/18 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300/80 disabled:cursor-not-allowed disabled:opacity-60";

export const card =
  "rounded-2xl border border-white/12 bg-surface/85 shadow-xl shadow-black/35 backdrop-blur";

export const subCard =
  "rounded-xl border border-white/10 bg-black/20 shadow shadow-black/20";
