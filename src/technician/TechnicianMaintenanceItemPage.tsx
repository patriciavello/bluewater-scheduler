import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";



function getAuthHeaders(): Record<string, string> {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("adminToken") ||
    sessionStorage.getItem("authToken");

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

interface MaintenanceItem {
  id: string;
  title: string;
  description: string;
  problemDescription?: string;
  status: string;
  priority: string;
  classification?: string;
  boatId?: string;
  boatName?: string;
  requestedBy?: string;
  assignedTo?: string;
  technicianFirstName?: string;
  technicianLastName?: string;
  createdAt?: string;
  updatedAt?: string;
  scheduledStartDate?: string;
  scheduledEndDate?: string;
  requiredFixDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  completedAt?: string;
  supervisorNote?: string;
  completionNote?: string;
  notes?: string;
}

interface Update {
  id: string;
  updateType: string;
  message?: string;
  createdAt: string;
  authorRole?: string;
  authorFirstName?: string;
  authorLastName?: string;
}

interface Attachment {
  id: string;
  filename: string;
  fileName?: string;
  fileUrl?: string;
  attachmentType?: string;
  transcriptText?: string;
  createdAt?: string;
  uploadedAt: string;
}

interface ScheduleRequest {
  id: string;
  requestedStartDate: string;
  requestedEndDate: string;
  justification: string;
  status: string;
  createdAt: string;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  } catch {
    return value;
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  } catch {
    return value;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "OPEN":
      return "#6b7280";
    case "ASSIGNED":
      return "#2563eb";
    case "IN_PROGRESS":
      return "#f59e0b";
    case "WAITING_SUPERVISOR":
      return "#8b5cf6";
    case "DONE_PENDING_REVIEW":
      return "#0ea5e9";
    case "DONE":
      return "#16a34a";
    default:
      return "#374151";
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "HIGH":
      return "#dc2626";
    case "MEDIUM":
      return "#d97706";
    case "LOW":
      return "#16a34a";
    default:
      return "#374151";
  }
}

function getRoleLabel(role: string | null | undefined) {
  if (!role) return "User";
  if (role === "TECHNICIAN") return "Technician";
  if (role === "SUPERVISOR") return "Supervisor";
  if (role === "ADMIN") return "Admin";
  return role;
}

function getUpdateTitle(type: string | null | undefined) {
  switch (type) {
    case "STATUS_CHANGE":
      return "Status update";
    case "NOTE":
      return "Note";
    case "DATE_CHANGE_REQUEST":
      return "Schedule request";
    case "COMPLETE":
      return "Completion";
    default:
      return type || "Update";
  }
}

function getRoleColor(role: string | null | undefined) {
  switch (role) {
    case "TECHNICIAN":
      return {
        background: "#eff6ff",
        border: "#93c5fd",
        label: "#1d4ed8",
      };
    case "SUPERVISOR":
      return {
        background: "#f5f3ff",
        border: "#c4b5fd",
        label: "#6d28d9",
      };
    case "ADMIN":
      return {
        background: "#ecfdf5",
        border: "#86efac",
        label: "#166534",
      };
    default:
      return {
        background: "#f9fafb",
        border: "#d1d5db",
        label: "#374151",
      };
  }
}

function getEntryColors(entry: any) {
  if (entry.type === "schedule") {
    return {
      background: "#fff7ed",
      border: "#fdba74",
      label: "#c2410c",
    };
  }

  if (entry.type === "attachment") {
    return {
      background: "#f0fdf4",
      border: "#86efac",
      label: "#166534",
    };
  }

  return getRoleColor(entry.raw?.authorRole);
}

export default function TechnicianMaintenanceItemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<MaintenanceItem | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [scheduleRequests, setScheduleRequests] = useState<ScheduleRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [requestedStartDate, setRequestedStartDate] = useState("");
  const [requestedEndDate, setRequestedEndDate] = useState("");
  const [scheduleJustification, setScheduleJustification] = useState("");
  const [savingScheduleRequest, setSavingScheduleRequest] = useState(false);

  const [completionNote, setCompletionNote] = useState("");
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  useEffect(() => {
    loadItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadItem() {
    setLoading(true);
    setPageError("");
    setActionError("");
    setSuccessMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/technician/maintenance/items/${id}`, {
        method: "GET",
        credentials: "include",
        headers: getAuthHeaders(),
      });

      const text = await res.text();
      console.log("technician items raw response:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 120)}`);
      }

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Failed to load maintenance item");
      }

      setItem(data.item || null);
      setUpdates(Array.isArray(data.updates) ? data.updates : []);
      setAttachments(Array.isArray(data.attachments) ? data.attachments : []);
      setScheduleRequests(Array.isArray(data.scheduleRequests) ? data.scheduleRequests : []);
    } catch (err) {
      setPageError((err as Error).message || "Failed to load maintenance item");
    } finally {
      setLoading(false);
    }
  }

  async function startWork() {
    setActionError("");
    setSuccessMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/technician/maintenance/items/${id}/start`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Failed to start work");
      }

      setSuccessMessage("Work started.");
      await loadItem();
    } catch (err) {
      setActionError((err as Error).message || "Failed to start work");
    }
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    setActionError("");
    setSuccessMessage("");

    if (!note.trim()) {
      setActionError("Please enter a note.");
      return;
    }

    try {
      setSavingNote(true);

      const res = await fetch(`${API_BASE}/api/technician/maintenance/items/${id}/note`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          message: note.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Failed to add note");
      }

      setNote("");
      setSuccessMessage("Note added.");
      await loadItem();
    } catch (err) {
      setActionError((err as Error).message || "Failed to add note");
    } finally {
      setSavingNote(false);
    }
  }

  async function submitScheduleRequest(e: React.FormEvent) {
    e.preventDefault();
    setActionError("");
    setSuccessMessage("");

    if (!scheduleJustification.trim()) {
      setActionError("Justification is required.");
      return;
    }

    try {
      setSavingScheduleRequest(true);

      const res = await fetch(
        `${API_BASE}/api/technician/maintenance/items/${id}/request-schedule-change`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            requestedStartDate: requestedStartDate || null,
            requestedEndDate: requestedEndDate || null,
            justification: scheduleJustification.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Failed to request schedule change");
      }

      setRequestedStartDate("");
      setRequestedEndDate("");
      setScheduleJustification("");
      setShowScheduleForm(false);
      setSuccessMessage("Schedule change requested.");
      await loadItem();
    } catch (err) {
      setActionError((err as Error).message || "Failed to request schedule change");
    } finally {
      setSavingScheduleRequest(false);
    }
  }

  async function submitComplete(e: React.FormEvent) {
    e.preventDefault();
    setActionError("");
    setSuccessMessage("");

    try {
      setSavingCompletion(true);

      const res = await fetch(`${API_BASE}/api/technician/maintenance/items/${id}/complete`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          completionNote: completionNote.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Failed to complete item");
      }

      setCompletionNote("");
      setShowCompleteForm(false);
      setSuccessMessage("Item marked complete and sent for review.");
      await loadItem();
    } catch (err) {
      setActionError((err as Error).message || "Failed to complete item");
    } finally {
      setSavingCompletion(false);
    }
  }

  async function uploadPhoto(file: File) {
  setActionError("");
  setSuccessMessage("");

  try {
    setUploadingPhoto(true);

    const formData = new FormData();
    formData.append("photo", file);

    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("adminToken") ||
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("adminToken") ||
      sessionStorage.getItem("authToken");

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/api/technician/maintenance/items/${id}/photo`, {
      method: "POST",
      credentials: "include",
      headers,
      body: formData,
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data?.error || "Failed to upload photo");
    }

    setSuccessMessage("Photo uploaded.");
    await loadItem();
  } catch (err) {
    setActionError((err as Error).message || "Failed to upload photo");
  } finally {
    setUploadingPhoto(false);
  }
}

  const canStart = item?.status === "ASSIGNED";
  const canAddProgress = item?.status !== "DONE";
  const canRequestSchedule = item?.status !== "DONE";
  const canComplete = item?.status === "IN_PROGRESS";

  const timeline = useMemo(() => {
    const updateEvents = updates.map((u) => ({
      id: `update-${u.id}`,
      type: "update",
      createdAt: u.createdAt,
      title: getUpdateTitle(u.updateType),
      subtitle: `${getRoleLabel(u.authorRole)}${
        u.authorFirstName || u.authorLastName
          ? ` • ${[u.authorFirstName, u.authorLastName].filter(Boolean).join(" ")}`
          : ""
      }`,
      message: u.message || "",
      raw: u,
    }));

    const attachmentEvents = attachments.map((a) => ({
      id: `attachment-${a.id}`,
      type: "attachment",
      createdAt: a.createdAt,
      title: a.attachmentType === "AUDIO" ? "Audio attachment" : "Photo attachment",
      subtitle: a.fileName || "Attachment",
      message: a.transcriptText || "",
      raw: a,
    }));

    const scheduleEvents = scheduleRequests.map((s) => ({
      id: `schedule-${s.id}`,
      type: "schedule",
      createdAt: s.createdAt,
      title: "Schedule request",
      subtitle: `Status: ${s.status}`,
      message: s.justification || "",
      raw: s,
    }));

    return [...updateEvents, ...attachmentEvents, ...scheduleEvents].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return aTime - bTime;
    });
  }, [updates, attachments, scheduleRequests]);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.centerBox}>Loading maintenance item...</div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div style={styles.page}>
        <div style={styles.topBar}>
          <button style={styles.secondaryButton} onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
        <div style={styles.errorBox}>{pageError}</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div style={styles.page}>
        <div style={styles.topBar}>
          <button style={styles.secondaryButton} onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
        <div style={styles.centerBox}>Maintenance item not found.</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <button style={styles.secondaryButton} onClick={() => navigate(-1)}>
          Back
        </button>
      </div>

      <div style={styles.card}>
        <div style={styles.headerRow}>
          <h1 style={styles.title}>Maintenance Item</h1>
          <div
            style={{
              ...styles.badge,
              backgroundColor: getStatusColor(item.status),
            }}
          >
            {item.status}
          </div>
        </div>

        <div style={styles.problemText}>{item.problemDescription}</div>

        <div style={styles.metaGrid}>
          <div>
            <div style={styles.label}>Boat</div>
            <div style={styles.value}>{item.boatName || "—"}</div>
          </div>
          <div>
            <div style={styles.label}>Classification</div>
            <div style={styles.value}>{item.classification || "—"}</div>
          </div>
          <div>
            <div style={styles.label}>Priority</div>
            <div style={{ ...styles.value, color: getPriorityColor(item.priority), fontWeight: 700 }}>
              {item.priority || "—"}
            </div>
          </div>
          <div>
            <div style={styles.label}>Technician</div>
            <div style={styles.value}>
              {[item.technicianFirstName, item.technicianLastName].filter(Boolean).join(" ") || "—"}
            </div>
          </div>
          <div>
            <div style={styles.label}>Required Fix Date</div>
            <div style={styles.value}>{formatDate(item.requiredFixDate)}</div>
          </div>
          <div>
            <div style={styles.label}>Scheduled Start</div>
            <div style={styles.value}>{formatDate(item.scheduledStartDate)}</div>
          </div>
          <div>
            <div style={styles.label}>Scheduled End</div>
            <div style={styles.value}>{formatDate(item.scheduledEndDate)}</div>
          </div>
          <div>
            <div style={styles.label}>Actual Start</div>
            <div style={styles.value}>{formatDate(item.actualStartDate)}</div>
          </div>
          <div>
            <div style={styles.label}>Actual End</div>
            <div style={styles.value}>{formatDate(item.actualEndDate)}</div>
          </div>
          <div>
            <div style={styles.label}>Completed At</div>
            <div style={styles.value}>{formatDateTime(item.completedAt)}</div>
          </div>
        </div>

        {item.supervisorNote ? (
          <div style={styles.infoBox}>
            <div style={styles.infoTitle}>Supervisor Note</div>
            <div>{item.supervisorNote}</div>
          </div>
        ) : null}

        {item.completionNote ? (
          <div style={styles.infoBox}>
            <div style={styles.infoTitle}>Completion Note</div>
            <div>{item.completionNote}</div>
          </div>
        ) : null}

        {actionError ? <div style={styles.errorBox}>{actionError}</div> : null}
        {successMessage ? <div style={styles.successBox}>{successMessage}</div> : null}
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Actions</h2>

        <div style={styles.actionsWrap}>
          {canStart && (
            <button style={styles.primaryButton} onClick={startWork}>
              Start Work
            </button>
          )}

          {canRequestSchedule && (
            <button
              style={styles.secondaryButton}
              onClick={() => setShowScheduleForm((v) => !v)}
            >
              {showScheduleForm ? "Cancel Schedule Request" : "Request Date Change"}
            </button>
          )}

          <label
            style={{
              ...styles.secondaryButton,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {uploadingPhoto ? "Uploading..." : "Upload Photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  uploadPhoto(file);
                }
                e.currentTarget.value = "";
              }}
            />
          </label>

          {canComplete && (
            <button
              style={styles.successButton}
              onClick={() => setShowCompleteForm((v) => !v)}
            >
              {showCompleteForm ? "Cancel Complete" : "Complete Item"}
            </button>
          )}
        </div>

        {showScheduleForm && (
          <form onSubmit={submitScheduleRequest} style={styles.formBlock}>
            <h3 style={styles.subTitle}>Request Schedule Change</h3>

            <label style={styles.formLabel}>
              Requested Start Date
              <input
                type="date"
                value={requestedStartDate}
                onChange={(e) => setRequestedStartDate(e.target.value)}
                style={styles.input}
              />
            </label>

            <label style={styles.formLabel}>
              Requested End Date
              <input
                type="date"
                value={requestedEndDate}
                onChange={(e) => setRequestedEndDate(e.target.value)}
                style={styles.input}
              />
            </label>

            <label style={styles.formLabel}>
              Justification
              <textarea
                value={scheduleJustification}
                onChange={(e) => setScheduleJustification(e.target.value)}
                style={styles.textarea}
                rows={4}
                placeholder="Explain why the schedule needs to change"
              />
            </label>

            <button
              type="submit"
              style={styles.primaryButton}
              disabled={savingScheduleRequest}
            >
              {savingScheduleRequest ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        )}
        
        {showCompleteForm && (
          <form onSubmit={submitComplete} style={styles.formBlock}>
            <h3 style={styles.subTitle}>Complete Item</h3>

            <label style={styles.formLabel}>
              Completion Note
              <textarea
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                style={styles.textarea}
                rows={4}
                placeholder="Describe what was done"
              />
            </label>

            <button
              type="submit"
              style={styles.successButton}
              disabled={savingCompletion}
            >
              {savingCompletion ? "Saving..." : "Mark Complete"}
            </button>
          </form>
        )}
      </div>

      {canAddProgress && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Add Note / Comment</h2>
          <div style={styles.noteHelp}>
            Technicians and supervisors can both add dated notes here during the maintenance process.
          </div>

          <form onSubmit={submitNote}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={styles.textarea}
              rows={4}
              placeholder="Add an update, question, answer, or maintenance comment"
            />
            <button type="submit" style={styles.primaryButton} disabled={savingNote}>
              {savingNote ? "Saving..." : "Add Note"}
            </button>
          </form>
        </div>
      )}

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Schedule Requests</h2>

        {scheduleRequests.length === 0 ? (
          <div style={styles.emptyText}>No schedule requests yet.</div>
        ) : (
          <div style={styles.stack}>
            {scheduleRequests.map((req) => (
              <div key={req.id} style={styles.timelineCard}>
                <div style={styles.timelineHeader}>
                  <div style={styles.timelineTitle}>Schedule Request</div>
                  <div style={styles.timelineTime}>{formatDateTime(req.createdAt)}</div>
                </div>
                <div style={styles.timelineText}>
                  <b>Status:</b> {req.status}
                </div>
                <div style={styles.timelineText}>
                  <b>Requested Start:</b> {formatDate(req.requestedStartDate)}
                </div>
                <div style={styles.timelineText}>
                  <b>Requested End:</b> {formatDate(req.requestedEndDate)}
                </div>
                {req.justification ? (
                  <div style={styles.timelineText}>
                    <b>Justification:</b> {req.justification}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Attachments</h2>

        {attachments.length === 0 ? (
          <div style={styles.emptyText}>No attachments yet.</div>
        ) : (
          <div style={styles.stack}>
            {attachments.map((a) => (
              <div key={a.id} style={styles.timelineCard}>
                <div style={styles.timelineHeader}>
                  <div style={styles.timelineTitle}>
                    {a.attachmentType === "AUDIO" ? "Audio" : "Attachment"}
                  </div>
                  <div style={styles.timelineTime}>{formatDateTime(a.createdAt)}</div>
                </div>

                <div style={styles.timelineText}>
                  <b>File:</b> {a.fileName || "Unnamed file"}
                </div>

                {a.fileUrl ? (
                  <div style={styles.timelineText}>
                    <a href={a.fileUrl} target="_blank" rel="noreferrer">
                      Open file
                    </a>
                  </div>
                ) : null}

                {a.transcriptText ? (
                  <div style={styles.transcriptBox}>
                    <div style={styles.infoTitle}>Transcript</div>
                    <div>{a.transcriptText}</div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Timeline / Notes / Comments</h2>

        {timeline.length === 0 ? (
          <div style={styles.emptyText}>No timeline activity yet.</div>
        ) : (
          <div style={styles.stack}>
            {timeline.map((entry) => (
              <div
                key={entry.id}
                style={{
                  ...styles.timelineCard,
                  background: getEntryColors(entry).background,
                  border: `1px solid ${getEntryColors(entry).border}`,
                }}
              >
                <div style={styles.timelineHeader}>
                  <div style={styles.timelineTitle}>{entry.title}</div>
                  <div style={styles.timelineTime}>{formatDateTime(entry.createdAt)}</div>
                </div>

                <div
                  style={{
                    ...styles.timelineSubtitle,
                    color: getEntryColors(entry).label,
                    fontWeight: 700,
                  }}
                >
                  {entry.subtitle}
                </div>

                {entry.type === "schedule" ? (
                  <>
                    <div style={styles.timelineText}>
                      <b>Requested Start:</b>{" "}
                      {formatDate((entry.raw as ScheduleRequest).requestedStartDate)}
                    </div>
                    <div style={styles.timelineText}>
                      <b>Requested End:</b>{" "}
                      {formatDate((entry.raw as ScheduleRequest).requestedEndDate)}
                    </div>
                    {entry.message ? (
                      <div style={styles.timelineText}>{entry.message}</div>
                    ) : null}
                  </>
                ) : entry.type === "attachment" ? (
                  <>
                    {(entry.raw as Attachment).fileUrl ? (
                      <div style={styles.timelineText}>
                        <a href={(entry.raw as Attachment).fileUrl} target="_blank" rel="noreferrer">
                          Open file
                        </a>
                      </div>
                    ) : null}
                    {entry.message ? (
                      <div style={styles.timelineText}>{entry.message}</div>
                    ) : null}
                  </>
                ) : (
                  <div style={styles.timelineText}>{entry.message || "—"}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 900,
    margin: "0 auto",
    padding: 16,
    background: "#f8fafc",
    minHeight: "100vh",
  },
  topBar: {
    display: "flex",
    justifyContent: "flex-start",
    marginBottom: 12,
  },
  card: {
    background: "#ffffff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
  },
  centerBox: {
    background: "#ffffff",
    borderRadius: 14,
    padding: 24,
    textAlign: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.2,
  },
  problemText: {
    fontSize: 20,
    fontWeight: 700,
    marginTop: 16,
    marginBottom: 16,
    color: "#111827",
  },
  badge: {
    color: "#ffffff",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.3,
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 15,
    color: "#111827",
  },
  infoBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    background: "#f3f4f6",
    border: "1px solid #e5e7eb",
  },
  transcriptBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
  },
  infoTitle: {
    fontWeight: 700,
    marginBottom: 6,
    color: "#111827",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 12,
    fontSize: 22,
  },
  subTitle: {
    marginTop: 0,
    marginBottom: 12,
    fontSize: 18,
  },
  actionsWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  formBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid #e5e7eb",
  },
  formLabel: {
    display: "block",
    marginBottom: 12,
    fontWeight: 600,
    color: "#111827",
  },
  input: {
    width: "100%",
    marginTop: 6,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: 16,
    boxSizing: "border-box",
    background: "#fff",
  },
  textarea: {
    width: "100%",
    marginTop: 6,
    marginBottom: 12,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: 16,
    boxSizing: "border-box",
    resize: "vertical",
    background: "#fff",
  },
  primaryButton: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    background: "#ffffff",
    color: "#111827",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },
  successButton: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },
  errorBox: {
    marginTop: 12,
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    padding: 12,
    borderRadius: 10,
  },
  successBox: {
    marginTop: 12,
    background: "#ecfdf5",
    color: "#166534",
    border: "1px solid #bbf7d0",
    padding: 12,
    borderRadius: 10,
  },
  emptyText: {
    color: "#6b7280",
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  timelineCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 14,
    background: "#fff",
  },
  timelineHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 6,
  },
  timelineTitle: {
    fontWeight: 700,
    color: "#111827",
  },
  timelineSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  timelineTime: {
    fontSize: 13,
    color: "#6b7280",
  },
  timelineText: {
    color: "#111827",
    marginTop: 6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  noteHelp: {
  marginBottom: 12,
  color: "#6b7280",
  fontSize: 14,
},
};