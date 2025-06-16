
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
    console.log('Loading articles...');
    setIsLoading(true);
    
    try {
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

      console.log('Loaded articles:', data);
      setArticles(data || []);
    } catch (error) {
      console.error('Unexpected error loading articles:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while loading articles.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
    console.log('Creating article with user:', user.id);

    try {
      const { data, error } = await supabase
        .from('knowledge_articles')
        .insert({
          title: title.trim(),
          content: content.trim(),
          created_by: user.id,
          is_active: true
        })
        .select();

      if (error) {
        console.error('Error creating article:', error);
        toast({
          title: "Error",
          description: `Failed to create knowledge article: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      console.log('Article created successfully:', data);
      toast({
        title: "Success",
        description: "Knowledge article created successfully.",
      });

      await loadArticles();
      return true;
    } catch (error) {
      console.error('Unexpected error creating article:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating the article.",
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
    console.log('Updating article:', articleId);

    try {
      const { error } = await supabase
        .from('knowledge_articles')
        .update({
          title: title.trim(),
          content: content.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId);

      if (error) {
        console.error('Error updating article:', error);
        toast({
          title: "Error",
          description: `Failed to update knowledge article: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Knowledge article updated successfully.",
      });

      await loadArticles();
      return true;
    } catch (error) {
      console.error('Unexpected error updating article:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the article.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleArticleStatus = async (articleId: string, currentStatus: boolean) => {
    console.log('Toggling article status:', articleId, currentStatus);
    
    try {
      const { error } = await supabase
        .from('knowledge_articles')
        .update({ is_active: !currentStatus })
        .eq('id', articleId);

      if (error) {
        console.error('Error updating article status:', error);
        toast({
          title: "Error",
          description: `Failed to update article status: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Article ${!currentStatus ? 'activated' : 'deactivated'} successfully.`,
      });

      await loadArticles();
    } catch (error) {
      console.error('Unexpected error toggling article status:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the article status.",
        variant: "destructive",
      });
    }
  };

  const deleteArticle = async (articleId: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    console.log('Deleting article:', articleId);
    
    try {
      const { error } = await supabase
        .from('knowledge_articles')
        .delete()
        .eq('id', articleId);

      if (error) {
        console.error('Error deleting article:', error);
        toast({
          title: "Error",
          description: `Failed to delete article: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Article deleted successfully.",
      });

      await loadArticles();
    } catch (error) {
      console.error('Unexpected error deleting article:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the article.",
        variant: "destructive",
      });
    }
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
