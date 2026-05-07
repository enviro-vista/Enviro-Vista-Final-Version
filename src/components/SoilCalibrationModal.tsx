import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Copy,
  Droplets,
  Leaf,
  Loader2,
  MapPin,
  Sparkles,
  Sun,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type SoilCalibrationMode = "add" | "recalibrate";

type FlowStep = "checklist" | "dry" | "clean" | "wet" | "complete";

const FLOW_STEPS: FlowStep[] = ["checklist", "dry", "clean", "wet", "complete"];

const CALIBRATION_FUNCTION_PATH = "/functions/v1/soil-calibration-with-apikey";

interface SoilCalibrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: SoilCalibrationMode;
  /** `devices.id` (UUID) — required for polling and clearing calibration fields */
  deviceUuid: string | null;
  /** Hardware id (`devices.device_id`) for firmware POST body */
  deviceMacId: string | null;
  /** Device API key (firmware uses with endpoint below) */
  deviceApiKey: string | null;
  onCalibrationConfirmed: () => void | Promise<void>;
}

export function SoilCalibrationModal({
  open,
  onOpenChange,
  mode,
  deviceUuid,
  deviceMacId,
  deviceApiKey,
  onCalibrationConfirmed,
}: SoilCalibrationModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<FlowStep>("checklist");
  const [waitingDry, setWaitingDry] = useState(false);
  const [waitingWet, setWaitingWet] = useState(false);
  /** True while clearing DB so polling cannot see a previous recalibration value */
  const [clearingDry, setClearingDry] = useState(false);
  const [clearingWet, setClearingWet] = useState(false);
  const [summary, setSummary] = useState<{
    dry: number | null;
    wet: number | null;
  }>({ dry: null, wet: null });

  const endpointUrl = `${SUPABASE_URL.replace(/\/$/, "")}${CALIBRATION_FUNCTION_PATH}`;
  const exampleDryJson =
    deviceMacId && deviceApiKey
      ? JSON.stringify(
          {
            device_id: deviceMacId,
            device_apikey: deviceApiKey,
            phase: "dry",
            value: 0,
          },
          null,
          2,
        )
      : "";

  useEffect(() => {
    if (!open) return;
    setStep("checklist");
    setWaitingDry(false);
    setWaitingWet(false);
    setClearingDry(false);
    setClearingWet(false);
    setSummary({ dry: null, wet: null });
  }, [open]);

  // Poll every 3s while waiting for device to POST calibration via edge function
  useEffect(() => {
    if (!open || !deviceUuid) return;
    const pollingDry = step === "dry" && waitingDry;
    const pollingWet = step === "wet" && waitingWet;
    if (!pollingDry && !pollingWet) return;

    const check = async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("soil_calibration_dry_value, soil_calibration_wet_value")
        .eq("id", deviceUuid)
        .single();

      if (error || !data) return;

      if (pollingDry && data.soil_calibration_dry_value != null) {
        setSummary((s) => ({ ...s, dry: data.soil_calibration_dry_value }));
        setWaitingDry(false);
        setStep("clean");
        return;
      }
      if (pollingWet && data.soil_calibration_wet_value != null) {
        setSummary((s) => ({ ...s, wet: data.soil_calibration_wet_value }));
        setWaitingWet(false);
        setStep("complete");
      }
    };

    void check();
    const id = window.setInterval(() => void check(), 3000);
    return () => window.clearInterval(id);
  }, [open, deviceUuid, step, waitingDry, waitingWet]);

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: label });
    } catch {
      toast({
        title: "Copy failed",
        variant: "destructive",
      });
    }
  };

  const startDryCalibration = useCallback(async () => {
    if (!deviceUuid) return;
    setClearingDry(true);
    try {
      // Clear first, then poll: avoids accepting an old dry value from a previous calibration
      const { error } = await supabase
        .from("devices")
        .update({ soil_calibration_dry_value: null })
        .eq("id", deviceUuid);
      if (error) {
        toast({
          title: "Could not reset dry calibration",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      setWaitingDry(true);
    } finally {
      setClearingDry(false);
    }
  }, [deviceUuid, toast]);

  const startWetCalibration = useCallback(async () => {
    if (!deviceUuid) return;
    setClearingWet(true);
    try {
      const { error } = await supabase
        .from("devices")
        .update({ soil_calibration_wet_value: null })
        .eq("id", deviceUuid);
      if (error) {
        toast({
          title: "Could not reset wet calibration",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      setWaitingWet(true);
    } finally {
      setClearingWet(false);
    }
  }, [deviceUuid, toast]);

  const handleContinue = useCallback(async () => {
    try {
      await Promise.resolve(onCalibrationConfirmed());
      onOpenChange(false);
      setStep("checklist");
    } catch {
      // caller may toast
    }
  }, [onCalibrationConfirmed, onOpenChange]);

  const stepIndex = FLOW_STEPS.indexOf(step);

  const title =
    mode === "add" ? "Soil sensor calibration" : "Recalibrate soil sensor";

  const missingDevice = open && (!deviceUuid || !deviceMacId || !deviceApiKey);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        hideClose
        className="sm:max-w-md overflow-hidden border-2 border-primary/20 shadow-xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-sky-500/10" />
        <DialogHeader className="space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Leaf className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {mode === "add"
              ? "Your device is saved. Complete calibration so moisture readings map correctly to dry vs wet soil."
              : "Walk through the steps again to refresh dry and wet reference values."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1 py-2">
          {FLOW_STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-2 flex-1 max-w-12 rounded-full transition-all duration-300",
                stepIndex > i && "bg-primary",
                stepIndex === i && "bg-primary scale-y-125 ring-2 ring-primary/40",
                stepIndex < i && "bg-muted",
              )}
            />
          ))}
        </div>

        {missingDevice ? (
          <p className="text-center text-sm text-destructive py-6">
            Device information is missing. Close this dialog and try again.
          </p>
        ) : (
          <>
            {step === "checklist" && (
              <div className="space-y-4 py-2 animate-in fade-in duration-300">
                <h3 className="font-semibold text-center">Before you start, have:</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3 rounded-lg border bg-card/50 p-3">
                    <Wrench className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Your soil sensor</p>
                      <p className="text-muted-foreground">
                        The probe you just registered, powered and able to send readings.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3 rounded-lg border bg-card/50 p-3">
                    <Sparkles className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Soft cloth or paper towel</p>
                      <p className="text-muted-foreground">
                        To clean the probe between dry and wet steps.
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3 rounded-lg border bg-card/50 p-3">
                    <MapPin className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Access to soil</p>
                      <p className="text-muted-foreground">
                        Farmland, garden bed, potting soil, or any container with soil — you
                        need both <strong>dry</strong> and <strong>wet</strong> samples.
                      </p>
                    </div>
                  </li>
                </ul>
                <Button className="w-full" size="lg" onClick={() => setStep("dry")}>
                  I&apos;m ready — continue
                </Button>
              </div>
            )}

            {step === "dry" && (
              <div className="space-y-4 py-2 animate-in fade-in duration-300">
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                    <Sun className="h-8 w-8" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg text-center">Dry soil</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Place the probe in <strong>dry soil</strong> and keep it steady. When you tap{" "}
                  <strong>Calibrate for dry</strong>, we first clear any saved dry value, then wait
                  for a <strong>new</strong> reading from your device.
                  {mode === "recalibrate" && (
                    <span className="block mt-2 text-xs">
                      Recalibration replaces your previous dry and wet points; the wet step clears
                      the old wet value when you start it.
                    </span>
                  )}
                </p>
                
                {clearingDry ? (
                  <div className="space-y-2 rounded-lg border border-dashed p-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Clearing any previous dry value so we only accept a new reading from your
                      device…
                    </p>
                  </div>
                ) : !waitingDry ? (
                  <Button className="w-full" size="lg" onClick={() => void startDryCalibration()}>
                    Calibrate for dry
                  </Button>
                ) : (
                  <div className="space-y-3 rounded-lg border border-dashed p-4 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm font-medium">Waiting for dry calibration value…</p>
                    <p className="text-xs text-muted-foreground">
                      We check every 3 seconds. Ensure your device POSTs{" "}
                      <code className="rounded bg-muted px-1">phase: &quot;dry&quot;</code> with
                      the measured value.
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === "clean" && (
              <div className="space-y-4 py-2 animate-in fade-in duration-300">
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-500/15 text-slate-700 dark:text-slate-300">
                    <Sparkles className="h-8 w-8" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg text-center">Clean the probe</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Remove the probe from the soil and clean it thoroughly with your cloth or paper
                  towel so the wet reading isn&apos;t affected by dry soil residue.
                </p>
                <Button className="w-full" size="lg" onClick={() => setStep("wet")}>
                  Done cleaning
                </Button>
              </div>
            )}

            {step === "wet" && (
              <div className="space-y-4 py-2 animate-in fade-in duration-300">
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-700 dark:text-sky-400">
                    <Droplets className="h-8 w-8" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg text-center">Wet soil</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Place the probe in <strong>well-watered soil</strong>. Then use the same
                  endpoint with <code className="rounded bg-muted px-1">phase: &quot;wet&quot;</code>.
                </p>
                {clearingWet ? (
                  <div className="space-y-2 rounded-lg border border-dashed p-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Clearing any previous wet value so we only accept a new reading…
                    </p>
                  </div>
                ) : !waitingWet ? (
                  <Button className="w-full" size="lg" onClick={() => void startWetCalibration()}>
                    Calibrate for wet
                  </Button>
                ) : (
                  <div className="space-y-3 rounded-lg border border-dashed p-4 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm font-medium">Waiting for wet calibration value…</p>
                    <p className="text-xs text-muted-foreground">
                      Checking every 3 seconds. POST <code className="rounded bg-muted px-1">phase: &quot;wet&quot;</code>{" "}
                      with the new reading.
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === "complete" && (
              <div className="space-y-4 py-2 animate-in zoom-in-95 fade-in duration-300">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg">Calibration complete</h3>
                  <p className="text-sm text-muted-foreground">
                    Dry and wet reference values are stored on your device record. You can
                    recalibrate any time from the device menu.
                  </p>
                  {(summary.dry != null || summary.wet != null) && (
                    <div className="rounded-lg bg-muted/50 p-3 text-left text-sm space-y-1 mt-3">
                      {summary.dry != null && (
                        <p>
                          <span className="text-muted-foreground">Dry value:</span>{" "}
                          <span className="font-mono">{summary.dry}</span>
                        </p>
                      )}
                      {summary.wet != null && (
                        <p>
                          <span className="text-muted-foreground">Wet value:</span>{" "}
                          <span className="font-mono">{summary.wet}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter className="sm:justify-center">
                  <Button
                    type="button"
                    size="lg"
                    className="min-w-[200px] bg-green-600 hover:bg-green-700"
                    onClick={() => void handleContinue()}
                  >
                    Continue to app
                  </Button>
                </DialogFooter>
              </div>
            )}
          </>
        )}

        {step !== "complete" && !missingDevice && (
          <p className="text-center text-xs text-muted-foreground pt-2">
            Finish all steps or use Continue on the last screen to close this dialog.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
