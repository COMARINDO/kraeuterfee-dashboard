/** Gemeinsamer Hintergrund (Landing + eingeloggte App). */
export function KraeuterfeeBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(254,243,199,0.9)_0%,transparent_55%),radial-gradient(ellipse_90%_70%_at_100%_40%,rgba(196,181,253,0.35)_0%,transparent_50%),radial-gradient(ellipse_80%_60%_at_0%_60%,rgba(134,239,172,0.25)_0%,transparent_45%),linear-gradient(165deg,#fbf9f4_0%,#eef4ec_45%,#f3eef8_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-[#c4b5fd]/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-[#86efac]/20 blur-3xl"
        aria-hidden
      />
    </>
  );
}
