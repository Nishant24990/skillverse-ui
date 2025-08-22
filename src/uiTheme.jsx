export const palette = {
  bg: {
    welcome: "from-rose-300 via-amber-200 to-indigo-200",
    auth: "from-violet-300 via-indigo-200 to-sky-200",
    home: "from-amber-200 via-rose-100 to-rose-50",
    profile: "from-amber-200 via-rose-100 to-rose-50",
    chat: "from-indigo-200 via-sky-200 to-teal-200",
    sched: "from-slate-100 via-indigo-100 to-sky-100",
  },
  primary: "indigo-600",
  primaryHover: "indigo-700",
  accent: "violet-600",
  success: "emerald-600",
  danger: "rose-600",
};

export const cls = {
  page: (gradient) => `min-h-screen pb-16 bg-gradient-to-b ${gradient}`,
  card:
    "bg-white/80 backdrop-blur border border-white/60 shadow-md rounded-2xl",
  button:
    "inline-flex items-center justify-center rounded-xl font-medium transition-colors px-4 py-2",
  pill: "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
  input:
    "w-full px-3 py-2 rounded-xl border border-slate-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-400",
};

export function Btn({ variant = "primary", className = "", ...props }) {
  const variants = {
    primary: `bg-${palette.primary} hover:bg-${palette.primaryHover} text-white`,
    secondary: "bg-white/70 hover:bg-white text-slate-900 border border-white/70",
    success: `bg-${palette.success} hover:bg-emerald-700 text-white`,
    danger: `bg-${palette.danger} hover:bg-rose-700 text-white`,
    ghost: "bg-transparent hover:bg-black/5 text-slate-900",
  };
  return (
    <button {...props} className={`${cls.button} ${variants[variant]} ${className}`} />
  );
}