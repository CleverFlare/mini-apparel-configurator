import { useState } from "react";
import { ChevronUpIcon, RotateCcwIcon } from "lucide-react";
import {
  ColorPicker,
  ColorPickerArea,
  ColorPickerFields,
  ColorPickerSwatches,
  ColorPickerSwatchItem,
  ColorPickerWheel,
} from "@/components/reui/color-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ZoneThumbnail } from "@/components/zone-thumbnail";
import { PARTS, type Zone } from "@/lib/parts";
import { cn } from "@/lib/utils";
import type { ZoneColors } from "@/materials/sweater-material";

// A curated, fabric-like palette: the first stop for most customers, with the
// full picker behind it for anything else.
const PALETTE = [
  { value: "#1b1b1d", label: "Onyx" },
  { value: "#323232", label: "Graphite" },
  { value: "#616161", label: "Slate" },
  { value: "#838383", label: "Ash" },
  { value: "#919191", label: "Pebble" },
  { value: "#d9d4ca", label: "Bone" },
  { value: "#f2eee6", label: "Ivory" },
  { value: "#b08a62", label: "Camel" },
  { value: "#7a4a2e", label: "Cognac" },
  { value: "#5a1f2b", label: "Bordeaux" },
  { value: "#2f4436", label: "Forest" },
  { value: "#1f2b45", label: "Midnight" },
];

function colorName(hex: string) {
  return (
    PALETTE.find((swatch) => swatch.value === hex.toLowerCase())?.label ??
    "Custom"
  );
}

export function ConfiguratorPanel({
  colors,
  selected,
  onSelect,
  onColorChange,
  onReset,
}: {
  colors: ZoneColors;
  selected: Zone;
  onSelect: (zone: Zone) => void;
  onColorChange: (zone: Zone, color: string) => void;
  onReset: () => void;
}) {
  // Mobile only: the custom picker is tucked away until the sheet is swiped
  // up. On desktop the panel always shows it.
  const [expanded, setExpanded] = useState(false);
  const part = PARTS.find((p) => p.zone === selected)!;
  const color = colors[selected];

  return (
    <Card
      aria-label="Customize"
      className={cn(
        "relative z-10 max-h-100 shrink-0",
        // Mobile: a bottom sheet. Desktop: a card docked to the right.
        "rounded-b-none md:m-4 md:max-h-none md:w-95 md:rounded-xl p-0 gap-0",
      )}
    >
      <CardHeader className="hidden md:grid pt-4">
        <CardTitle>Customize</CardTitle>
        <CardDescription>Choose a color for each part.</CardDescription>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4">
        <ToggleGroup
          aria-label="Part"
          variant="outline"
          value={[selected]}
          onValueChange={(value) => {
            // Single choice: ignore the toggle-off of the current part.
            if (value[0]) onSelect(value[0] as Zone);
          }}
          className="grid w-full grid-cols-3"
        >
          {PARTS.map(({ zone, label, shade, mask }) => (
            <ToggleGroupItem
              key={zone}
              value={zone}
              aria-label={label}
              className="h-auto flex-col py-2"
            >
              <ZoneThumbnail
                shade={shade}
                mask={mask}
                color={colors[zone]}
                className="size-16"
              />
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <ColorPicker
          value={color}
          onValueChange={(value) => value && onColorChange(selected, value)}
          aria-label={`${part.label} color`}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{part.label}</p>
              <p className="text-muted-foreground">
                {colorName(color)} <span className="uppercase">{color}</span>
              </p>
            </div>
            {/* Mobile: one row that scrolls edge to edge like a native
                carousel. It bleeds past the card's padding and takes that
                padding back inside, so the first swatch lines up with the
                content above and the row runs off the sheet's edge. The
                vertical padding leaves room for the focus outline. Desktop:
                two rows, each swatch stretching to its column. */}
            <ColorPickerSwatches
              className={cn(
                "-mx-(--card-spacing) -my-1.5 flex snap-x snap-mandatory scroll-px-(--card-spacing) gap-2 overflow-x-auto overscroll-x-contain px-(--card-spacing) py-1.5 [scrollbar-width:none] [--color-picker-swatch-size:--spacing(10)] [&::-webkit-scrollbar]:hidden",
                "md:m-0 md:grid md:snap-none md:grid-cols-6 md:overflow-visible md:p-0",
              )}
            >
              {PALETTE.map((swatch) => (
                <ColorPickerSwatchItem
                  key={swatch.value}
                  value={swatch.value}
                  label={swatch.label}
                  title={swatch.label}
                  className="w-16 cursor-pointer snap-start md:w-full"
                />
              ))}
            </ColorPickerSwatches>
          </div>

          <Separator />

          <div className="flex flex-col">
            <p className="hidden font-medium md:block">Custom color</p>
            <Button
              variant="ghost"
              aria-expanded={expanded}
              onClick={() => setExpanded((open) => !open)}
              className="justify-between md:hidden"
            >
              Custom color
              <ChevronUpIcon
                data-icon="inline-end"
                className={cn(
                  "transition-transform",
                  !expanded && "rotate-180",
                )}
              />
            </Button>
            {/* Mobile: collapsed until the sheet is expanded. */}
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 md:grid-rows-[1fr]",
                expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="flex min-h-0 flex-col items-center gap-4 overflow-hidden">
                <ColorPickerWheel className="mt-4 size-56">
                  <ColorPickerArea className="size-full" />
                </ColorPickerWheel>
                <ColorPickerFields
                  formats={["hex", "rgb", "hsl"]}
                  className="w-56"
                />
              </div>
            </div>
          </div>
        </ColorPicker>
      </CardContent>

      <CardFooter className="pb-[max(env(safe-area-inset-bottom),var(--card-spacing))] md:pb-(--card-spacing)">
        <Button variant="outline" onClick={onReset} className="w-full">
          <RotateCcwIcon data-icon="inline-start" />
          Reset all
        </Button>
      </CardFooter>
    </Card>
  );
}
