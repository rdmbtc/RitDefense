export const RitualLogo = () => {
  return (
    <a
      href="https://ritualfoundation.org/"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block opacity-90 hover:opacity-100 transition-all duration-300 hover:scale-105"
    >
      <div className="relative overflow-hidden rounded-md shadow-lg">
        <img
          src="/images/Logo Horizontal/Ritual Logo - Default - Horizontal Logo.png"
          alt="Ritual Logo"
          width={100}
          height={24}
          className="object-contain max-h-[24px] transition-transform hover:brightness-110"
          style={{
            filter: "drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1))",
          }}
        />
      </div>
    </a>
  );
};

// Keep MonadLogo for backwards compatibility
export const MonadLogo = RitualLogo;