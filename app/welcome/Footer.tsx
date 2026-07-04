export default function Footer() {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="max-w-[1280px] mx-auto px-6 md:px-16 flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="gradient-wordmark font-space font-black text-sm tracking-[0.1em]">ASTROLI</span>
        <p className="text-white/30 text-xs font-inter">© {new Date().getFullYear()} 10X Teacher. Restoring the joy of learning and teaching.</p>
      </div>
    </footer>
  );
}
