
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_active: boolean;
}

export const useKnowledgeManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const createArticle = async (title: string, content: string) => {
    if (!user || !title.trim() || !content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and content.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('knowledge_articles')
        .insert({
          title: title.trim(),
          content: content.trim(),
          created_by: user.id,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Knowledge article created successfully.",
      });

      loadArticles();
      return true;
    } catch (error) {
      console.error('Error creating article:', error);
      toast({
        title: "Error",
        description: "Failed to create knowledge article.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateArticle = async (articleId: string, title: string, content: string) => {
    if (!user || !title.trim() || !content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and content.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('knowledge_articles')
        .update({
          title: title.trim(),
          content: content.trim(),
          created_by: user.id,
          is_active: true
        })
        .eq('id', articleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Knowledge article updated successfully.",
      });

      loadArticles();
      return true;
    } catch (error) {
      console.error('Error updating article:', error);
      toast({
        title: "Error",
        description: "Failed to update knowledge article.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
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

  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadArticles();
    }
  }, [user]);

  return {
    articles,
    isLoading,
    createArticle,
    updateArticle,
    toggleArticleStatus,
    deleteArticle,
    loadArticles
  };
};
