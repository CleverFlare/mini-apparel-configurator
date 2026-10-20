import { useState, useSyncExternalStore } from "react";
import { DownloadIcon, ShareIcon, SquarePlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Chrome's install prompt event; not in the DOM typings yet.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const IOS_HINT_DISMISSED_KEY = "ios-install-hint-dismissed";

// The browser can fire this before React mounts, so it's captured as soon as
// the module loads and kept until the user installs.
let installEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
function setInstallEvent(event: BeforeInstallPromptEvent | null) {
  installEvent = event;
  for (const listener of listeners) listener();
}
window.addEventListener("beforeinstallprompt", (event) => {
  // Keep Chrome's mini-infobar away; the button below offers the install.
  event.preventDefault();
  setInstallEvent(event as BeforeInstallPromptEvent);
});
window.addEventListener("appinstalled", () => setInstallEvent(null));

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// iOS has no install prompt; installing goes through the Share menu's "Add
// to Home Screen". iPadOS reports itself as a Mac, so touch support tells
// them apart.
const isIos =
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

function readHintDismissed() {
  try {
    return localStorage.getItem(IOS_HINT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

// An "Install app" button where the browser can install the app, or a
// one-time hint on iOS. Nothing shows once the app runs installed.
export function InstallPrompt() {
  const event = useSyncExternalStore(subscribe, () => installEvent);
  const [hintDismissed, setHintDismissed] = useState(readHintDismissed);

  if (isStandalone) return null;

  if (event) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="bg-background/80 backdrop-blur"
        onClick={async () => {
          await event.prompt();
          const { outcome } = await event.userChoice;
          // The event can only prompt once.
          if (outcome === "accepted") setInstallEvent(null);
        }}
      >
        <DownloadIcon data-icon="inline-start" />
        Install app
      </Button>
    );
  }

  if (isIos && !hintDismissed) {
    const dismiss = () => {
      setHintDismissed(true);
      try {
        localStorage.setItem(IOS_HINT_DISMISSED_KEY, "1");
      } catch {
        // Private mode: the hint just comes back next visit.
      }
    };
    return (
      <div
        role="note"
        className="flex max-w-52 items-start gap-2 rounded-lg bg-background/90 p-3 text-xs shadow-sm ring-1 ring-foreground/10 backdrop-blur"
      >
        <p className="leading-relaxed">
          Install this app: tap{" "}
          <ShareIcon aria-label="Share" className="inline size-3.5 align-text-bottom" />{" "}
          then{" "}
          <span className="font-medium whitespace-nowrap">
            <SquarePlusIcon aria-hidden className="inline size-3.5 align-text-bottom" />{" "}
            Add to Home Screen
          </span>
          .
        </p>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Dismiss"
          onClick={dismiss}
          className="-mt-1 -mr-1 shrink-0"
        >
          <XIcon />
        </Button>
      </div>
    );
  }

  return null;
}
