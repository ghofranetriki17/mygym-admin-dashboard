// src/pages/AdminBookings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { adminBookingsAPI } from "../services/api";
import api, { branchesAPI } from "../services/api";

// Helpers formats
const fmtDateTime = (iso) =>
  iso
    ? new Intl.DateTimeFormat("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    : "—";

const fmtDate = (iso) =>
  iso
    ? new Intl.DateTimeFormat("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(iso))
    : "";

// Simple Badge
function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300",
    brand:
      "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-300",
    green:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
    pink:
      "border-pink-300 bg-pink-50 text-pink-600 dark:border-pink-800 dark:bg-pink-900/20 dark:text-pink-300",
    indigo:
      "border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300",
    amber:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
  };
  return (
    <span className={`inline-flex items-center text-xs px-2 py-1 rounded border ${tones[tone]}`}>
      {children}
    </span>
  );
}

// Modal générique
function Modal({ open, onClose, title, children, maxWidth = "max-w-2xl" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={`relative w-full ${maxWidth} bg-white dark:bg-[#0B0B0B] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6`}
      >
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Détails utilisateur
function UserDetailsModal({ open, onClose, user }) {
  return (
    <Modal open={open} onClose={onClose} title="Détails utilisateur">
      {!user ? (
        <div className="text-gray-500">Aucun utilisateur sélectionné.</div>
      ) : (
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-xs text-gray-500">Nom</div>
            <div className="font-medium">{user.name || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Email</div>
            <div className="font-medium">{user.email || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Téléphone</div>
            <div className="font-medium">{user.phone || "—"}</div>
          </div>
          {user.role && (
            <div>
              <div className="text-xs text-gray-500">Rôle</div>
              <Badge tone={user.role === "admin" ? "brand" : "gray"}>{user.role}</Badge>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function AdminBookings() {
  // Filtres
  const [branchId, setBranchId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [coachId, setCoachId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [q, setQ] = useState("");

  const [isWomen, setIsWomen] = useState(false);
  const [isKids, setIsKids] = useState(false);
  const [isFree, setIsFree] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Data filtres sources
  const [branches, setBranches] = useState([]);
  const [branchSessions, setBranchSessions] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [courses, setCourses] = useState([]);

  // Bookings grouped
  const [groups, setGroups] = useState([]); // [{ branch, totals, sessions: [{ session, totals, bookings: [{booking_id, booked_at, user:{...}}]}]}]
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // User modal
  const [openUser, setOpenUser] = useState(false);
  const [userSel, setUserSel] = useState(null);

  // Load branches at mount
  useEffect(() => {
    (async () => {
      try {
        const resp = await branchesAPI.list();
        const arr = Array.isArray(resp?.data) ? resp.data : resp || [];
        setBranches(arr);
        if (arr.length && !branchId) setBranchId(String(arr[0].id));
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load sessions + coaches + courses when branch changes
  useEffect(() => {
    (async () => {
      if (!branchId) {
        setBranchSessions([]); setCoaches([]); setCourses([]);
        return;
      }
      try {
        const { data } = await api.get(`/branches/${branchId}/sessions`);
        const sessions = Array.isArray(data?.data) ? data.data : data || [];
        setBranchSessions(sessions);
      } catch (e) {
        console.error(e); setBranchSessions([]);
      }

      try {
        const { data } = await api.get(`/branches/${branchId}/coaches`);
        setCoaches(Array.isArray(data?.data) ? data.data : data || []);
      } catch (e) {
        console.error(e); setCoaches([]);
      }

      try {
        const { data } = await api.get(`/courses`, { params: { branch_id: branchId } });
        setCourses(Array.isArray(data?.data) ? data.data : data || []);
      } catch (e) {
        // fallback tous les cours
        try {
          const { data: all } = await api.get(`/courses`);
          setCourses(Array.isArray(all?.data) ? all.data : all || []);
        } catch (_e) {
          setCourses([]);
        }
      }
    })();
  }, [branchId]);

  const clearFilters = () => {
    setSessionId("");
    setCoachId("");
    setCourseId("");
    setIsWomen(false);
    setIsKids(false);
    setIsFree(false);
    setDateFrom("");
    setDateTo("");
    setQ("");
  };

  const fetchData = async () => {
    setLoading(true);
    setErr("");
    try {
      const params = {
        branch_id: branchId || undefined,
        session_id: sessionId || undefined,
        coach_id: coachId || undefined,
        course_id: courseId || undefined,
        is_for_women: isWomen ? true : undefined,
        is_for_kids: isKids ? true : undefined,
        is_free: isFree ? true : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        q: q || undefined,
      };
      const data = await adminBookingsAPI.list(params);
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr("Échec du chargement des réservations.");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  // Récupérer automatiquement à chaque changement de branche (utile)
  useEffect(() => {
    if (branchId) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const totalBookings = useMemo(
    () => groups.reduce((sum, b) => sum + (b?.totals?.bookings || 0), 0),
    [groups]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Réservations (Admin)</h1>
          <p className="text-gray-500">Liste groupée par salle puis par session, avec filtres.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="px-3 py-2 rounded-lg text-white"
            style={{ backgroundColor: "#FF3B30" }}
          >
            Rechercher
          </button>
          <button
            onClick={clearFilters}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800"
          >
            Effacer filtres
          </button>
        </div>
      </div>

      {/* Toolbar filtres */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Salle</label>
          <select
            className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">Toutes</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Session</label>
          <select
            className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            disabled={!branchId}
          >
            <option value="">Toutes</option>
            {branchSessions.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.title} — {fmtDateTime(s.session_date)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Coach</label>
          <select
            className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
            value={coachId}
            onChange={(e) => setCoachId(e.target.value)}
            disabled={!branchId}
          >
            <option value="">Tous</option>
            {coaches.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Cours</label>
          <select
            className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            disabled={!branchId}
          >
            <option value="">Tous</option>
            {courses.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 col-span-1 lg:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer">
            <input type="checkbox" checked={isWomen} onChange={(e) => setIsWomen(e.target.checked)} />
            <span>Femmes</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer">
            <input type="checkbox" checked={isKids} onChange={(e) => setIsKids(e.target.checked)} />
            <span>Enfants</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border cursor-pointer">
            <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
            <span>Gratuit</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Du</label>
            <input
              type="date"
              className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Au</label>
            <input
              type="date"
              className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Recherche (nom/email/téléphone)</label>
          <input
            className="w-full rounded-lg border p-2 bg-white dark:bg-[#0B0B0B] border-gray-300 dark:border-gray-700"
            placeholder="Tapez pour filtrer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Erreur */}
      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>
      ) : null}

      {/* Résumé */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Total réservations: <span className="font-semibold">{totalBookings}</span>
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800"
        >
          Rafraîchir
        </button>
      </div>

      {/* Liste groupée */}
      {loading ? (
        <div className="py-16 text-center text-gray-500">Chargement des réservations…</div>
      ) : groups.length === 0 ? (
        <div className="py-12 text-center text-gray-500">Aucun résultat.</div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.branch.id} className="rounded-2xl border border-gray-200 dark:border-gray-800">
              {/* Branch header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-lg">{g.branch.name}</div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge tone="brand">{g?.totals?.sessions ?? 0} session(s)</Badge>
                    <Badge tone="green">{g?.totals?.bookings ?? 0} réservation(s)</Badge>
                  </div>
                </div>
              </div>

              {/* Sessions */}
              <div className="p-4 space-y-4">
                {g.sessions.map((s) => (
                  <div key={s.session.id} className="rounded-xl border border-gray-200 dark:border-gray-800">
                    <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0B0B0B] rounded-t-xl">
                      <div className="space-y-1">
                        <div className="font-semibold">{s.session.title}</div>
                        <div className="text-xs text-gray-500">
                          {fmtDateTime(s.session.session_date)} • {s.session.duration} min
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {s.session.is_for_women && <Badge tone="pink">Femmes</Badge>}
                          {s.session.is_for_kids && <Badge tone="indigo">Enfants</Badge>}
                          {s.session.is_free && <Badge tone="green">Gratuit</Badge>}
                          {!s.session.is_free && !s.session.is_for_women && !s.session.is_for_kids && (
                            <Badge tone="amber">Payant</Badge>
                          )}
                          {s.session.coach?.name && <Badge>{`👤 ${s.session.coach.name}`}</Badge>}
                          {s.session.course?.name && <Badge>{`📘 ${s.session.course.name}`}</Badge>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          <span className="font-semibold">{s.totals.bookings}</span> /{" "}
                          {s.session.max_participants ?? "∞"} places
                        </div>
                      </div>
                    </div>

                    {/* Bookings table */}
                    <div className="p-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800/60">
                          <tr className="text-left">
                            <th className="px-4 py-2">Utilisateur</th>
                            <th className="px-4 py-2">Email</th>
                            <th className="px-4 py-2">Téléphone</th>
                            <th className="px-4 py-2">Réservé le</th>
                            <th className="px-4 py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.bookings.length === 0 ? (
                            <tr>
                              <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                                Aucune réservation
                              </td>
                            </tr>
                          ) : (
                            s.bookings.map((b) => (
                              <tr key={b.booking_id} className="border-t border-gray-100 dark:border-gray-800">
                                <td className="px-4 py-2">{b.user.name || "—"}</td>
                                <td className="px-4 py-2">{b.user.email || "—"}</td>
                                <td className="px-4 py-2">{b.user.phone || "—"}</td>
                                <td className="px-4 py-2">{fmtDateTime(b.booked_at)}</td>
                                <td className="px-4 py-2">
                                  <div className="flex gap-2">
                                    <button
                                      className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800"
                                      onClick={() => {
                                        setUserSel({ ...b.user });
                                        setOpenUser(true);
                                      }}
                                    >
                                      Voir
                                    </button>
                                    {/* Bouton d'annulation admin à brancher si tu ajoutes l'endpoint DELETE /admin/bookings/{booking_id}
                                    <button
                                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:opacity-90"
                                      onClick={() => cancelBooking(b.booking_id)}
                                    >
                                      Annuler
                                    </button> */}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale utilisateur */}
      <UserDetailsModal open={openUser} onClose={() => setOpenUser(false)} user={userSel} />
    </div>
  );
}
