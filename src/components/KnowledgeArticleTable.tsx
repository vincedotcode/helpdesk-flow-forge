
import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, FileText } from 'lucide-react';

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_active: boolean;
}

interface KnowledgeArticleTableProps {
  articles: KnowledgeArticle[];
  onEdit: (article: KnowledgeArticle) => void;
  onToggleStatus: (articleId: string, currentStatus: boolean) => void;
  onDelete: (articleId: string) => void;
}

const KnowledgeArticleTable: React.FC<KnowledgeArticleTableProps> = ({
  articles,
  onEdit,
  onToggleStatus,
  onDelete
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {articles.map((article) => (
          <TableRow key={article.id}>
            <TableCell>
              <div>
                <div className="font-medium">{article.title}</div>
                <div className="text-sm text-gray-500 truncate max-w-md">
                  {article.content.substring(0, 100)}...
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge 
                variant={article.is_active ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => onToggleStatus(article.id, article.is_active)}
              >
                {article.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(article.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(article)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(article.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      {articles.length === 0 && (
        <TableBody>
          <TableRow>
            <TableCell colSpan={4}>
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No knowledge articles yet.</p>
                <p className="text-sm">Create your first article to get started.</p>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      )}
    </Table>
  );
};

export default KnowledgeArticleTable;
