// src/pages/AdminBranchCalendarCRUD.jsx
// ✅ Calendrier hebdomadaire par salle + CRUD (Créer / Éditer / Supprimer)
// ✅ Filtres Femmes / Enfants / Gratuit / Payant
// ✅ Résumés hebdo (Femmes / Enfants / Gratuites) + modale listant ces sessions
// ✅ Sélecteur de salle + navigation semaine précédente/suivante + bouton "Cette semaine"
// ✅ Bouton "Voir toutes les sessions" (liste complète de la salle, avec recherche + filtres + Éditer/Supprimer)
// ✅ 0 dépendance dayjs (tout au Date natif)

import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";

/* -------------------- Utils Date -------------------- */
const SHORT_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const startOfWeekMonday = (base = new Date(), weekOffset = 0) => {
  const d = new Date(base);
  const day = d.getDay(); // 0..6 -> Dim..Sam
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diffToMonday + weekOffset * 7);
  return d;
};

const getWeekDays = (weekOffset = 0) => {
  const monday = startOfWeekMonday(new Date(), weekOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
};

const sameYMD = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const asYmd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fmtDayMonth = (d) =>
  d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

const fmtFullDate = (iso) =>
  new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));

const fmtTime = (iso) =>
  new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

/** Convert "YYYY-MM-DDTHH:mm" (from <input type="datetime-local">) to "YYYY-MM-DD HH:mm:00" for Laravel */
const toBackendDate = (localDateTime) => {
  if (!localDateTime) return "";
  const [d, t] = localDateTime.split("T");
  if (!d || !t) return localDateTime;
  return `${d} ${t}:00`;
};

