export default function BrandMark({ size = 32, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <rect x="1" y="1" width="38" height="38" rx="12" fill="currentColor" fillOpacity="0.14" />
      <rect x="1" y="1" width="38" height="38" rx="12" stroke="currentColor" strokeOpacity="0.36" />
      <path d="M15 13.5 9.5 20l5.5 6.5M25 13.5l5.5 6.5-5.5 6.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 11v18" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="20" cy="20" r="3.2" fill="currentColor" />
      <circle cx="20" cy="20" r="1.1" fill="rgb(var(--color-surface))" />
    </svg>
  );
}
