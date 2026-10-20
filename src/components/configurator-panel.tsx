import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerSwipeHandle,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ZoneThumbnail } from "@/components/zone-thumbnail";
import { useMediaQuery } from "@/hooks/use-media-query";
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

// The sheet's collapsed height until its content has been measured.
const FALLBACK_PEEK = 320;
// Space kept below the "Custom color" row when the sheet is collapsed.
const PEEK_GAP = 8;

function colorName(hex: string) {
  return (
    PALETTE.find((swatch) => swatch.value === hex.toLowerCase())?.label ??
    "Custom"
  );
}

type PanelProps = {
  colors: ZoneColors;
  selected: Zone;
  onSelect: (zone: Zone) => void;
  onColorChange: (zone: Zone, color: string) => void;
  onReset: () => void;
};

// A card docked to the right on desktop; a bottom sheet on mobile, whose
// collapsed height is reported so the viewport can keep the model above it.
export function ConfiguratorPanel({
  onPeekChange,
  ...props
}: PanelProps & { onPeekChange: (height: number) => void }) {
  const isDesktop = useMediaQuery("(min-width: 48rem)");
  return isDesktop ? (
    <DesktopPanel {...props} />
  ) : (
    <MobileSheet {...props} onPeekChange={onPeekChange} />
  );
}

function DesktopPanel({ onReset, ...props }: PanelProps) {
  return (
    <Card
      aria-label="Customize"
      className="relative z-10 m-4 w-95 shrink-0 gap-0 p-0"
    >
      <CardHeader className="pt-4">
        <CardTitle>Customize</CardTitle>
        <CardDescription>Choose a color for each part.</CardDescription>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4 [--panel-gutter:var(--card-spacing)]">
        <PanelControls
          {...props}
          customColorHeading={<p className="font-medium">Custom color</p>}
        />
      </CardContent>

      <CardFooter className="pb-(--card-spacing)">
        <Button variant="outline" onClick={onReset} className="w-full">
          <RotateCcwIcon data-icon="inline-start" />
          Reset all
        </Button>
      </CardFooter>
    </Card>
  );
}

