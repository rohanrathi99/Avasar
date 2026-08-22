import * as api from "@client/api";
import { SettingsSectionFrame } from "@client/pages/settings/components/SettingsSectionFrame";
import type {
  ExportDatasetId,
  ExportDatasetInfo,
  ExportFormat,
} from "@shared/types";
import { useQuery } from "@tanstack/react-query";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { showErrorToast } from "@/client/lib/error-toast";
import { queryKeys } from "@/client/lib/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

type ExportSettingsSectionProps = {
  isLoading?: boolean;
  isSaving?: boolean;
  layoutMode?: "accordion" | "panel";
};

const FORMAT_OPTIONS: Array<{
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "xlsx",
    label: "Excel workbook (.xlsx)",
    description: "One worksheet per dataset. Best for spreadsheets.",
    icon: FileSpreadsheet,
  },
  {
    id: "json",
    label: "JSON document (.json)",
    description: "Structured data with one key per dataset.",
    icon: FileJson,
  },
];

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function buildFileName(format: ExportFormat): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return `avasar-export-${stamp}.${format}`;
}

export const ExportSettingsSection: React.FC<ExportSettingsSectionProps> = ({
  isLoading = false,
  isSaving = false,
  layoutMode,
}) => {
  const [selected, setSelected] = useState<Set<ExportDatasetId>>(new Set());
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const [isExporting, setIsExporting] = useState(false);

  const datasetsQuery = useQuery({
    queryKey: queryKeys.exportData.datasets(),
    queryFn: api.getExportDatasets,
  });

  const datasets: ExportDatasetInfo[] = useMemo(
    () => datasetsQuery.data?.datasets ?? [],
    [datasetsQuery.data],
  );

  const disabled = isLoading || isSaving || datasetsQuery.isLoading;
  const allSelected = datasets.length > 0 && selected.size === datasets.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleDataset = (id: ExportDatasetId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) =>
      prev.size === datasets.length
        ? new Set()
        : new Set(datasets.map((dataset) => dataset.id)),
    );
  };

  const handleExport = async () => {
    if (selected.size === 0) {
      toast.error("Select at least one dataset to export");
      return;
    }
    setIsExporting(true);
    try {
      const datasetIds = datasets
        .map((dataset) => dataset.id)
        .filter((id) => selected.has(id));
      const blob = await api.exportData({ datasets: datasetIds, format });
      downloadBlob(blob, buildFileName(format));
      toast.success("Export ready", {
        description: `Downloaded ${datasetIds.length} dataset${
          datasetIds.length !== 1 ? "s" : ""
        } as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      showErrorToast(error, "Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SettingsSectionFrame mode={layoutMode} title="Export" value="export">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Download your data for backup or use in other tools. Choose the
          datasets you want, pick a file format, then click Proceed to download.
        </p>

        {/* Dataset selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">1. Select data to export</div>
            <button
              type="button"
              onClick={toggleSelectAll}
              disabled={disabled || datasets.length === 0}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Checkbox
                checked={
                  allSelected ? true : someSelected ? "indeterminate" : false
                }
                disabled={disabled || datasets.length === 0}
                aria-label="Select all datasets"
                className="pointer-events-none"
              />
              Select all
            </button>
          </div>

          {datasetsQuery.isLoading ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Loading datasets…
            </div>
          ) : datasets.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No exportable data was found.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {datasets.map((dataset) => {
                const isSelected = selected.has(dataset.id);
                return (
                  <button
                    key={dataset.id}
                    type="button"
                    onClick={() => toggleDataset(dataset.id)}
                    disabled={disabled}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={disabled}
                      aria-label={`Export ${dataset.label}`}
                      className="pointer-events-none mt-0.5"
                    />
                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {dataset.label}
                        </span>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {dataset.count}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {dataset.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        {/* Format selection */}
        <div className="space-y-3">
          <div className="text-sm font-medium">2. Choose a format</div>
          <RadioGroup
            value={format}
            onValueChange={(value) => setFormat(value as ExportFormat)}
            className="grid gap-2 sm:grid-cols-2"
          >
            {FORMAT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = format === option.id;
              return (
                <label
                  key={option.id}
                  htmlFor={`export-format-${option.id}`}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent ${
                    isSelected ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <RadioGroupItem
                    id={`export-format-${option.id}`}
                    value={option.id}
                    disabled={disabled}
                    className="mt-0.5"
                  />
                  <div className="grid gap-0.5">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                </label>
              );
            })}
          </RadioGroup>
        </div>

        <Separator />

        {/* Proceed */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {selected.size === 0
              ? "No datasets selected."
              : `${selected.size} dataset${
                  selected.size !== 1 ? "s" : ""
                } selected · ${format.toUpperCase()}`}
          </div>
          <Button
            type="button"
            onClick={handleExport}
            disabled={disabled || isExporting || selected.size === 0}
            className="whitespace-nowrap"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Preparing…" : "Proceed"}
          </Button>
        </div>
      </div>
    </SettingsSectionFrame>
  );
};
