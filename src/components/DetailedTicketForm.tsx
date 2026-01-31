
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Upload, X } from 'lucide-react';

interface DetailedTicketFormProps {
  departments: Array<{ id: string; name: string }>;
  onSuccess: () => void;
  onCancel: () => void;
}

interface AttachmentFile {
  file: File;
  preview: string;
  id: string;
}

type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

const DetailedTicketForm: React.FC<DetailedTicketFormProps> = ({ departments, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium' as TicketPriority,
    urgency_level: '',
    department_id: '',
    affected_systems: '',
    steps_to_reproduce: '',
    expected_behavior: '',
    actual_behavior: '',
    business_impact: '',
    additional_info: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB`,
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const newAttachment: AttachmentFile = {
          file,
          preview: reader.result as string,
          id: Math.random().toString(36).substr(2, 9)
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const uploadAttachments = async (ticketId: string) => {
    const uploadedFiles = [];
    
    for (const attachment of attachments) {
      const fileExt = attachment.file.name.split('.').pop();
      const fileName = `${ticketId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .upload(fileName, attachment.file);

      if (error) {
        console.error('Error uploading file:', error);
        continue;
      }

      uploadedFiles.push({
        name: attachment.file.name,
        path: data.path,
        size: attachment.file.size,
        type: attachment.file.type
      });
    }

    return uploadedFiles;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Error",
        description: "Title and description are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create the ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category || null,
          priority: formData.priority,
          urgency_level: formData.urgency_level || null,
          department_id: formData.department_id || null,
          affected_systems: formData.affected_systems || null,
          steps_to_reproduce: formData.steps_to_reproduce || null,
          expected_behavior: formData.expected_behavior || null,
          actual_behavior: formData.actual_behavior || null,
          business_impact: formData.business_impact || null,
          additional_info: formData.additional_info || null,
          created_by: user?.id || ''
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Upload attachments if any
      if (attachments.length > 0) {
        const uploadedFiles = await uploadAttachments(ticketData.id);
        
        if (uploadedFiles.length > 0) {
          await supabase
            .from('tickets')
            .update({ attachments: uploadedFiles })
            .eq('id', ticketData.id);
        }
      }

      toast({
        title: "Success",
        description: "Ticket created and routed to the relevant department team.",
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Basic Information</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Brief description of the issue"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hardware">Hardware</SelectItem>
                <SelectItem value="software">Software</SelectItem>
                <SelectItem value="network">Network</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="access">Access Request</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Detailed description of the issue"
            rows={4}
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value: TicketPriority) => handleInputChange('priority', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgency">Urgency Level</Label>
            <Select value={formData.urgency_level} onValueChange={(value) => handleInputChange('urgency_level', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="within_hour">Within 1 Hour</SelectItem>
                <SelectItem value="within_day">Within 1 Day</SelectItem>
                <SelectItem value="within_week">Within 1 Week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select value={formData.department_id} onValueChange={(value) => handleInputChange('department_id', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Support</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Technical Details</h3>
        
        <div className="space-y-2">
          <Label htmlFor="affected_systems">Affected Systems</Label>
          <Input
            id="affected_systems"
            value={formData.affected_systems}
            onChange={(e) => handleInputChange('affected_systems', e.target.value)}
            placeholder="Which systems or applications are affected?"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="steps_to_reproduce">Steps to Reproduce</Label>
          <Textarea
            id="steps_to_reproduce"
            value={formData.steps_to_reproduce}
            onChange={(e) => handleInputChange('steps_to_reproduce', e.target.value)}
            placeholder="Step-by-step instructions to reproduce the issue"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expected_behavior">Expected Behavior</Label>
            <Textarea
              id="expected_behavior"
              value={formData.expected_behavior}
              onChange={(e) => handleInputChange('expected_behavior', e.target.value)}
              placeholder="What should happen normally?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="actual_behavior">Actual Behavior</Label>
            <Textarea
              id="actual_behavior"
              value={formData.actual_behavior}
              onChange={(e) => handleInputChange('actual_behavior', e.target.value)}
              placeholder="What is actually happening?"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Business Impact */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Business Impact</h3>
        
        <div className="space-y-2">
          <Label htmlFor="business_impact">Business Impact</Label>
          <Textarea
            id="business_impact"
            value={formData.business_impact}
            onChange={(e) => handleInputChange('business_impact', e.target.value)}
            placeholder="How does this issue affect business operations?"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="additional_info">Additional Information</Label>
          <Textarea
            id="additional_info"
            value={formData.additional_info}
            onChange={(e) => handleInputChange('additional_info', e.target.value)}
            placeholder="Any other relevant information"
            rows={3}
          />
        </div>
      </div>

      {/* File Attachments */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Attachments</h3>
        
        <div className="space-y-2">
          <Label htmlFor="attachments">Upload Files</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <input
              type="file"
              id="attachments"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label htmlFor="attachments" className="cursor-pointer flex flex-col items-center space-y-2">
              <Upload className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-600">Click to upload files or drag and drop</span>
              <span className="text-xs text-gray-400">Max 10MB per file</span>
            </label>
          </div>
        </div>

        {attachments.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="relative border rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm truncate">{attachment.file.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttachment(attachment.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {attachment.file.type.startsWith('image/') && (
                  <img
                    src={attachment.preview}
                    alt="Preview"
                    className="w-full h-20 object-cover rounded mt-2"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Ticket'}
        </Button>
      </div>
    </form>
  );
};

export default DetailedTicketForm;
