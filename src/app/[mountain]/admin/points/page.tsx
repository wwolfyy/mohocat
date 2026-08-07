'use client';

import { useState, useEffect } from 'react';
import { getPointService, getCatService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { triggerPublicRevalidate } from '@/lib/revalidate-client';
import type { Point, Cat, LabelSide } from '@/types';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PointMapPicker from '@/components/admin/PointMapPicker';
import { adminStrings } from '@/constants/adminStrings';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import { useMountain } from '@/components/MountainProvider';

// 'auto' is the form-only sentinel for "no override" (stored as an absent key).
type SideChoice = 'auto' | LabelSide;

interface PointFormData {
  title: string;
  description: string;
  x: number | null;
  y: number | null;
  labelMobile: SideChoice;
  labelDesktop: SideChoice;
}

const emptyForm: PointFormData = {
  title: '',
  description: '',
  x: null,
  y: null,
  labelMobile: 'auto',
  labelDesktop: 'auto',
};

const S = adminStrings.points;

/** Summarize a point's label overrides for the list (e.g. "모바일: 위"). */
function labelSummary(labelSide: Point['labelSide']): string {
  const sideText = (v?: LabelSide) =>
    v === 'above' ? S.form.labelAbove : v === 'below' ? S.form.labelBelow : null;
  const parts: string[] = [];
  const m = sideText(labelSide?.mobile);
  const d = sideText(labelSide?.desktop);
  if (m) parts.push(`${S.form.labelSideMobile}: ${m}`);
  if (d) parts.push(`${S.form.labelSideDesktop}: ${d}`);
  return parts.length > 0 ? parts.join(' · ') : S.table.autoBadge;
}

/** Build the `labelSide` payload from the two selects — omit auto keys entirely. */
function buildLabelSide(mobile: SideChoice, desktop: SideChoice): Point['labelSide'] | undefined {
  const side: { mobile?: LabelSide; desktop?: LabelSide } = {};
  if (mobile !== 'auto') side.mobile = mobile;
  if (desktop !== 'auto') side.desktop = desktop;
  return Object.keys(side).length > 0 ? side : undefined;
}

export default function PointsCMSPage() {
  const mountainId = useMountain();
  const pointService = getPointService(mountainId);
  const catService = getCatService(mountainId);
  const { user } = useAuth();

  const [points, setPoints] = useState<Point[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingPoint, setEditingPoint] = useState<Point | null>(null);
  const [formData, setFormData] = useState<PointFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Delete flow: a point pending confirmation, plus the cats blocking it (if any).
  const [deleteTarget, setDeleteTarget] = useState<Point | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [pointsData, catsData] = await Promise.all([
        pointService.getAllPoints(),
        catService.getAllCats(),
      ]);
      setPoints(pointsData);
      setCats(catsData);
    } catch (err: any) {
      setError(S.errors.loadFailed(err.message));
    } finally {
      setLoading(false);
    }
  };

  /** Cats whose dwelling / prev_dwelling references this point. */
  const referencingCats = (pointId: string): Cat[] =>
    cats.filter((c) => c.dwelling === pointId || c.prev_dwelling === pointId);

  const handleNew = () => {
    setEditingPoint(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const handleEdit = (point: Point) => {
    setEditingPoint(point);
    setFormData({
      title: point.title || '',
      description: point.description || '',
      x: point.x,
      y: point.y,
      labelMobile: point.labelSide?.mobile ?? 'auto',
      labelDesktop: point.labelSide?.desktop ?? 'auto',
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPoint(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError(S.errors.noTitle);
      return;
    }
    if (formData.x === null || formData.y === null) {
      setError(S.errors.noPosition);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const labelSide = buildLabelSide(formData.labelMobile, formData.labelDesktop);
      // Omit `labelSide` from the payload when there is no override — writing
      // `undefined` to Firestore is rejected, and an absent field is the
      // "automatic edge-flip" contract the map expects.
      const payload: Omit<Point, 'id'> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        x: formData.x,
        y: formData.y,
        ...(labelSide ? { labelSide } : {}),
      };

      if (editingPoint) {
        await pointService.updatePoint(editingPoint.id, payload);
        setPoints((prev) =>
          prev.map((p) => (p.id === editingPoint.id ? { ...p, ...payload, labelSide } : p))
        );
      } else {
        const created = await pointService.createPoint(payload);
        setPoints((prev) => [...prev, created]);
      }

      // Refresh the baked map page (`/`) so the edit reflects immediately —
      // /api/revalidate revalidates the public surfaces (see route).
      await triggerPublicRevalidate(user);

      handleCancel();
    } catch (err: any) {
      setError(S.errors.saveFailed(err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (point: Point) => {
    // Blocked while any cat still lives here — the modal shows why; this is a
    // guard against silently orphaning cat→point links.
    if (referencingCats(point.id).length > 0) return;
    try {
      setError(null);
      await pointService.deletePoint(point.id);
      setPoints((prev) => prev.filter((p) => p.id !== point.id));
      setDeleteTarget(null);
      await triggerPublicRevalidate(user);
    } catch (err: any) {
      setError(S.errors.deleteFailed(err.message));
      setDeleteTarget(null);
    }
  };

  const blockingCats = deleteTarget ? referencingCats(deleteTarget.id) : [];

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{S.title}</h1>
          <p className="text-gray-600">{S.subtitle}</p>
        </div>
        <Button onClick={handleNew} className="gap-2 shrink-0">
          <FiPlus /> {S.addNew}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">{adminStrings.common.loading}</p>
      ) : points.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          {S.table.empty}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">{S.table.titleCol}</th>
                <th className="px-4 py-3 font-medium">{S.table.position}</th>
                <th className="px-4 py-3 font-medium">{S.table.labelSide}</th>
                <th className="px-4 py-3 font-medium text-right">{S.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {points.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                  <td className="px-4 py-3 text-gray-600">{S.picker.coords(p.x, p.y)}</td>
                  <td className="px-4 py-3 text-gray-600">{labelSummary(p.labelSide)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(p)}
                        className="p-2 text-gray-500 hover:text-brand-600 hover:bg-gray-100 rounded-lg"
                        title={adminStrings.common.edit}
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg"
                        title={adminStrings.common.delete}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit form modal. On the shared shell (design.md §Modal) rather than
          a hand-rolled one: the width override is deliberate — the map picker needs
          more than the shell's widest preset (`xl` = max-w-2xl). */}
      {showForm && (
        <Modal
          isOpen
          onClose={handleCancel}
          title={editingPoint ? S.form.editTitle : S.form.addTitle}
          className="max-w-3xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {S.form.titleLabel} *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                placeholder={S.form.titlePlaceholder}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {S.form.description}
              </label>
              <textarea
                value={formData.description}
                placeholder={S.form.descriptionPlaceholder}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {S.picker.label} *
              </label>
              <PointMapPicker
                points={points}
                editingId={editingPoint?.id}
                value={
                  formData.x !== null && formData.y !== null
                    ? { x: formData.x, y: formData.y }
                    : null
                }
                onChange={({ x, y }) => setFormData((f) => ({ ...f, x, y }))}
              />
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 mb-1">
                {S.form.labelSideHeading}
              </p>
              <p className="text-xs text-gray-500 mb-2">{S.form.labelSideHint}</p>
              <div className="grid grid-cols-2 gap-4">
                <LabelSideSelect
                  label={S.form.labelSideMobile}
                  value={formData.labelMobile}
                  onChange={(v) => setFormData({ ...formData, labelMobile: v })}
                />
                <LabelSideSelect
                  label={S.form.labelSideDesktop}
                  value={formData.labelDesktop}
                  onChange={(v) => setFormData({ ...formData, labelDesktop: v })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={handleCancel} disabled={saving}>
                {adminStrings.common.cancel}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? adminStrings.common.saving : S.form.save}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirmation / blocked modal. NOT `useDialog.confirm()`: this is a
          destructive action, which design.md §Modal requires keep its red button,
          and the blocked branch is a one-button notice the promise API cannot
          express. Both keep their own buttons on the shared shell. */}
      {deleteTarget && (
        <Modal
          isOpen
          onClose={() => setDeleteTarget(null)}
          title={blockingCats.length > 0 ? S.delete.blockedTitle : S.delete.title}
        >
          {blockingCats.length > 0 ? (
            <>
              <p className="text-gray-600 mb-6">
                {S.delete.blockedBody(blockingCats.map((c) => c.name).join(', '))}
              </p>
              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                  {adminStrings.common.confirm}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-6">{S.delete.body}</p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                  {adminStrings.common.cancel}
                </Button>
                <Button variant="danger" onClick={() => handleDelete(deleteTarget)}>
                  {S.delete.confirm}
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

/** 자동 / 위 / 아래 select for one device's label side. */
function LabelSideSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: SideChoice;
  onChange: (v: SideChoice) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SideChoice)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
      >
        <option value="auto">{S.form.labelAuto}</option>
        <option value="above">{S.form.labelAbove}</option>
        <option value="below">{S.form.labelBelow}</option>
      </select>
    </div>
  );
}
