export default function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-mono text-lg font-bold tracking-tight ${className}`}>
      CB<span className="text-cb-amber">|</span>DEVS
    </span>
  );
}
