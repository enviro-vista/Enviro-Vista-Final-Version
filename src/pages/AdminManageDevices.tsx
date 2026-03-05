import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/AppLayout";
import { Shield, Cpu, Loader2, Plus, Upload, Download, Pencil, Trash2, Printer } from "lucide-react";
import QRCode from "qrcode";
import type { Database } from "@/integrations/supabase/types";

type AvailableDeviceRow = Database["public"]["Tables"]["available_devices"]["Row"];

const DEVICE_TYPES = ["SOIL", "AIR"] as const;

/** Derive MAC address from input_id: last 12 characters, formatted as XX:XX:XX:XX:XX:XX */
function inputIdToMacAddress(inputId: string): string {
  const raw = String(inputId || "").trim().replace(/[\s:-]/g, "");
  const last12 = raw.length >= 12 ? raw.slice(-12) : raw.padStart(12, "0").slice(-12);
  const pairs = last12.match(/.{1,2}/g) ?? [];
  return pairs.map((p) => p.padStart(2, "0")).join(":").toUpperCase();
}

/** Parse CSV with header row; expect input_id, optional uuid, optional device_type. */
function parseBulkCsv(text: string): { input_id: string; uuid: string; device_type: string }[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const inputIdIdx = header.findIndex((h) => h === "input_id" || h === "input id");
  const uuidIdx = header.findIndex((h) => h === "uuid");
  const deviceTypeIdx = header.findIndex((h) => h === "device_type" || h === "device type" || h === "type");
  if (inputIdIdx === -1) return [];
  const rows: { input_id: string; uuid: string; device_type: string }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const input_id = values[inputIdIdx]?.trim() ?? "";
    const uuid = (uuidIdx >= 0 ? values[uuidIdx]?.trim() ?? "" : "").trim();
    const rawType = deviceTypeIdx >= 0 ? values[deviceTypeIdx]?.trim().toUpperCase() ?? "" : "";
    const device_type = DEVICE_TYPES.includes(rawType as (typeof DEVICE_TYPES)[number]) ? rawType : "SOIL";
    if (input_id) rows.push({ input_id, uuid, device_type });
  }
  return rows;
}

