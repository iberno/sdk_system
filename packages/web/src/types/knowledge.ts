export interface KnowledgeArticle {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  published: boolean
  author: { id: string; name: string; email: string } | null
  createdAt: string
  updatedAt: string
}