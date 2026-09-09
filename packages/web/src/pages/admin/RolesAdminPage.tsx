import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Shield, Plus, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { toast } from '@/components/ui/toast-store'
import { api, unwrap } from '@/lib/api'

interface Permission {
  id: string
  code: string
  module: string
  action: string
  description: string | null
}

interface RolePermissions {
  role: string
  label: string
  isSystem: boolean
  permissions: string[]
}

const MODULE_LABELS: Record<string, string> = {
  tickets: 'Tickets',
  changes: 'Mudanças',
  problems: 'Problemas',
  approvals: 'Aprovações',
  admin: 'Administração',
  knowledge: 'Base de Conhecimento',
  reports: 'Relatórios',
  '*': 'Acesso Total',
}

export default function RolesAdminPage() {
  const { t } = useTranslation()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<RolePermissions[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string>('ADMIN')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleLabel, setNewRoleLabel] = useState('')
  const [editLabel, setEditLabel] = useState('')

  const selectedRoleData = useMemo(
    () => roles.find((r) => r.role === selectedRole),
    [roles, selectedRole],
  )

  useEffect(() => {
    async function load() {
      try {
        const [permsRes, rolesRes] = await Promise.all([
          api.get<{ data: Permission[] }>('/admin/roles/permissions'),
          api.get<{ data: RolePermissions[] }>('/admin/roles'),
        ])
        setPermissions(unwrap(permsRes))
        setRoles(unwrap(rolesRes))
      } catch {
        toast.error(t('admin.loadError'))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [t])

  useEffect(() => {
    setChecked(new Set(selectedRoleData?.permissions ?? []))
  }, [selectedRole, selectedRoleData])

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>()
    for (const p of permissions) {
      if (!map.has(p.module)) map.set(p.module, [])
      map.get(p.module)!.push(p)
    }
    return map
  }, [permissions])

  const toggle = (code: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const toggleModule = (_module: string, codes: string[]) => {
    setChecked((prev) => {
      const next = new Set(prev)
      const allChecked = codes.every((c) => next.has(c))
      for (const c of codes) {
        if (allChecked) next.delete(c)
        else next.add(c)
      }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/admin/roles/${selectedRole}/permissions`, {
        permissions: Array.from(checked),
      })
      setRoles((prev) =>
        prev.map((r) => (r.role === selectedRole ? { ...r, permissions: Array.from(checked) } : r)),
      )
      toast.success(t('admin.saved'))
    } catch {
      toast.error(t('admin.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleCreateRole = async () => {
    if (!newRoleName.trim() || !newRoleLabel.trim()) {
      toast.error(t('admin.fillAllFields'))
      return
    }
    try {
      const res = await api.post('/admin/roles', {
        name: newRoleName.trim(),
        label: newRoleLabel.trim(),
      })
      const created = unwrap<{ id: string; name: string; label: string }>(res)
      setRoles((prev) => [
        ...prev,
        { role: created.id, label: created.label, isSystem: false, permissions: [] },
      ])
      setSelectedRole(created.id)
      setShowCreateModal(false)
      setNewRoleName('')
      setNewRoleLabel('')
      toast.success(t('admin.roleCreated'))
    } catch {
      toast.error(t('admin.roleCreateError'))
    }
  }

  const handleEditLabel = async () => {
    if (!editLabel.trim()) {
      toast.error(t('admin.fillAllFields'))
      return
    }
    try {
      await api.put(`/admin/roles/${selectedRole}`, { label: editLabel.trim() })
      setRoles((prev) =>
        prev.map((r) => (r.role === selectedRole ? { ...r, label: editLabel.trim() } : r)),
      )
      setShowEditModal(false)
      toast.success(t('admin.saved'))
    } catch {
      toast.error(t('admin.saveError'))
    }
  }

  const handleDeleteRole = async (role: string) => {
    if (!window.confirm(t('admin.confirmDeleteRole'))) return
    try {
      await api.delete(`/admin/roles/${role}`)
      setRoles((prev) => prev.filter((r) => r.role !== role))
      if (selectedRole === role) {
        setSelectedRole(roles[0]?.role ?? 'ADMIN')
      }
      toast.success(t('admin.roleDeleted'))
    } catch {
      toast.error(t('admin.roleDeleteError'))
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
            {t('nav.roles')}
          </h2>
          <p className="text-sm text-bodystroke">Gerencie as roles e permissões do sistema.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} size="sm">
          <Plus className="size-4" />
          {t('admin.newRole')}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <div key={r.role} className="flex items-center gap-1">
            <Button
              variant={selectedRole === r.role ? 'primary' : 'secondary'}
              onClick={() => setSelectedRole(r.role)}
            >
              <Shield className="size-4" />
              {r.label}
              <Badge tone="neutral" className="ml-1">
                {r.permissions.length}
              </Badge>
            </Button>
            {!r.isSystem && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditLabel(r.label)
                    setSelectedRole(r.role)
                    setShowEditModal(true)
                  }}
                >
                  <Pencil className="size-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void handleDeleteRole(r.role)}>
                  <Trash2 className="size-3 text-red-500" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>

      <Card bodyClassName="flex flex-col gap-4">
        {Array.from(grouped.entries()).map(([module, perms]) => {
          const allChecked = perms.every((p) => checked.has(p.code))
          const someChecked = perms.some((p) => checked.has(p.code))
          return (
            <div key={module} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked && !allChecked
                  }}
                  onChange={() =>
                    toggleModule(
                      module,
                      perms.map((p) => p.code),
                    )
                  }
                  className="size-4 rounded border-bodystroke text-primary focus:ring-primary"
                />
                <span className="text-sm font-semibold text-graydark dark:text-white">
                  {MODULE_LABELS[module] ?? module}
                </span>
              </div>
              <div className="ml-7 flex flex-wrap gap-2">
                {perms.map((p) => (
                  <label
                    key={p.code}
                    className="inline-flex items-center gap-2 rounded-lg border border-stroke px-3 py-1.5 text-sm transition-colors hover:border-primary dark:border-strobedark dark:hover:border-primary"
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(p.code)}
                      onChange={() => toggle(p.code)}
                      className="size-3.5 rounded border-bodystroke text-primary focus:ring-primary"
                    />
                    <span className="text-body dark:text-bodydark">{p.description ?? p.code}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        })}

        <div className="flex justify-end border-t border-stroke pt-4 dark:border-strobedark">
          <Button onClick={() => void handleSave()} loading={saving}>
            {t('common.save')}
          </Button>
        </div>
      </Card>

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('admin.newRole')}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-graydark dark:text-white">
              {t('admin.roleName')}
            </label>
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Ex: SUPPLIER"
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-graydark focus:border-primary dark:border-strobedark dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-graydark dark:text-white">
              {t('admin.roleLabel')}
            </label>
            <input
              type="text"
              value={newRoleLabel}
              onChange={(e) => setNewRoleLabel(e.target.value)}
              placeholder="Ex: Fornecedor"
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-graydark focus:border-primary dark:border-strobedark dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleCreateRole()}>{t('common.create')}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('admin.editRoleLabel')}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-graydark dark:text-white">
              {t('admin.roleLabel')}
            </label>
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm text-graydark focus:border-primary dark:border-strobedark dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleEditLabel()}>{t('common.save')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