/** For prefilling datetime-local from ISO */
const toLocalDatetimeInput = (iso) => {
  if (!iso) return "";
  const dt = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const mm = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const mi = pad(dt.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

/* -------------------- UI bits -------------------- */
function Badge({ type, children }) {
  const classes = {
    women: "bg-pink-500/15 text-pink-500 border-pink-500/30",
    kids: "bg-indigo-500/15 text-indigo-400 border-indigo-400/30",
    free: "bg-emerald-500/15 text-emerald-400 border-emerald-400/30",
    paid: "bg-amber-500/15 text-amber-400 border-amber-400/30",
  };
  return (
    <span className={`inline-block text-xs px-2 py-1 rounded border ${classes[type]}`}>
      {children}
    </span>
  );
}

function StatusDot({ color = "#10B981", title = "Actif" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-gray-500">{title}</span>
    </span>
  );
}

/* -------------------- Modale “sessions spéciales” (Femmes/Enfants/Gratuites de la semaine) -------------------- */
function SpecialSessionsModal({ open, onClose, title, sessions }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0B0B0B] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold">Sessions {title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">✕</button>
        </div>

        {sessions?.length ? (
          <div className="mt-4 space-y-3 max-h-[60vh] overflow-auto pr-1">
            {sessions.map((s) => (
              <div key={s.id} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-[#0B0B0B]">
                <div className="font-semibold">{s.title}</div>
                <div className="text-xs text-gray-500">
                  {fmtFullDate(s.session_date)} • {fmtTime(s.session_date)} • {s.duration} min
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  👤 {s.coach?.name || "N/A"} • 📘 {s.course?.name || "Sans cours"}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.is_for_women && <Badge type="women">Femmes</Badge>}
                  {s.is_for_kids && <Badge type="kids">Enfants</Badge>}
                  {s.is_free && <Badge type="free">Gratuit</Badge>}
                  {!s.is_free && !s.is_for_women && !s.is_for_kids && <Badge type="paid">Payant</Badge>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 text-center text-gray-500">Aucune session</div>
        )}
      </div>
    </div>
  );
}

/* -------------------- Modale Form (Create/Edit) -------------------- */
function SessionFormModal({
  open,
  onClose,
  onSaved,
  initial,        // si présent => édition
  branches,
}) {
  const isEdit = !!initial?.id;

  const [coaches, setCoaches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    branch_id: "",
    coach_id: "",
    course_id: "",
    title: "",
    session_date: "", // "YYYY-MM-DDTHH:mm"
    duration: 60,
    max_participants: "",
    is_for_women: false,
    is_for_kids: false,
    is_free: false,
  });

  useEffect(() => {
    if (!open) return;

    setError("");
    setSaving(false);

    if (isEdit) {
      setForm({
        branch_id: String(initial?.branch_id ?? initial?.branch?.id ?? ""),
        coach_id: String(initial?.coach_id ?? initial?.coach?.id ?? ""),
        course_id: String(initial?.course_id ?? initial?.course?.id ?? ""),
        title: initial?.title ?? "",
        session_date: toLocalDatetimeInput(initial?.session_date),
        duration: initial?.duration ?? 60,
        max_participants: initial?.max_participants ?? "",
        is_for_women: !!initial?.is_for_women,
        is_for_kids: !!initial?.is_for_kids,
        is_free: !!initial?.is_free,
      });
    } else {
      setForm({
        branch_id: branches[0] ? String(branches[0].id) : "",
        coach_id: "",
        course_id: "",
        title: "",
        session_date: "",
        duration: 60,
        max_participants: "",
        is_for_women: false,
        is_for_kids: false,
        is_free: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Charger coaches + courses quand branch change
  useEffect(() => {
    const load = async (branchId) => {
      if (!branchId) {
        setCoaches([]); setCourses([]); return;
      }
      try {
        const { data } = await api.get(`/branches/${branchId}/coaches`);
        setCoaches(Array.isArray(data?.data) ? data.data : data || []);
      } catch { setCoaches([]); }

      try {
        // Option : /courses?branch_id=...
        const { data } = await api.get("/courses", { params: { branch_id: branchId } });
        setCourses(Array.isArray(data?.data) ? data.data : data || []);
      } catch {
        try {
          const { data: all } = await api.get("/courses");
          setCourses(Array.isArray(all?.data) ? all.data : all || []);
        } catch { setCourses([]); }
      }
    };

    if (open && form.branch_id) load(form.branch_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.branch_id, open]);

  const handleChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const toLocalMinForDatetime = () => {
    const dt = new Date(Date.now() + 5 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = dt.getFullYear();
    const mm = pad(dt.getMonth() + 1);
    const dd = pad(dt.getDate());
    const hh = pad(dt.getHours());
    const mi = pad(dt.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        branch_id: Number(form.branch_id),
        coach_id: Number(form.coach_id),
        course_id: Number(form.course_id),
        title: (form.title || "").trim(),
        session_date: toBackendDate(form.session_date),
        duration: Number(form.duration),
        max_participants: form.max_participants ? Number(form.max_participants) : null,
        is_for_women: !!form.is_for_women,
        is_for_kids: !!form.is_for_kids,
        is_free: !!form.is_free,
      };

      if (!payload.branch_id || !payload.coach_id || !payload.course_id || !payload.title || !form.session_date) {
        setSaving(false);
        return setError("Veuillez remplir tous les champs requis.");
      }
      if (payload.duration < 15) {
        setSaving(false);
        return setError("La durée doit être ≥ 15 minutes.");
      }

      if (isEdit) {
        await api.put(`/group-training-sessions/${initial.id}`, payload);
      } else {
        await api.post(`/group-training-sessions`, payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      const msg =
        e?.response?.data?.message ||
        (isEdit ? "Échec de la mise à jour." : "Échec de la création.");
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0B0B0B] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-xl font-bold">{isEdit ? "Modifier la session" : "Nouvelle session"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">✕</button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Salle */}
          <div>
            <label className="block text-sm font-medium mb-1">Salle *</label>
            <select
              className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
              value={form.branch_id}
              onChange={(e) => handleChange("branch_id", e.target.value)}
              disabled={isEdit} // optionnel: verrouiller la salle en édition
            >
              <option value="">— Sélectionner —</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Coach */}
          <div>
            <label className="block text-sm font-medium mb-1">Coach *</label>
            <select
              className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
              value={form.coach_id}
              onChange={(e) => handleChange("coach_id", e.target.value)}
              disabled={!form.branch_id}
            >
              <option value="">{form.branch_id ? "— Sélectionner —" : "Choisissez la salle"}</option>
              {coaches.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Cours */}
          <div>
            <label className="block text-sm font-medium mb-1">Cours *</label>
            <select
              className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
              value={form.course_id}
              onChange={(e) => handleChange("course_id", e.target.value)}
              disabled={!form.branch_id}
            >
              <option value="">{form.branch_id ? "— Sélectionner —" : "Choisissez la salle"}</option>
              {courses.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-sm font-medium mb-1">Titre *</label>
            <input
              className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Yoga Flow"
            />
          </div>

          {/* Date/Heure */}
          <div>
            <label className="block text-sm font-medium mb-1">Date & Heure *</label>
            <input
              type="datetime-local"
              className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
              value={form.session_date}
              onChange={(e) => handleChange("session_date", e.target.value)}
              min={toLocalMinForDatetime()}
            />
          </div>

          {/* Durée */}
          <div>
            <label className="block text-sm font-medium mb-1">Durée (min) *</label>
            <input
              type="number"
              className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
              value={form.duration}
              min={15}
              max={480}
              onChange={(e) => handleChange("duration", e.target.value)}
            />
          </div>

          {/* Max participants */}
          <div>
            <label className="block text-sm font-medium mb-1">Participants max (optionnel)</label>
            <input
              type="number"
              className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
              value={form.max_participants}
              min={1}
              onChange={(e) => handleChange("max_participants", e.target.value)}
              placeholder="laisser vide pour illimité"
            />
          </div>

          {/* Flags */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Options</label>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_for_women}
                  onChange={(e) => handleChange("is_for_women", e.target.checked)}
                />
                <span>Session Femmes</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_for_kids}
                  onChange={(e) => handleChange("is_for_kids", e.target.checked)}
                />
                <span>Session Enfants</span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_free}
                  onChange={(e) => handleChange("is_free", e.target.checked)}
                />
                <span>Gratuite</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: "#FF3B30", opacity: saving ? 0.8 : 1 }}
          >
            {saving ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Modale "Voir toutes les sessions" (liste complète de la salle) -------------------- */
function AllSessionsModal({
  open,
  onClose,
  branchId,
  branches,
  onEdit,
  onDelete,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [allSessions, setAllSessions] = useState([]);

  // filters
  const [fWomen, setFWomen] = useState(false);
  const [fKids,  setFKids]  = useState(false);
  const [fFree,  setFFree]  = useState(false);
  const [fPaid,  setFPaid]  = useState(false);
  const [q, setQ]           = useState(""); // recherche titre/coach/cours

  useEffect(() => {
    if (!open || !branchId) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/branches/${branchId}/sessions`);
        const arr = Array.isArray(data?.data) ? data.data : data || [];
        arr.sort((a, b) => new Date(a.session_date) - new Date(b.session_date));
        setAllSessions(arr);
      } catch (e) {
        console.error(e);
        setError("Échec du chargement des sessions.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, branchId]);

  const filtered = useMemo(() => {
    let arr = [...allSessions];

    // search
    if (q.trim()) {
      const needle = q.toLowerCase();
      arr = arr.filter((s) => {
        const t = (s.title || "").toLowerCase();
        const coach = (s.coach?.name || "").toLowerCase();
        const course = (s.course?.name || "").toLowerCase();
        return t.includes(needle) || coach.includes(needle) || course.includes(needle);
      });
    }

    // badge filters
    const want = fWomen || fKids || fFree || fPaid;
    if (want) {
      arr = arr.filter((s) => {
        const isWomen = !!s.is_for_women;
        const isKids  = !!s.is_for_kids;
        const isFree  = !!s.is_free;
        const isPaid  = !isFree && !isWomen && !isKids;
        return (
          (fWomen && isWomen) ||
          (fKids  && isKids)  ||
          (fFree  && isFree)  ||
          (fPaid  && isPaid)
        );
      });
    }

    // final sort
    arr.sort((a, b) => new Date(a.session_date) - new Date(b.session_date));
    return arr;
  }, [allSessions, q, fWomen, fKids, fFree, fPaid]);

  const branchName = useMemo(() => {
    const b = branches.find((x) => String(x.id) === String(branchId));
    return b?.name || `Salle #${branchId}`;
  }, [branches, branchId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-5xl bg-white dark:bg-[#0B0B0B] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Toutes les sessions – {branchName}</h2>
            <p className="text-xs text-gray-500">Liste complète (hors vue hebdomadaire)</p>
          </div>
        <button onClick={onClose} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">✕</button>
        </div>

        {/* Toolbar */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
          <input
            className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
            placeholder="Rechercher par titre / coach / cours…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="lg:col-span-2 flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer">
              <input type="checkbox" checked={fWomen} onChange={(e) => setFWomen(e.target.checked)} />
              Femmes
            </label>
            <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer">
              <input type="checkbox" checked={fKids} onChange={(e) => setFKids(e.target.checked)} />
              Enfants
            </label>
            <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer">
              <input type="checkbox" checked={fFree} onChange={(e) => setFFree(e.target.checked)} />
              Gratuit
            </label>
            <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer">
              <input type="checkbox" checked={fPaid} onChange={(e) => setFPaid(e.target.checked)} />
              Payant
            </label>
            {(fWomen || fKids || fFree || fPaid) && (
              <button
                className="ml-2 text-sm text-gray-600 hover:text-black"
                onClick={() => { setFWomen(false); setFKids(false); setFFree(false); setFPaid(false); }}
              >
                Effacer
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>
        ) : loading ? (
          <div className="py-12 text-center text-gray-500">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-500">Aucune session</div>
        ) : (
          <div className="mt-4 max-h-[65vh] overflow-auto space-y-3 pr-1">
            {filtered.map((s) => {
              const isPast = new Date(s.session_date) < new Date();
              const participants = s.current_participants ?? s.users_count ?? 0;
              return (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0B0B0B]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{s.title}</div>
                      <div className="text-xs text-gray-500">
                        {fmtFullDate(s.session_date)} • {fmtTime(s.session_date)} • {s.duration} min
                      </div>
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        👤 {s.coach?.name || "N/A"} • 📘 {s.course?.name || "Sans cours"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.is_for_women && <Badge type="women">Femmes</Badge>}
                        {s.is_for_kids && <Badge type="kids">Enfants</Badge>}
                        {s.is_free && <Badge type="free">Gratuit</Badge>}
                        {!s.is_free && !s.is_for_women && !s.is_for_kids && <Badge type="paid">Payant</Badge>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusDot color={isPast ? "#9CA3AF" : "#10B981"} title={isPast ? "Passée" : "À venir"} />
                      <div className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">
                        Participants: {participants}{s.max_participants ? ` / ${s.max_participants}` : " / ∞"}
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm"
                          onClick={() => onEdit(s)}
                        >
                          Éditer
                        </button>
                        <button
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:opacity-90 text-sm"
                          onClick={() => onDelete(s)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------- Page principale -------------------- */
export default function AdminBranchCalendarCRUD() {
  // Data
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [sessions, setSessions] = useState([]);

  // Loading / error
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState("");

  // Week nav
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const weekStartYmd = asYmd(weekDays[0]);
  const weekEndYmd = asYmd(weekDays[6]);

  // Filters (hebdo)
  const [fWomen, setFWomen] = useState(false);
  const [fKids, setFKids] = useState(false);
  const [fFree, setFFree] = useState(false);
  const [fPaid, setFPaid] = useState(false);

  // Modales
  const [specialModalOpen, setSpecialModalOpen] = useState(false);
  const [specialTitle, setSpecialTitle] = useState("");
  const [specialList, setSpecialList] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState(null); // null => create

  // "Voir toutes les sessions"
  const [allModalOpen, setAllModalOpen] = useState(false);

  // Load branches
  useEffect(() => {
    (async () => {
      try {
        setLoadingBranches(true);
        const { data } = await api.get("/branches");
        const arr = Array.isArray(data?.data) ? data.data : data;
        setBranches(arr || []);
        if (arr?.length) setSelectedBranch(String(arr[0].id));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingBranches(false);
      }
    })();
  }, []);

  // Load sessions for branch + week (client-side week filter)
  const fetchSessions = async (branchId) => {
    setLoadingSessions(true);
    setError("");
    try {
      const { data } = await api.get(`/branches/${branchId}/sessions`);
      const arr = Array.isArray(data?.data) ? data.data : data || [];
      const byWeek = arr.filter((s) => {
        const ymd = asYmd(new Date(s.session_date));
        return ymd >= weekStartYmd && ymd <= weekEndYmd;
      });
      byWeek.sort((a, b) => new Date(a.session_date) - new Date(b.session_date));
      setSessions(byWeek);
    } catch (e) {
      console.error(e);
      setError("Échec du chargement des sessions.");
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (selectedBranch) fetchSessions(selectedBranch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, weekStartYmd, weekEndYmd]);

  // Filters application (hebdo)
  const wantFilters = fWomen || fKids || fFree || fPaid;
  const filteredSessions = useMemo(() => {
    if (!wantFilters) return sessions;
    return sessions.filter((s) => {
      const isWomen = !!s.is_for_women;
      const isKids = !!s.is_for_kids;
      const isFree = !!s.is_free;
      const isPaid = !isFree && !isWomen && !isKids;
      return (
        (fWomen && isWomen) || (fKids && isKids) || (fFree && isFree) || (fPaid && isPaid)
      );
    });
  }, [sessions, wantFilters, fWomen, fKids, fFree, fPaid]);

  // Grouper par jour (hebdo)
  const sessionsByDay = useMemo(() => {
    const map = new Map();
    for (const s of filteredSessions) {
      const ymd = asYmd(new Date(s.session_date));
      if (!map.has(ymd)) map.set(ymd, []);
      map.get(ymd).push(s);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.session_date) - new Date(b.session_date));
    }
    return map;
  }, [filteredSessions]);

  // Compteurs cartes (hebdo)
  const counts = useMemo(() => {
    let women = 0, kids = 0, free = 0;
    for (const s of sessions) {
      if (s.is_for_women) women++;
      if (s.is_for_kids) kids++;
      if (s.is_free) free++;
    }
    return { women, kids, free };
  }, [sessions]);

  const openSpecialModal = (kind) => {
    let title = "";
    let list = [];
    if (kind === "Femmes") {
      title = "Femmes";
      list = sessions.filter((s) => s.is_for_women);
    } else if (kind === "Enfants") {
      title = "Enfants";
      list = sessions.filter((s) => s.is_for_kids);
    } else if (kind === "Gratuites") {
      title = "Gratuites";
      list = sessions.filter((s) => s.is_free);
    }
    setSpecialTitle(title);
    setSpecialList(list);
    setSpecialModalOpen(true);
  };

  // CRUD actions
  const onCreate = () => { setFormInitial(null); setFormOpen(true); };
  const onEdit = (s) => { setFormInitial(s); setFormOpen(true); };
  const onDelete = async (s) => {
    const ok = window.confirm(`Supprimer la session « ${s.title} » ?`);
    if (!ok) return;
    try {
      await api.delete(`/group-training-sessions/${s.id}`);
      await fetchSessions(selectedBranch);
      alert("Session supprimée.");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Échec de la suppression.");
    }
  };
  const onSaved = () => fetchSessions(selectedBranch);

  // Chip renderer (carte de session dans la grille hebdo)
  const renderChip = (s) => {
    const isWomen = !!s.is_for_women;
    const isKids  = !!s.is_for_kids;
    const isFree  = !!s.is_free;
    const isPast  = new Date(s.session_date) < new Date();
    const participants = s.current_participants ?? s.users_count ?? 0;

    return (
      <div
        key={s.id}
        className={[
          "rounded-lg border px-3 py-2 bg-white dark:bg-[#0B0B0B] relative group",
          isWomen ? "border-pink-500/40 bg-pink-500/5" : "",
          isKids  ? "border-indigo-400/40 bg-indigo-400/5" : "",
          isFree  ? "border-emerald-400/40 bg-emerald-400/5" : "",
          !isFree && !isWomen && !isKids ? "border-amber-400/40 bg-amber-400/5" : "",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold text-sm">{s.title}</div>
          <div className="text-xs font-bold text-brand-500">{fmtTime(s.session_date)}</div>
        </div>
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
          👤 {s.coach?.name || "N/A"} • 📘 {s.course?.name || "Sans cours"}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {isWomen && <Badge type="women">Femmes</Badge>}
          {isKids  && <Badge type="kids">Enfants</Badge>}
          {isFree  && <Badge type="free">Gratuit</Badge>}
          {!isFree && !isWomen && !isKids && <Badge type="paid">Payant</Badge>}
        </div>

        {/* Actions (visibles sous la chip) */}
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <button
            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800"
            onClick={() => onEdit(s)}
          >
            Éditer
          </button>
          <button
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:opacity-90"
            onClick={() => onDelete(s)}
          >
            Supprimer
          </button>
          <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
            <StatusDot color={isPast ? "#9CA3AF" : "#10B981"} title={isPast ? "Passée" : "À venir"} />
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
            Participants: {participants}{s.max_participants ? ` / ${s.max_participants}` : " / ∞"}
          </span>
        </div>
      </div>
    );
  };

  const today = new Date();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Calendrier & Sessions (Admin)</h1>
          <p className="text-sm text-gray-500">Gérez les sessions par salle, semaine par semaine.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onCreate}
            className="px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: "#FF3B30" }}
          >
            + Nouvelle session
          </button>
          <button
            onClick={() => selectedBranch && setAllModalOpen(true)}
            className="px-3 py-2 rounded-lg border bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
            title="Voir toutes les sessions de la salle sélectionnée"
          >
            Voir toutes les sessions
          </button>
          <button
            onClick={() => selectedBranch && fetchSessions(selectedBranch)}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800"
          >
            Rafraîchir
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Sélecteur salle */}
        <div>
          <label className="block text-sm font-medium mb-1">Salle</label>
          <select
            className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            disabled={loadingBranches}
          >
            {loadingBranches ? (
              <option>Chargement…</option>
            ) : branches.length ? (
              branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))
            ) : (
              <option>Aucune salle</option>
            )}
          </select>
        </div>

        {/* Navigation semaine */}
        <div className="flex items-end gap-2">
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((p) => p - 1)}
              className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800"
              title="Semaine précédente"
            >
              ◀
            </button>
            <div className="px-3 py-2 text-sm rounded-lg border bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700">
              Semaine du {fmtDayMonth(weekDays[0])}
            </div>
            <button
              onClick={() => setWeekOffset((p) => p + 1)}
              className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800"
              title="Semaine suivante"
            >
              ▶
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-2 rounded-lg text-white hover:opacity-90"
              style={{ backgroundColor: "#FF3B30" }}
              title="Revenir à la semaine courante"
            >
              Cette semaine
            </button>
          </div>
        </div>

        {/* Filtres hebdo */}
        <div>
          <label className="block text-sm font-medium mb-1">Filtres</label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer">
              <input type="checkbox" checked={fWomen} onChange={(e) => setFWomen(e.target.checked)} />
              <span>Femmes</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer">
              <input type="checkbox" checked={fKids} onChange={(e) => setFKids(e.target.checked)} />
              <span>Enfants</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer">
              <input type="checkbox" checked={fFree} onChange={(e) => setFFree(e.target.checked)} />
              <span>Gratuit</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer">
              <input type="checkbox" checked={fPaid} onChange={(e) => setFPaid(e.target.checked)} />
              <span>Payant</span>
            </label>
            {(fWomen || fKids || fFree || fPaid) && (
              <button
                className="ml-2 text-sm text-gray-600 hover:text-black"
                onClick={() => { setFWomen(false); setFKids(false); setFFree(false); setFPaid(false); }}
              >
                Effacer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Résumé cartes (hebdo) */}
      <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          className="rounded-xl border p-4 text-left bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/15"
          onClick={() => openSpecialModal("Femmes")}
        >
          <div className="font-bold">👩 Femmes</div>
          <div className="text-sm text-gray-600">{counts.women} session(s) cette semaine</div>
        </button>
        <button
          className="rounded-xl border p-4 text-left bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/15"
          onClick={() => openSpecialModal("Enfants")}
        >
          <div className="font-bold">🧒 Enfants</div>
          <div className="text-sm text-gray-600">{counts.kids} session(s) cette semaine</div>
        </button>
        <button
          className="rounded-xl border p-4 text-left bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15"
          onClick={() => openSpecialModal("Gratuites")}
        >
          <div className="font-bold">🎁 Gratuites</div>
          <div className="text-sm text-gray-600">{counts.free} session(s) cette semaine</div>
        </button>
      </div>

      {/* Calendrier hebdo */}
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>
      ) : loadingSessions ? (
        <div className="py-16 text-center text-gray-500">Chargement du calendrier…</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7 gap-4">
              {weekDays.map((date, idx) => {
                const isToday = sameYMD(date, today);
                const ymd = asYmd(date);
                const daySessions = (new Map(sessionsByDay)).get(ymd) || [];
                const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;

                return (
                  <div
                    key={idx}
                    className={[
                      "rounded-xl border p-3",
                      isToday ? "border-brand-400 shadow-[0_0_0_2px_rgba(255,59,48,0.15)]" : "border-gray-200 dark:border-gray-800",
                      "bg-white dark:bg-[#0B0B0B]",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "rounded-lg px-3 py-2 mb-3 text-center",
                        isToday ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-800",
                      ].join(" ")}
                    >
                      <div className="text-sm font-bold">{SHORT_DAYS[dayIndex]}</div>
                      <div className="text-xs">
                        {String(date.getDate()).padStart(2, "0")}/{String(date.getMonth() + 1).padStart(2, "0")}
                      </div>
                    </div>

                    {daySessions.length ? (
                      <div className="space-y-3">
                        {daySessions.map((s) => (
                          <div key={s.id}>{renderChip(s)}</div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400 py-8">
                        <div className="text-2xl">🗓️</div>
                        <div className="text-xs mt-1">Pas de session</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modales */}
      <SpecialSessionsModal
        open={specialModalOpen}
        onClose={() => setSpecialModalOpen(false)}
        title={specialTitle}
        sessions={specialList}
      />

      <SessionFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={onSaved}
        initial={formInitial}
        branches={branches}
      />

      <AllSessionsModal
        open={allModalOpen}
        onClose={() => setAllModalOpen(false)}
        branchId={selectedBranch}
        branches={branches}
        onEdit={(s) => { setFormInitial(s); setFormOpen(true); }}
        onDelete={async (s) => {
          const ok = window.confirm(`Supprimer la session « ${s.title} » ?`);
          if (!ok) return;
          try {
            await api.delete(`/group-training-sessions/${s.id}`);
            await fetchSessions(selectedBranch); // garde la vue hebdo en phase
          } catch (e) {
            console.error(e);
            alert(e?.response?.data?.message || "Échec de la suppression.");
          }
        }}
      />
    </div>
  );
}