const AdminManageDevices = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<AvailableDeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [form, setForm] = useState({
    deviceType: "SOIL" as (typeof DEVICE_TYPES)[number],
    number: "",
    input_id: "",
  });
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const [editingRow, setEditingRow] = useState<AvailableDeviceRow | null>(null);
  const [editForm, setEditForm] = useState({ device_name: "", qr_code: "", mac_address: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deletingRow, setDeletingRow] = useState<AvailableDeviceRow | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchAvailableDevices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("available_devices")
        .select("id, device_name, qr_code, mac_address, is_used, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDevices(data ?? []);
    } catch (err) {
      console.error("Error fetching available devices:", err);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.rpc("is_admin");
        if (!error) setIsAdmin(!!data);
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchAvailableDevices();
  }, [isAdmin, fetchAvailableDevices]);

  const getNextNumberForType = useCallback(
    (type: string) => {
      const prefix = type + "_";
      const existing = devices
        .filter((d) => d.device_name?.startsWith(prefix))
        .map((d) => {
          const n = d.device_name?.replace(prefix, "") ?? "";
          return parseInt(n, 10);
        })
        .filter((n) => !Number.isNaN(n));
      const max = existing.length ? Math.max(...existing) : 0;
      return String(max + 1).padStart(3, "0");
    },
    [devices]
  );

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = form.number.trim() || getNextNumberForType(form.deviceType);
    const deviceName = `${form.deviceType}_${num.padStart(3, "0")}`;
    const inputId = form.input_id.trim();
    if (!inputId) {
      toast({
        title: "Missing fields",
        description: "Input ID is required (it is also used as the QR code value).",
        variant: "destructive",
      });
      return;
    }
    const mac_address = inputIdToMacAddress(inputId);
    if (mac_address.length < 17) {
      toast({
        title: "Invalid Input ID",
        description: "Input ID must have at least 12 characters to derive MAC address.",
        variant: "destructive",
      });
      return;
    }
    setFormSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("admin_insert_available_device", {
        p_device_name: deviceName,
        p_qr_code: inputId,
        p_mac_address: mac_address,
      });
      if (error) throw error;
      toast({
        title: "Device added",
        description: `${data?.device_name ?? deviceName} has been added to the registry.`,
      });
      setForm({ deviceType: "SOIL", number: "", input_id: "" });
      await fetchAvailableDevices();
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Failed to add device.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const openEdit = (row: AvailableDeviceRow) => {
    setEditingRow(row);
    setEditForm({
      device_name: row.device_name ?? "",
      qr_code: row.qr_code,
      mac_address: row.mac_address,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    setEditSubmitting(true);
    try {
      const { error } = await supabase.rpc("admin_update_available_device", {
        p_id: editingRow.id,
        p_device_name: editForm.device_name.trim() || null,
        p_qr_code: editForm.qr_code.trim() || null,
        p_mac_address: editForm.mac_address.trim() || null,
      });
      if (error) throw error;
      toast({ title: "Device updated", description: `${editForm.device_name || editingRow.device_name} has been updated.` });
      setEditingRow(null);
      await fetchAvailableDevices();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Update failed.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setEditSubmitting(false);
    }
  };

  const openDelete = (row: AvailableDeviceRow) => setDeletingRow(row);

  const handleDeleteConfirm = async () => {
    if (!deletingRow) return;
    setDeleteSubmitting(true);
    try {
      const { error } = await supabase.rpc("admin_delete_available_device", { p_id: deletingRow.id });
      if (error) throw error;
      toast({ title: "Device removed", description: "The device has been removed from the registry." });
      setDeletingRow(null);
      await fetchAvailableDevices();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Delete failed.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handlePrint = async (row: AvailableDeviceRow) => {
    const raw = row.device_name ?? row.mac_address ?? row.qr_code ?? "Device";
    const label = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    let qrDataUrl: string;
    try {
      qrDataUrl = await QRCode.toDataURL(raw, { width: 280, margin: 2 });
    } catch (err) {
      toast({ title: "Error", description: "Could not generate QR code.", variant: "destructive" });
      return;
    }
    const w = window.open("", "_blank", "width=400,height=500");
    if (!w) {
      toast({ title: "Print", description: "Allow pop-ups to print the QR code.", variant: "destructive" });
      return;
    }
    w.document.write(`
      <!DOCTYPE html><html><head><title>${label}</title>
      <style>
        body { font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
        h1 { font-size: 1.5rem; margin-bottom: 16px; }
        img { display: block; }
      </style></head>
      <body>
        <h1>${label}</h1>
        <img src="${qrDataUrl}" alt="QR Code" />
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 300);
  };

  const downloadSampleCsv = () => {
    const header = "input_id,uuid,device_type\n";
    const rows = [
      "092515588C814131,SOIL_Serial000001,SOIL",
      "092515588C814132,SOIL_Serial000002,SOIL",
      "092515588C814133,,AIR",
    ].join("\n");
    const csv = header + rows;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_available_devices.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = (e.target as HTMLFormElement).querySelector<HTMLInputElement>('input[type="file"]')?.files?.[0];
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please choose a CSV file with input_id, optional uuid, and optional device_type columns.",
        variant: "destructive",
      });
      return;
    }
    const text = await file.text();
    const rows = parseBulkCsv(text);
    if (rows.length === 0) {
      toast({
        title: "Invalid CSV",
        description: "CSV must have a header row with 'input_id' (and optional 'uuid', 'device_type') and at least one data row.",
        variant: "destructive",
      });
      return;
    }
    const invalid = rows.filter((r) => !r.input_id.trim());
    if (invalid.length > 0) {
      toast({
        title: "Invalid rows",
        description: `${invalid.length} row(s) are missing input_id. Fix or remove them.`,
        variant: "destructive",
      });
      return;
    }
    setBulkSubmitting(true);
    const typeCounts: Record<string, number> = {};
    let added = 0;
    let failed = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const deviceType = r.device_type as (typeof DEVICE_TYPES)[number];
      const nextForType = getNextNumberForType(deviceType);
      const used = typeCounts[deviceType] ?? 0;
      typeCounts[deviceType] = used + 1;
      const seq = String(parseInt(nextForType, 10) + used).padStart(3, "0");
      const deviceName = r.uuid.trim() || `${deviceType}_${seq}`;
      const mac_address = inputIdToMacAddress(r.input_id);
      const qr_code = r.input_id.trim();
      if (mac_address.length < 17) {
        failed++;
        continue;
      }
      try {
        const { error } = await supabase.rpc("admin_insert_available_device", {
          p_device_name: deviceName,
          p_qr_code: qr_code,
          p_mac_address: mac_address,
        });
        if (error) throw error;
        added++;
      } catch {
        failed++;
      }
    }
    setBulkSubmitting(false);
    if (bulkFileInputRef.current) bulkFileInputRef.current.value = "";
    await fetchAvailableDevices();
    if (failed === 0) {
      toast({
        title: "Bulk upload complete",
        description: `Added ${added} device(s).`,
      });
    } else {
      toast({
        title: "Bulk upload finished with errors",
        description: `Added ${added}, failed ${failed}. Check input_id (need ≥12 chars for MAC) and duplicates.`,
        variant: "destructive",
      });
    }
  };

  if (!user || (loading && !isAdmin)) {
    return (
      <AppLayout title="Manage Devices" breadcrumbs={[{ title: "Administration" }, { title: "Manage Devices" }]}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout
        title="Access Denied"
        subtitle="Administrator privileges required"
        breadcrumbs={[{ title: "Administration" }, { title: "Manage Devices" }]}
      >
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You don't have administrator privileges to access this page.
              </p>
            </div>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Manage Devices"
      subtitle="Available device registry (QR codes and MAC addresses)"
      breadcrumbs={[
        { title: "Administration", href: "/admin" },
        { title: "Manage Devices" },
      ]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Device
              </CardTitle>
            <p className="text-sm text-muted-foreground">
              Device name will be generated as <span className="font-mono">TYPE_NNN</span> (e.g. SOIL_001). Leave number blank to auto-increment.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddDevice} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="deviceType">Device type</Label>
                <Select
                  value={form.deviceType}
                  onValueChange={(v) => setForm((f) => ({ ...f, deviceType: v as (typeof DEVICE_TYPES)[number] }))}
                >
                  <SelectTrigger id="deviceType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEVICE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">Number (optional)</Label>
                <Input
                  id="number"
                  placeholder="e.g. 001"
                  value={form.number}
                  onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="input_id">Input ID / QR code</Label>
                <Input
                  id="input_id"
                  required
                  placeholder="e.g. 092515588C814131"
                  value={form.input_id}
                  onChange={(e) => setForm((f) => ({ ...f, input_id: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Same value is used as QR code. MAC is derived from the last 12 characters.
                </p>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={formSubmitting}>
                  {formSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add device
                </Button>
              </div>
            </form>
          </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload multiple devices
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload a CSV with <span className="font-mono">input_id</span> (required), optional <span className="font-mono">uuid</span>, and optional <span className="font-mono">device_type</span> (SOIL or AIR; default SOIL). QR code = input_id; MAC from last 12 chars. device_name = uuid or auto-generated.{" "}
                <Button type="button" variant="link" className="h-auto p-0 text-primary" onClick={downloadSampleCsv}>
                  <Download className="h-3.5 w-3 inline mr-1" />
                  Download sample CSV
                </Button>
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkCsv">CSV file</Label>
                  <Input
                    ref={bulkFileInputRef}
                    id="bulkCsv"
                    type="file"
                    accept=".csv"
                    required
                  />
                </div>
                <Button type="submit" disabled={bulkSubmitting}>
                  {bulkSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {bulkSubmitting ? "Adding…" : "Upload CSV"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Available Devices
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Devices in this table can be registered by users. Once registered, <em>is_used</em> is set to true.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : devices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No available devices in the registry.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device name</TableHead>
                    <TableHead>QR Code</TableHead>
                    <TableHead>MAC Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-sm">{row.device_name ?? "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{row.qr_code}</TableCell>
                      <TableCell className="font-mono text-sm">{row.mac_address}</TableCell>
                      <TableCell>
                        <Badge variant={row.is_used ? "secondary" : "default"}>
                          {row.is_used ? "Used" : "Available"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(row.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(row.updated_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Print QR label"
                            onClick={() => handlePrint(row)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          {!row.is_used && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Edit"
                                onClick={() => openEdit(row)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Delete"
                                onClick={() => openDelete(row)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingRow} onOpenChange={(open) => !open && setEditingRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit device</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_device_name">Device name</Label>
              <Input
                id="edit_device_name"
                value={editForm.device_name}
                onChange={(e) => setEditForm((f) => ({ ...f, device_name: e.target.value }))}
                placeholder="e.g. SOIL_001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_qr_code">QR code</Label>
              <Input
                id="edit_qr_code"
                value={editForm.qr_code}
                onChange={(e) => setEditForm((f) => ({ ...f, qr_code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_mac_address">MAC address</Label>
              <Input
                id="edit_mac_address"
                value={editForm.mac_address}
                onChange={(e) => setEditForm((f) => ({ ...f, mac_address: e.target.value }))}
                placeholder="AA:BB:CC:DD:EE:FF"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingRow(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSubmitting}>
                {editSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingRow} onOpenChange={(open) => !open && setDeletingRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove device from registry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {deletingRow?.device_name ?? deletingRow?.mac_address} from the available devices registry. Only unassigned devices can be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteConfirm(); }}
              disabled={deleteSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default AdminManageDevices;
