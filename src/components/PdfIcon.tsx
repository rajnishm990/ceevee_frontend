export default function PdfIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="PDF">
      <path d="M8 2h17l9 9v27H8z" fill="#fff" stroke="#c0392b" strokeWidth="2" />
      <path d="M25 2v9h9" fill="#fbe9e7" stroke="#c0392b" strokeWidth="2" />
      <rect x="4" y="20" width="26" height="11" rx="2" fill="#c0392b" />
      <text x="17" y="28.6" fontSize="8" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="Arial, sans-serif">PDF</text>
    </svg>
  );
}
