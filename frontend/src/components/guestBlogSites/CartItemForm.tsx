import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
} from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';
import { guestBlogOrderService } from '../../services/guestBlogOrderService';
import RichTextEditor from '../common/RichTextEditor';
import { isHtmlEmpty } from '../../utils/htmlSanitizer';

interface CartItemFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (contentText: string, contentDocUrl?: string) => void;
  siteUrl: string;
  clientName: string;
  adjustedPrice: number;
}

const CartItemForm: React.FC<CartItemFormProps> = ({
  open,
  onClose,
  onSubmit,
  siteUrl,
  clientName,
  adjustedPrice,
}) => {
  const [contentText, setContentText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/rtf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid document file (PDF, DOC, DOCX, TXT, RTF)');
        return;
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (isHtmlEmpty(contentText)) {
      setError('Content is required');
      return;
    }

    setUploading(true);
    setError('');

    try {
      let contentDocUrl: string | undefined;

      // Upload file if selected
      if (selectedFile) {
        try {
          const uploadResult = await guestBlogOrderService.uploadContentDocument(selectedFile);
          contentDocUrl = uploadResult.data.url;
        } catch (uploadError) {
          console.error('File upload failed:', uploadError);
          setError('Failed to upload file. Please try again.');
          setUploading(false);
          return;
        }
      }

      onSubmit(contentText, contentDocUrl);
      
      // Reset form
      setContentText('');
      setSelectedFile(null);
      setError('');
    } catch (error) {
      setError('Failed to process request. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setContentText('');
      setSelectedFile(null);
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Add to Cart - Content Details
      </DialogTitle>
      
      <DialogContent>
        {uploading && <LinearProgress sx={{ mb: 2 }} />}
        
        {/* Site Information */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Site Details
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {siteUrl}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Client: {clientName} • Price: ${adjustedPrice.toFixed(2)}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Content Field - Rich Text Editor */}
        <Box sx={{ mb: 3 }}>
          <RichTextEditor
            value={contentText}
            onChange={setContentText}
            label="Content Requirements"
            placeholder="Enter content requirements, guidelines, keywords, or any specific instructions for this guest blog post..."
            required
            disabled={uploading}
            error={!!error && isHtmlEmpty(contentText)}
            helperText="Use the toolbar to format your content requirements. You can add links, lists, bold text, images (auto-compressed), and more. Large documents can also be uploaded in the file section below."
          />
        </Box>

        {/* File Upload */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Content Document (Optional)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload additional content guidelines, brief, or reference documents (PDF, DOC, DOCX, TXT, RTF - Max 10MB)
          </Typography>
          
          <Box display="flex" alignItems="center" gap={2}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              disabled={uploading}
            >
              Choose File
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx,.txt,.rtf"
                onChange={handleFileChange}
              />
            </Button>
            
            {selectedFile && (
              <Typography variant="body2" color="text.secondary">
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={uploading || isHtmlEmpty(contentText)}
        >
          {uploading ? 'Processing...' : 'Add to Cart'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CartItemForm;
