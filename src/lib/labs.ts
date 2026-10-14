// LvxPaths — lab orchestration

export type LabStatus = "starting" | "running" | "stopped" | "expired" | "failed";

export interface LabSession {
  session_id: string;
  item_id: string;
  fly_machine_id: string;
  fly_app_name: string;
  lab_url: string;
  started_at: string; // ISO 8601
  expires_at: string; // ISO 8601
  stopped_at: string | null;
  status: LabStatus;
}

interface LabLaunchOptions {
  itemId: string;
  image: string;
  port?: number;
  timeoutMinutes?: number;
  // Fallback URL for sandbox mode (the item's official url)
  fallbackUrl?: string;
}

const FLY_API_TOKEN = process.env.FLY_API_TOKEN ?? "";
const FLY_APP_NAME = process.env.FLY_APP_NAME ?? "";
const FLY_API_BASE = "https://api.machines.dev/v1";

export function isFlyConfigured(): boolean {
  return Boolean(FLY_API_TOKEN && FLY_APP_NAME);
}

// ------------------------------------------------------------
// Sandbox store (in-memory, persists across hot reloads via globalThis).
// ------------------------------------------------------------
const SANDBOX_KEY = "__lvxpaths_lab_store__";
interface SandboxLabRow {
  session_id: string;
  item_id: string;
  fly_machine_id: string;
  fly_app_name: string;
  lab_url: string;
  started_at: string;
  expires_at: string;
  stopped_at: string | null;
  status: LabStatus;
}
function getSandboxStore(): SandboxLabRow[] {
  if (typeof globalThis !== "undefined") {
    const g = globalThis as unknown as { [SANDBOX_KEY]?: SandboxLabRow[] };
    if (!g[SANDBOX_KEY]) g[SANDBOX_KEY] = [];
    return g[SANDBOX_KEY]!;
  }
  return [];
}

// ------------------------------------------------------------
// Launch a lab (or return the existing session if one is running).
// ------------------------------------------------------------
export async function launchLab(
  sessionId: string,
  opts: LabLaunchOptions
): Promise<LabSession> {
  // Check for an existing running session for this session_id + item_id.
  const existing = await findRunningLab(sessionId, opts.itemId);
  if (existing) return existing;

  const timeoutMinutes = opts.timeoutMinutes ?? 120;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + timeoutMinutes * 60 * 1000);

  if (!isFlyConfigured()) {
    // Sandbox — simulate the launch.
    const fakeMachineId = `sandbox_${Math.random().toString(36).slice(2, 10)}`;
    const labUrl = opts.fallbackUrl ?? `https://lab-${fakeMachineId}.sandbox.lvxpaths.dev`;
    const row: SandboxLabRow = {
      session_id: sessionId,
      item_id: opts.itemId,
      fly_machine_id: fakeMachineId,
      fly_app_name: "sandbox",
      lab_url: labUrl,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      stopped_at: null,
      status: "running",
    };
    getSandboxStore().push(row);
    return toLabSession(row);
  }

  // Production — call fly.io Machines API.
  const machineId = await flyCreateMachine(opts.image, opts.port ?? 3000);
  // Poll until started (max ~30s).
  let status: LabStatus = "starting";
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    status = await flyGetMachineStatus(machineId);
    if (status === "running" || status === "failed") break;
  }
  if (status !== "running") {
    return {
      session_id: sessionId,
      item_id: opts.itemId,
      fly_machine_id: machineId,
      fly_app_name: FLY_APP_NAME,
      lab_url: "",
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      stopped_at: null,
      status: "failed",
    };
  }

  // Construct the public URL. fly.io exposes each machine as
  // <machine-id>.fly.dev for web services, or via fly proxy for SSH.
  const labUrl =
    opts.image.includes("ssh") || opts.image.includes("vnc")
      ? `ssh lvxpaths@${machineId}.fly.dev -p 22`
      : `https://${machineId}.fly.dev`;

  const row: SandboxLabRow = {
    session_id: sessionId,
    item_id: opts.itemId,
    fly_machine_id: machineId,
    fly_app_name: FLY_APP_NAME,
    lab_url: labUrl,
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    stopped_at: null,
    status: "running",
  };
  getSandboxStore().push(row);
  return toLabSession(row);
}

// ------------------------------------------------------------
// Find a running lab for a given session + item.
// ------------------------------------------------------------
export async function findRunningLab(
  sessionId: string,
  itemId: string
): Promise<LabSession | null> {
  const store = getSandboxStore();
  const now = Date.now();
  for (let i = store.length - 1; i >= 0; i--) {
    const row = store[i];
    if (row.session_id !== sessionId || row.item_id !== itemId) continue;
    if (row.status === "running" && Date.parse(row.expires_at) > now) {
      return toLabSession(row);
    }
    // Expired — mark it.
    if (row.status === "running" && Date.parse(row.expires_at) <= now) {
      row.status = "expired";
      row.stopped_at = new Date().toISOString();
    }
  }
  return null;
}

// ------------------------------------------------------------
// Stop a lab.
// ------------------------------------------------------------
export async function stopLab(
  sessionId: string,
  itemId: string
): Promise<LabSession | null> {
  const store = getSandboxStore();
  for (let i = store.length - 1; i >= 0; i--) {
    const row = store[i];
    if (row.session_id !== sessionId || row.item_id !== itemId) continue;
    if (row.status === "running" || row.status === "starting") {
      row.status = "stopped";
      row.stopped_at = new Date().toISOString();
      // In production, also call fly.io to stop the machine.
      if (isFlyConfigured() && row.fly_machine_id) {
        await flyStopMachine(row.fly_machine_id).catch(() => {});
      }
      return toLabSession(row);
    }
    return toLabSession(row);
  }
  return null;
}

// ------------------------------------------------------------
// fly.io Machines API wrappers (production only).
// ------------------------------------------------------------
async function flyCreateMachine(image: string, port: number): Promise<string> {
  const res = await fetch(`${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FLY_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      config: {
        image,
        services: [
          {
            internal_port: port,
            protocol: "tcp",
            force_instance_healthy: true,
          },
        ],
        auto_stop: true,
        auto_destroy: false,
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "<no body>");
    throw new Error(`fly.io create failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("fly.io create: no machine id in response");
  return data.id;
}

async function flyGetMachineStatus(machineId: string): Promise<LabStatus> {
  const res = await fetch(
    `${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines/${machineId}`,
    {
      headers: { Authorization: `Bearer ${FLY_API_TOKEN}` },
    }
  );
  if (!res.ok) return "failed";
  const data = (await res.json()) as { status?: string };
  switch (data.status) {
    case "starting":
      return "starting";
    case "started":
    case "running":
      return "running";
    case "stopped":
    case "destroyed":
      return "stopped";
    default:
      return "starting";
  }
}

async function flyStopMachine(machineId: string): Promise<void> {
  const res = await fetch(
    `${FLY_API_BASE}/apps/${FLY_APP_NAME}/machines/${machineId}/stop`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${FLY_API_TOKEN}` },
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "<no body>");
    throw new Error(`fly.io stop failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
  }
}

// ------------------------------------------------------------
// Helper — convert a sandbox row to the public LabSession shape.
// ------------------------------------------------------------
function toLabSession(row: SandboxLabRow): LabSession {
  return { ...row };
}