// Always open and never dismissed, so the model stays interactive behind it.
// Collapsed, it shows the parts and swatches; swiped up (or via the "Custom
// color" row), it reveals the full picker.
function MobileSheet({
  onReset,
  onPeekChange,
  ...props
}: PanelProps & { onPeekChange: (height: number) => void }) {
  const [peek, setPeek] = useState(FALLBACK_PEEK);
  const [expanded, setExpanded] = useState(false);
  const [toggle, setToggle] = useState<HTMLButtonElement | null>(null);
  const [safeArea, setSafeArea] = useState<HTMLDivElement | null>(null);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);

  // Collapsing brings the controls back to the top, in case they were
  // scrolled while expanded.
  useEffect(() => {
    if (!expanded) scroller?.scrollTo({ top: 0, behavior: "smooth" });
  }, [expanded, scroller]);

  // The collapsed height runs from the sheet's top to just below the "Custom
  // color" row, plus the home indicator's inset, measured as if the controls
  // weren't scrolled. Re-measured whenever the sheet's size changes.
  const popupRef = useCallback(
    (popup: HTMLDivElement | null) => {
      if (!popup || !toggle || !safeArea || !scroller) return;
      const measure = () => {
        const height = Math.round(
          toggle.getBoundingClientRect().bottom -
            popup.getBoundingClientRect().top +
            scroller.scrollTop +
            PEEK_GAP +
            safeArea.offsetHeight,
        );
        setPeek(height);
        onPeekChange(height);
      };
      const observer = new ResizeObserver(measure);
      observer.observe(popup);
      return () => observer.disconnect();
    },
    [toggle, safeArea, scroller, onPeekChange],
  );

  return (
    <Drawer
      open
      modal={false}
      disablePointerDismissal
      // Swipes, Escape and the like can only change the snap point.
      onOpenChange={(open, details) => {
        if (!open) details.cancel();
      }}
      snapPoints={[peek, 1]}
      snapPoint={expanded ? 1 : peek}
      onSnapPointChange={(point, details) => {
        // A swipe past the collapsed height would dismiss; settle collapsed
        // instead, rather than back where the swipe started.
        if (point === null) details.cancel();
        setExpanded(point === 1);
      }}
    >
      <DrawerContent
        ref={popupRef}
        // Size to the content rather than the full viewport, so the expanded
        // snap point is exactly as tall as the controls.
        style={{ "--drawer-content-height": "auto" } as CSSProperties}
        className="shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.15)]"
      >
        {/* A tall grab area around a short, thick pill, like the grabber on
            native iOS and Android sheets. */}
        <DrawerSwipeHandle className="group-data-[swipe-axis=y]/drawer-popup:h-7 group-data-[swipe-direction=down]/drawer-popup:items-center after:bg-muted-foreground/35 group-data-[swipe-axis=y]/drawer-popup:after:h-1.5 group-data-[swipe-axis=y]/drawer-popup:after:w-10" />
        {/* Scrolls only when expanded, where short screens may not fit the
            whole picker. Collapsed, a vertical drag always moves the sheet
            instead of scrolling the picker into the visible strip. */}
        <div
          ref={setScroller}
          className={cn(
            "flex min-h-0 flex-col [--panel-gutter:--spacing(4)]",
            expanded ? "overflow-y-auto" : "overflow-y-hidden",
          )}
        >
          <div className="flex items-center justify-between px-(--panel-gutter) pb-3">
            <DrawerTitle>Customize</DrawerTitle>
            <DrawerDescription className="sr-only">
              Choose a color for each part.
            </DrawerDescription>
            <Button
              variant="secondary"
              size="sm"
              onClick={onReset}
              className="-mr-2.5"
            >
              <RotateCcwIcon data-icon="inline-start" />
              Reset
            </Button>
          </div>
          <div className="flex flex-col gap-4 px-(--panel-gutter) pb-[max(env(safe-area-inset-bottom),1rem)]">
            <PanelControls
              {...props}
              customColorHeading={
                <Button
                  ref={setToggle}
                  variant="ghost"
                  aria-expanded={expanded}
                  onClick={() => setExpanded((open) => !open)}
                  className="-mx-2.5 justify-between"
                >
                  Custom color
                  <ChevronUpIcon
                    data-icon="inline-end"
                    className={cn(
                      "transition-transform",
                      expanded && "rotate-180",
                    )}
                  />
                </Button>
              }
            />
          </div>
        </div>
        {/* Measures the home indicator's inset for the collapsed height. */}
        <div
          ref={setSafeArea}
          aria-hidden
          className="pointer-events-none invisible absolute h-[env(safe-area-inset-bottom)]"
        />
      </DrawerContent>
    </Drawer>
  );
}

// The part picker, palette and custom picker, shared by both layouts. The
// container sets --panel-gutter to its horizontal padding.
function PanelControls({
  colors,
  selected,
  onSelect,
  onColorChange,
  customColorHeading,
}: Omit<PanelProps, "onReset"> & {
  customColorHeading: ReactNode;
}) {
  const part = PARTS.find((p) => p.zone === selected)!;
  const color = colors[selected];

  return (
    <>
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
              carousel. It bleeds past the container's padding and takes that
              padding back inside, so the first swatch lines up with the
              content above and the row runs off the sheet's edge. The
              vertical padding leaves room for the focus outline. Desktop:
              two rows, each swatch stretching to its column. */}
          <ColorPickerSwatches
            className={cn(
              "-mx-(--panel-gutter) -my-1.5 flex snap-x snap-mandatory scroll-px-(--panel-gutter) gap-2 overflow-x-auto overscroll-x-contain px-(--panel-gutter) py-1.5 [scrollbar-width:none] [--color-picker-swatch-size:--spacing(10)] [&::-webkit-scrollbar]:hidden",
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

        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col self-stretch">{customColorHeading}</div>
          <ColorPickerWheel className="size-56">
            <ColorPickerArea className="size-full" />
          </ColorPickerWheel>
          <ColorPickerFields formats={["hex", "rgb", "hsl"]} className="w-56" />
        </div>
      </ColorPicker>
    </>
  );
}
