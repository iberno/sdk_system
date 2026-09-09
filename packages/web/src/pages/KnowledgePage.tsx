import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, Eye, Pencil, Plus, Search, Send, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/toast-store'
import {
  useCreateArticle,
  useDeleteArticle,
  useKnowledgeArticles,
  usePublishArticle,
  useUpdateArticle,
} from '@/hooks/useKnowledge'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { KnowledgeArticle } from '@/types/knowledge'

const CATEGORY_SUGGESTIONS = ['GENERAL', 'Guia', 'Infraestrutura', 'Recuperação', 'SOLUÇÃO']

interface ArticleForm {
  title: string
  category: string
  tags: string
  content: string
}

const emptyForm = (): ArticleForm => ({
  title: '',
  category: 'GENERAL',
  tags: '',
  content: '',
})

const parseTags = (raw: string) =>
  raw
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))

export default function KnowledgePage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const isTeam = user?.role !== 'USER'

  const [tab, setTab] = useState<'published' | 'drafts'>('published')
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError, refetch } = useKnowledgeArticles({
    page,
    pageSize: 9,
    ...(tab === 'drafts' ? { draft: true } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(category ? { category } : {}),
  })

  const createArticle = useCreateArticle()
  const updateArticle = useUpdateArticle()
  const publishArticle = usePublishArticle()
  const deleteArticle = useDeleteArticle()

  const [viewing, setViewing] = useState<KnowledgeArticle | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<KnowledgeArticle | null>(null)
  const [form, setForm] = useState<ArticleForm>(emptyForm())
  const [preview, setPreview] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [deleting, setDeleting] = useState<KnowledgeArticle | null>(null)
  const [saving, setSaving] = useState(false)

  const categoryOptions = useMemo(() => {
    const fromData = new Set((data?.items ?? []).map((a) => a.category))
    return Array.from(new Set([...CATEGORY_SUGGESTIONS, ...fromData])).sort()
  }, [data])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setPreview(false)
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (article: KnowledgeArticle) => {
    setEditing(article)
    setForm({
      title: article.title,
      category: article.category,
      tags: article.tags.join(', '),
      content: article.content,
    })
    setPreview(false)
    setFormErrors({})
    setModalOpen(true)
  }

  const submit = async () => {
    const errors: Record<string, string> = {}
    if (form.title.trim().length < 3) errors.title = t('tickets.createError')
    if (form.content.trim().length < 3) errors.content = t('tickets.createError')
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category.trim() || 'GENERAL',
        tags: parseTags(form.tags),
      }
      if (editing) {
        await updateArticle.mutateAsync({ id: editing.id, ...payload })
        toast.success(t('knowledge.articleUpdated'))
      } else {
        await createArticle.mutateAsync(payload)
        toast.success(t('knowledge.articleCreated'))
      }
      setModalOpen(false)
      setViewing(null)
      if (tab === 'drafts' || !editing) setTab('drafts')
    } catch {
      toast.error(t('admin.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const doPublish = async (article: KnowledgeArticle) => {
    try {
      await publishArticle.mutateAsync(article.id)
      toast.success(t('knowledge.published'))
      setViewing(null)
      setTab('published')
    } catch {
      toast.error(t('admin.saveError'))
    }
  }

  const doDelete = async () => {
    if (!deleting) return
    try {
      await deleteArticle.mutateAsync(deleting.id)
      toast.success(t('knowledge.deleted'))
      setDeleting(null)
      setViewing(null)
    } catch {
      toast.error(t('admin.saveError'))
    }
  }

  const pagination = data?.pagination

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-graydark dark:text-white">
            {t('nav.knowledge')}
          </h1>
          <p className="text-sm text-bodystroke">{t('knowledge.subtitle')}</p>
        </div>
        {isTeam && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            {t('knowledge.newArticle')}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-stroke bg-white p-1.5 dark:border-strokedark dark:bg-boxdark">
        <button
          type="button"
          onClick={() => {
            setTab('published')
            setPage(1)
          }}
          className={cn(
            'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
            tab === 'published'
              ? 'bg-primary text-white shadow-card'
              : 'text-bodystroke hover:bg-graylight hover:text-body dark:text-bodydark dark:hover:bg-boxdark-2',
          )}
        >
          {t('knowledge.published')}
        </button>
        {isTeam && (
          <button
            type="button"
            onClick={() => {
              setTab('drafts')
              setPage(1)
            }}
            className={cn(
              'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              tab === 'drafts'
                ? 'bg-primary text-white shadow-card'
                : 'text-bodystroke hover:bg-graylight hover:text-body dark:text-bodydark dark:hover:bg-boxdark-2',
            )}
          >
            {t('knowledge.drafts')}
          </button>
        )}
      </div>

      <Card bodyClassName="p-0">
        <div className="grid grid-cols-1 gap-3 border-b border-stroke p-4 dark:border-strokedark sm:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-bodystroke" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder={t('knowledge.searchPlaceholder')}
              className="pl-10"
            />
          </div>
          <Select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value)
              setPage(1)
            }}
          >
            <option value="">
              {t('common.all')} · {t('knowledge.category')}
            </option>
            {categoryOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>

        {isError ? (
          <div className="p-4">
            <EmptyState
              icon={<BookOpen className="size-6 text-error" />}
              title={t('common.error')}
              description={t('tickets.loadError')}
              action={
                <Button variant="secondary" onClick={() => void refetch()}>
                  {t('common.retry')}
                </Button>
              }
            />
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (data?.items ?? []).length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<BookOpen className="size-6 text-bodystroke" />}
              title={t('common.empty')}
              description={t('knowledge.emptyDescription')}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {(data?.items ?? []).map((article) => (
              <button
                key={article.id}
                type="button"
                onClick={() => setViewing(article)}
                className="flex flex-col gap-2 rounded-xl border border-stroke bg-white p-4 text-left transition-colors hover:border-primary dark:border-strokedark dark:bg-boxdark-2 dark:hover:border-primary"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="primary">{article.category}</Badge>
                  {!article.published && <Badge tone="warning">{t('knowledge.draft')}</Badge>}
                </div>
                <h3 className="text-sm font-semibold leading-snug text-graydark dark:text-white">
                  {article.title}
                </h3>
                <p className="line-clamp-3 text-sm text-body dark:text-bodydark">
                  {article.content}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                  {article.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-graylight px-1.5 py-0.5 text-[11px] text-bodystroke dark:bg-boxdark-3"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-bodystroke">
                  <span>{article.author?.name ?? '—'}</span>
                  <span>{formatDate(article.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-stroke p-4 dark:border-strokedark">
          {isLoading ? (
            <Skeleton className="h-8 w-56" />
          ) : (
            <Pagination
              page={page}
              totalPages={pagination?.totalPages ?? 1}
              totalItems={pagination?.totalItems ?? 0}
              onChange={setPage}
              onPreviousLabel={t('common.previous')}
              onNextLabel={t('common.next')}
              infoLabel={t('tickets.pageOf')}
            />
          )}
        </div>
      </Card>

      {/* Detail / preview modal */}
      <Modal
        open={Boolean(viewing)}
        title={viewing?.title}
        onClose={() => setViewing(null)}
        size="lg"
        footer={
          viewing && isTeam ? (
            <>
              <Button variant="danger" onClick={() => setDeleting(viewing)}>
                <Trash2 className="size-4" />
                {t('common.delete')}
              </Button>
              {!viewing.published && (
                <Button
                  variant="secondary"
                  onClick={() => void doPublish(viewing)}
                  loading={publishArticle.isPending}
                >
                  <Send className="size-4" />
                  {t('knowledge.publish')}
                </Button>
              )}
              <Button onClick={() => openEdit(viewing)}>
                <Pencil className="size-4" />
                {t('common.edit')}
              </Button>
            </>
          ) : undefined
        }
      >
        {viewing && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="primary">{viewing.category}</Badge>
              {viewing.published ? (
                <Badge tone="success">{t('knowledge.published')}</Badge>
              ) : (
                <Badge tone="warning">{t('knowledge.draft')}</Badge>
              )}
              <span className="ml-auto text-xs text-bodystroke">
                {t('knowledge.byAuthor', { name: viewing.author?.name ?? '—' })} ·{' '}
                {formatDate(viewing.updatedAt)}
              </span>
            </div>
            {viewing.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {viewing.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-graylight px-2 py-0.5 text-xs text-bodystroke dark:bg-boxdark-3"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <div className="whitespace-pre-wrap rounded-lg bg-graylight p-4 text-sm leading-relaxed text-body dark:bg-boxdark-3 dark:text-bodydark">
              {viewing.content}
            </div>
          </div>
        )}
      </Modal>

      {/* Create / edit modal */}
      <Modal
        open={modalOpen}
        title={editing ? t('knowledge.editArticle') : t('knowledge.newArticle')}
        onClose={() => setModalOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void submit()} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label={t('knowledge.title')} required error={formErrors.title}>
            <Input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              maxLength={200}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('knowledge.category')}>
              <Input
                list="kb-categories"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              />
              <datalist id="kb-categories">
                {CATEGORY_SUGGESTIONS.map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </FormField>

            <FormField label={t('knowledge.tags')} hint={t('knowledge.tagsHint')}>
              <Input
                value={form.tags}
                onChange={(event) => setForm({ ...form, tags: event.target.value })}
                placeholder="rede, vpn, senha"
              />
            </FormField>
          </div>

          <FormField label={t('knowledge.content')} required error={formErrors.content}>
            <div className="flex gap-2">
              <Button
                variant={preview ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setPreview(false)}
              >
                <Pencil className="size-3.5" />
                {t('knowledge.write')}
              </Button>
              <Button
                variant={preview ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setPreview(true)}
              >
                <Eye className="size-3.5" />
                {t('knowledge.preview')}
              </Button>
            </div>
          </FormField>

          {preview ? (
            <div className="min-h-48 whitespace-pre-wrap rounded-lg border border-stroke bg-graylight p-4 text-sm leading-relaxed text-body dark:border-strokedark dark:bg-boxdark-3 dark:text-bodydark">
              {form.content || t('knowledge.previewEmpty')}
            </div>
          ) : (
            <Textarea
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              rows={10}
            />
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('knowledge.deleteTitle')}
        message={t('knowledge.deleteConfirm', { title: deleting?.title ?? '' })}
        loading={deleteArticle.isPending}
        onConfirm={() => void doDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
