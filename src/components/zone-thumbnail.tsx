import { cn } from "@/lib/utils";
// The whole garment as a faint ghost, with the part on top in its exact
// color, multiplied by the shading and masked to the part's shape.
export function ZoneThumbnail({
  shade,
  mask,
  color,
  className,
}: {
  shade: string;
  mask: string;
  color: string;
  className?: string;
}) {
  return (
    <span className={cn("relative block shrink-0", className)} aria-hidden>
      <img
        src={shade}
        alt=""
        draggable={false}
        // The shading is light gray: dimmed, so the ghost shows on light cards.
        className="absolute inset-0 size-full opacity-30 brightness-50"
      />
      <span
        // The shading averages ~70% gray; brighten so the lit fabric reads
        // close to the chosen color rather than darker than it.
        className="absolute inset-0 bg-blend-multiply brightness-[1.35] transition-[background-color] duration-300"
        style={{
          backgroundColor: color,
          backgroundImage: `url(${shade})`,
          backgroundSize: "100% 100%",
          maskImage: `url(${mask})`,
          maskSize: "100% 100%",
        }}
      />
    </span>
  );
}
