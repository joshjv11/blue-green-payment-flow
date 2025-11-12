import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  UploadCloud,
  Sparkles,
  ShieldCheck,
  History,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackFeatureUsage } from "@/lib/analytics";

interface OCRInvoiceWorkbenchProps {
  workspaceId: string;
  userId: string;
}

interface ExtractionResponse {
  matchId?: string;
  jobId?: string;
  queuedAt?: string;
  processedAt?: string;
  extraction?: {
    vendor_name?: { value?: string; confidence?: number };
    invoice_number?: { value?: string; confidence?: number };
    invoice_date?: { value?: string };
    total_amount?: { value?: number; confidence?: number };
    subtotal?: { value?: number };
    tax?: { value?: number };
    payment_terms?: { value?: string };
    currency?: { value?: string };
    line_items?: Array<{
      description?: { value?: string };
      quantity?: { value?: number };
      unit_price?: { value?: number };
      total?: { value?: number };
    }>;
    overall_confidence?: number;
    source_document_type?: string;
  };
  rawArtifacts?: unknown;
}

const OCRInvoiceWorkbench = ({ workspaceId, userId }: OCRInvoiceWorkbenchProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useSyncMode, setUseSyncMode] = useState(true);
  const [extraction, setExtraction] = useState<ExtractionResponse | null>(null);
  const [history, setHistory] = useState<ExtractionResponse[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<"checking" | "online" | "offline">("checking");
  const [serviceMessage, setServiceMessage] = useState<string | null>(null);

  const workspaceSummary = useMemo(() => {
    if (!extraction?.extraction) return null;
    const { extraction: result } = extraction;
    return [
      {
        label: "Vendor",
        value: result.vendor_name?.value ?? "Unknown",
        confidence: result.vendor_name?.confidence,
      },
      {
        label: "Invoice #",
        value: result.invoice_number?.value ?? "N/A",
        confidence: result.invoice_number?.confidence,
      },
      {
        label: "Invoice Date",
        value: result.invoice_date?.value ?? "N/A",
      },
      {
        label: "Total",
        value:
          result.total_amount?.value !== undefined
            ? `${result.currency?.value ?? "₹"} ${result.total_amount.value.toLocaleString()}`
            : "N/A",
        confidence: result.total_amount?.confidence,
      },
      {
        label: "Confidence",
        value: result.overall_confidence
          ? `${Math.round(result.overall_confidence * 100)}%`
          : "N/A",
      },
    ];
  }, [extraction]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    setFile(event.target.files[0]);
    setExtraction(null);
    setErrorMessage(null);
  };

  const checkServiceHealth = useCallback(async () => {
    setServiceStatus((current) => (current === "offline" ? "checking" : current));
    try {
      const response = await fetch("/api/health", { method: "GET" });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      setServiceStatus("online");
      setServiceMessage(null);
    } catch (error) {
      console.warn("OCR health check failed", error);
      setServiceStatus("offline");
      setServiceMessage("OCR service offline. Start `npm run api:dev`.");
    }
  }, []);

  useEffect(() => {
    checkServiceHealth();
    const interval = setInterval(checkServiceHealth, 60000);
    return () => clearInterval(interval);
  }, [checkServiceHealth]);

  const handleSubmit = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Choose a PDF or image invoice to extract.",
        variant: "destructive",
      });
      return;
    }

    if (serviceStatus !== "online") {
      setErrorMessage("OCR service offline. Start backend with `npm run api:dev`.");
      toast({
        title: "OCR service offline",
        description: "Start the API server (`npm run api:dev`) and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    trackFeatureUsage("ocr", "submit");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId);
      formData.append("userId", userId);
      formData.append("sync", useSyncMode ? "true" : "false");

      const response = await fetch("/api/invoices/extract-from-upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? response.statusText);
      }

      const data: ExtractionResponse = useSyncMode
        ? await response.json()
        : {
            jobId: file.name,
            queuedAt: new Date().toISOString(),
          };

      setExtraction(data);
      setHistory((previous) => [data, ...previous].slice(0, 5));

      toast({
        title: useSyncMode ? "Extraction complete" : "Invoice queued",
        description: useSyncMode
          ? `We extracted ${data.extraction?.vendor_name?.value ?? "the invoice"}`
          : "Check the queue results in a few minutes.",
      });
    } catch (error) {
      console.error("OCR upload failed", error);
      const message =
        error instanceof Error
          ? error.message === "Failed to fetch"
            ? "OCR service offline. Start backend (`npm run api:dev`)."
            : error.message
          : "Unexpected error";
      setErrorMessage(message);
      if (message.includes("offline")) {
        setServiceStatus("offline");
        setServiceMessage(message);
      }
      toast({
        title: "OCR failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!workspaceId || !userId) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <UploadCloud className="h-6 w-6 text-primary" />
              Invoice OCR Workbench
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload invoices, run Tesseract + Claude hybrid extraction, and match details in seconds.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Hybrid AI OCR
            </Badge>
            <Badge
              variant={serviceStatus === "online" ? "outline" : "destructive"}
              className="flex items-center gap-1"
            >
              {serviceStatus === "online" ? (
                <>
                  <ShieldCheck className="h-3 w-3" />
                  Service online
                </>
              ) : serviceStatus === "checking" ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3" />
                  Service offline
                </>
              )}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1"
              onClick={checkServiceHealth}
              disabled={serviceStatus === "checking" || isProcessing}
            >
              <RefreshCw className="h-3 w-3" />
              {serviceStatus === "checking" ? "Checking…" : "Retry"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-[1.3fr,1fr]">
          <div className="rounded-lg border border-primary/10 bg-background/80 p-4 shadow-inner">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoice-file">Invoice file</Label>
                <Input
                  id="invoice-file"
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  PDFs or image formats up to 15 MB. We automatically correct rotation, run OCR, then persist metadata.
                </p>
              </div>

              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Synchronous extraction</p>
                  <p className="text-xs text-muted-foreground">
                    Wait for Claude fallback and see results instantly. Turn off to just enqueue.
                  </p>
                </div>
                <Switch
                  checked={useSyncMode}
                  onCheckedChange={setUseSyncMode}
                  disabled={isProcessing}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!file || isProcessing || serviceStatus !== "online"}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting…
                  </>
                ) : (
                  "Run OCR Extraction"
                )}
              </Button>

              {errorMessage && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md border border-destructive/40">
                  {errorMessage}
                </p>
              )}
              {serviceMessage && !isProcessing && (
                <p className="text-xs text-muted-foreground">
                  {serviceMessage}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-primary/10 bg-background/80 p-4 shadow-inner space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">
              Latest extraction
            </h3>
            {extraction?.extraction ? (
              <div className="space-y-3">
                <div className="grid gap-2 text-sm">
                  {workspaceSummary?.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">
                        {item.value}
                        {item.confidence !== undefined && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({Math.round(item.confidence * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {extraction.extraction.line_items && (
                  <div className="rounded-md border border-primary/10 p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      Line items ({extraction.extraction.line_items.length})
                    </p>
                    <div className="space-y-2 text-xs">
                      {extraction.extraction.line_items.map((line, index) => (
                        <div key={index} className="flex items-center justify-between gap-2">
                          <span className="truncate">{line.description?.value ?? "Item"}</span>
                          <span className="text-muted-foreground">
                            {line.quantity?.value ?? "—"} × {line.unit_price?.value ?? "—"}
                          </span>
                          <span className="font-medium">
                            {line.total?.value !== undefined ? line.total.value.toLocaleString() : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No extraction yet. Upload an invoice to view parsed details.
              </p>
            )}
          </div>
        </div>

        {extraction?.extraction && (
          <div className="rounded-lg border border-primary/10 bg-background/90 p-3">
            <Label className="text-xs uppercase text-muted-foreground mb-2 block">
              Raw payload
            </Label>
            <Textarea
              value={JSON.stringify(extraction.extraction, null, 2)}
              readOnly
              className="font-mono text-xs h-48"
            />
          </div>
        )}

        {history.length > 1 && (
          <div className="rounded-lg border border-primary/10 bg-background/80 p-3">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Recent extractions</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {history.slice(0, 5).map((item, index) => (
                <li key={index} className="flex items-center justify-between gap-3">
                  <span>{item.extraction?.invoice_number?.value ?? "Invoice"}</span>
                  <span>
                    {item.extraction?.total_amount?.value
                      ? item.extraction.total_amount.value.toLocaleString()
                      : "—"}
                  </span>
                  <span>
                    {item.extraction?.overall_confidence
                      ? `${Math.round(item.extraction.overall_confidence * 100)}%`
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OCRInvoiceWorkbench;

