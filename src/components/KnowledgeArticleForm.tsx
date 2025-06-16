
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_active: boolean;
}

interface KnowledgeArticleFormProps {
  editingArticle: KnowledgeArticle | null;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  onSubmit: (title: string, content: string) => Promise<boolean>;
  onCancel: () => void;
  isLoading: boolean;
}

const KnowledgeArticleForm: React.FC<KnowledgeArticleFormProps> = ({
  editingArticle,
  isDialogOpen,
  setIsDialogOpen,
  onSubmit,
  onCancel,
  isLoading
}) => {
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingArticle) {
      setFormData({
        title: editingArticle.title,
        content: editingArticle.content
      });
    } else {
      setFormData({
        title: '',
        content: ''
      });
    }
  }, [editingArticle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      return;
    }

    setIsSubmitting(true);
    console.log('Submitting form with data:', formData);
    
    try {
      const success = await onSubmit(formData.title, formData.content);
      if (success) {
        setFormData({ title: '', content: '' });
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    console.log('Canceling form');
    setFormData({ title: '', content: '' });
    setIsSubmitting(false);
    onCancel();
  };

  const handleOpenDialog = () => {
    if (!editingArticle) {
      setFormData({ title: '', content: '' });
    }
    setIsDialogOpen(true);
  };

  const isFormDisabled = isLoading || isSubmitting;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button onClick={handleOpenDialog} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
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
              disabled={isFormDisabled}
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
              disabled={isFormDisabled}
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={isFormDisabled || !formData.title.trim() || !formData.content.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {editingArticle ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingArticle ? 'Update Article' : 'Create Article'
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={isFormDisabled}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default KnowledgeArticleForm;
