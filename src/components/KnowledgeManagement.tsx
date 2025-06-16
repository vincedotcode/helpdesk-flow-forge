
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Upload, Edit, Trash2, FileText, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  pdf_url?: string;
  pdf_filename?: string;
  created_at: string;
  is_active: boolean;
}

const KnowledgeManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    pdfFile: null as File | null
  });

  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadArticles();
    }
  }, [user]);

  const loadArticles = async () => {
    const { data, error } = await supabase
      .from('knowledge_articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading articles:', error);
      toast({
        title: "Error",
        description: "Failed to load knowledge articles.",
        variant: "destructive",
      });
      return;
    }

    setArticles(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.title.trim() || !formData.content.trim()) return;

    setIsLoading(true);

    try {
      let pdfUrl = null;
      let pdfFilename = null;

      // Upload PDF if provided
      if (formData.pdfFile) {
        const fileExt = formData.pdfFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('knowledge-pdfs')
          .upload(fileName, formData.pdfFile);

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('knowledge-pdfs')
          .getPublicUrl(fileName);

        pdfUrl = urlData.publicUrl;
        pdfFilename = formData.pdfFile.name;
      }

      const articleData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        created_by: user.id,
        pdf_url: pdfUrl,
        pdf_filename: pdfFilename,
        is_active: true
      };

      if (editingArticle) {
        // Update existing article
        const { error } = await supabase
          .from('knowledge_articles')
          .update(articleData)
          .eq('id', editingArticle.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Knowledge article updated successfully.",
        });
      } else {
        // Create new article
        const { error } = await supabase
          .from('knowledge_articles')
          .insert(articleData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Knowledge article created successfully.",
        });
      }

      resetForm();
      loadArticles();
    } catch (error) {
      console.error('Error saving article:', error);
      toast({
        title: "Error",
        description: "Failed to save knowledge article.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      pdfFile: null
    });
    setEditingArticle(null);
    setIsDialogOpen(false);
  };

  const editArticle = (article: KnowledgeArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      pdfFile: null
    });
    setIsDialogOpen(true);
  };

  const toggleArticleStatus = async (articleId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('knowledge_articles')
      .update({ is_active: !currentStatus })
      .eq('id', articleId);

    if (error) {
      console.error('Error updating article status:', error);
      toast({
        title: "Error",
        description: "Failed to update article status.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Article ${!currentStatus ? 'activated' : 'deactivated'} successfully.`,
    });

    loadArticles();
  };

  const deleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    const { error } = await supabase
      .from('knowledge_articles')
      .delete()
      .eq('id', articleId);

    if (error) {
      console.error('Error deleting article:', error);
      toast({
        title: "Error",
        description: "Failed to delete article.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Article deleted successfully.",
    });

    loadArticles();
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
          <p className="text-gray-600">Manage organizational knowledge articles and documentation</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingArticle ? 'Edit Knowledge Article' : 'Create New Knowledge Article'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter article title..."
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter article content..."
                  rows={8}
                  required
                />
              </div>

              <div>
                <Label htmlFor="pdf">PDF Document (Optional)</Label>
                <Input
                  id="pdf"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    pdfFile: e.target.files ? e.target.files[0] : null 
                  }))}
                />
                {formData.pdfFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {formData.pdfFile.name}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : (editingArticle ? 'Update Article' : 'Create Article')}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge Articles ({articles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>PDF</TableHead>
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
                      onClick={() => toggleArticleStatus(article.id, article.is_active)}
                    >
                      {article.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(article.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {article.pdf_filename && (
                      <div className="flex items-center gap-1 text-sm">
                        <FileText className="w-4 h-4" />
                        <span className="truncate max-w-24">{article.pdf_filename}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editArticle(article)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteArticle(article.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {articles.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No knowledge articles yet.</p>
              <p className="text-sm">Create your first article to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeManagement;
