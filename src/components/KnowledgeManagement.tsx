
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import KnowledgeArticleForm from '@/components/KnowledgeArticleForm';
import KnowledgeArticleTable from '@/components/KnowledgeArticleTable';
import { useKnowledgeManagement } from '@/hooks/useKnowledgeManagement';

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_active: boolean;
}

const KnowledgeManagement: React.FC = () => {
  const { user } = useAuth();
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    articles,
    isLoading,
    createArticle,
    updateArticle,
    toggleArticleStatus,
    deleteArticle
  } = useKnowledgeManagement();

  const handleSubmit = async (title: string, content: string) => {
    if (editingArticle) {
      return await updateArticle(editingArticle.id, title, content);
    } else {
      return await createArticle(title, content);
    }
  };

  const handleEdit = (article: KnowledgeArticle) => {
    setEditingArticle(article);
    setIsDialogOpen(true);
  };

  const handleCancel = () => {
    setEditingArticle(null);
    setIsDialogOpen(false);
  };

  if (user?.role !== 'super_admin') {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600">You don't have permission to manage the knowledge base.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base Management</h1>
          <p className="text-gray-600">Manage organizational knowledge articles</p>
        </div>
        <KnowledgeArticleForm
          editingArticle={editingArticle}
          isDialogOpen={isDialogOpen}
          setIsDialogOpen={setIsDialogOpen}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge Articles ({articles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <KnowledgeArticleTable
            articles={articles}
            onEdit={handleEdit}
            onToggleStatus={toggleArticleStatus}
            onDelete={deleteArticle}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeManagement;
