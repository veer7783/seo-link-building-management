/**
 * Document Preview Modal Component
 * Displays uploaded documents (PDF, DOCX, TXT) in a modal preview
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { guestBlogOrderService } from '../../services/guestBlogOrderService';

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  documentUrl: string;
  fileName: string;
  onDownload?: () => void;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  open,
  onClose,
  documentUrl,
  fileName,
  onDownload,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [docxContent, setDocxContent] = useState<string | null>(null);

  // Get file extension
  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  // Get file type category
  const getFileType = (filename: string): 'pdf' | 'docx' | 'doc' | 'txt' | 'rtf' | 'unsupported' => {
    const ext = getFileExtension(filename);
    switch (ext) {
      case 'pdf':
        return 'pdf';
      case 'docx':
        return 'docx';
      case 'doc':
        return 'doc';
      case 'txt':
        return 'txt';
      case 'rtf':
        return 'rtf';
      default:
        return 'unsupported';
    }
  };

  // Load text content for text files
  const loadTextContent = async (url: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to load document');
      }
      
      const text = await response.text();
      setTextContent(text);
    } catch (err) {
      setError('Failed to load document content');
      console.error('Error loading text content:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load DOCX content using extraction service
  const loadDocxContent = async (documentPath: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading DOCX content for:', documentPath);
      
      const result = await guestBlogOrderService.extractDocxContent(documentPath);
      
      console.log('DOCX extraction result in modal:', result);
      
      if (result.success && result.content) {
        console.log('Successfully extracted DOCX content, length:', result.content.length);
        setDocxContent(result.content);
      } else {
        console.error('DOCX extraction failed:', result);
        setError(`Extraction failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError('Failed to load document content');
      console.error('Error loading DOCX content:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setLoading(true);
      setError(null);
      setTextContent(null);
      setDocxContent(null);
      
      const fileType = getFileType(fileName);
      if (fileType === 'txt' || fileType === 'rtf') {
        loadTextContent(documentUrl);
      } else if (fileType === 'docx') {
        // For DOCX files, extract content using the backend service
        // Use fileName since documentUrl might be just the relative path
        loadDocxContent(fileName);
      } else if (fileType === 'doc') {
        // For older DOC files, show message that extraction is not supported
        setError('DOC files are not supported for preview. Please download the file or convert to DOCX format.');
        setLoading(false);
      } else {
        // For PDFs and other files, loading will be handled by iframe onLoad
        setLoading(true);
      }
    }
  }, [open, documentUrl, fileName]);

  // Get preview content based on file type
  const renderPreviewContent = () => {
    const fileType = getFileType(fileName);

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Loading document...
          </Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
          <Button
            size="small"
            onClick={onDownload}
            startIcon={<DownloadIcon />}
            sx={{ ml: 2 }}
          >
            Download Instead
          </Button>
        </Alert>
      );
    }

    switch (fileType) {
      case 'pdf':
        return (
          <Box sx={{ width: '100%', height: '600px', border: '1px solid #ddd', borderRadius: 1 }}>
            <iframe
              src={`${documentUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              width="100%"
              height="100%"
              style={{ border: 'none', borderRadius: '4px' }}
              title={`PDF Preview: ${fileName}`}
              onLoad={() => {
                console.log('PDF loaded successfully');
                setLoading(false);
              }}
              onError={() => {
                console.error('PDF failed to load');
                setError('Failed to load PDF. This may be due to browser security restrictions or file access issues.');
                setLoading(false);
              }}
            />
          </Box>
        );

      case 'docx':
        // For DOCX files, show extracted content if available
        if (docxContent) {
          return (
            <Box sx={{ width: '100%', height: '600px' }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>DOCX Content Preview:</strong> {fileName}
                </Typography>
                <Typography variant="body2">
                  Showing extracted content from the Word document. Download for full formatting and images.
                </Typography>
              </Alert>
              
              {/* Document Content */}
              <Box
                sx={{
                  width: '100%',
                  height: 'calc(100% - 80px)',
                  border: '1px solid #ddd',
                  borderRadius: 1,
                  p: 3,
                  bgcolor: '#ffffff',
                  overflow: 'auto',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
                  '& h1, & h2, & h3, & h4, & h5, & h6': {
                    color: '#2b579a',
                    marginTop: '1em',
                    marginBottom: '0.5em',
                  },
                  '& p': {
                    marginBottom: '1em',
                    lineHeight: 1.6,
                  },
                  '& ul, & ol': {
                    marginLeft: '2em',
                    marginBottom: '1em',
                  },
                  '& table': {
                    borderCollapse: 'collapse',
                    width: '100%',
                    marginBottom: '1em',
                  },
                  '& td, & th': {
                    border: '1px solid #ddd',
                    padding: '8px',
                    textAlign: 'left',
                  },
                  '& th': {
                    backgroundColor: '#f5f5f5',
                    fontWeight: 'bold',
                  },
                  '& strong, & b': {
                    fontWeight: 600,
                  },
                  '& em, & i': {
                    fontStyle: 'italic',
                  },
                }}
                dangerouslySetInnerHTML={{ __html: docxContent }}
              />
            </Box>
          );
        } else {
          // Fallback to professional display if content extraction fails
          return (
            <Box sx={{ width: '100%', height: '600px' }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Microsoft Word Document:</strong> {fileName}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {error || 'Loading document content...'}
                </Typography>
              </Alert>
              
              {/* Professional Document Display */}
              <Box sx={{ 
                width: '100%', 
                height: 'calc(100% - 80px)', 
                border: '2px dashed #e0e0e0', 
                borderRadius: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Document Icon and Info */}
                <Box sx={{ textAlign: 'center', p: 4, zIndex: 1 }}>
                  <Box sx={{ 
                    fontSize: '4rem', 
                    mb: 2, 
                    color: '#2b579a',
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
                  }}>
                    📄
                  </Box>
                  
                  <Typography variant="h5" gutterBottom sx={{ color: '#2b579a', fontWeight: 600 }}>
                    Microsoft Word Document
                  </Typography>
                  
                  <Typography variant="h6" color="text.primary" gutterBottom sx={{ 
                    wordBreak: 'break-all',
                    maxWidth: '400px',
                    mx: 'auto'
                  }}>
                    {fileName}
                  </Typography>
                  
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: '500px', mx: 'auto' }}>
                    {error ? 'Content preview not available. ' : 'Loading document content... '}
                    Download to view the complete document with proper formatting.
                  </Typography>
                  
                  {/* Download Button */}
                  {onDownload && (
                    <Button
                      variant="contained"
                      size="large"
                      onClick={onDownload}
                      startIcon={<DownloadIcon />}
                      sx={{ 
                        mt: 2,
                        px: 4,
                        py: 1.5,
                        borderRadius: 3,
                        textTransform: 'none',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                        '&:hover': {
                          boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                          transform: 'translateY(-1px)'
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      Download Document
                    </Button>
                  )}
                </Box>
              </Box>
            </Box>
          );
        }

      case 'doc':
        // For older DOC files, show message that preview is not supported
        return (
          <Box sx={{ width: '100%', height: '600px' }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>DOC File Format:</strong> {fileName}
              </Typography>
              <Typography variant="body2">
                Preview is not available for older DOC format. Please download the file or convert to DOCX format for preview.
              </Typography>
            </Alert>
            
            {/* Professional Document Display */}
            <Box sx={{ 
              width: '100%', 
              height: 'calc(100% - 80px)', 
              border: '2px dashed #e0e0e0', 
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            }}>
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Box sx={{ fontSize: '4rem', mb: 2, color: '#2b579a' }}>📄</Box>
                <Typography variant="h5" gutterBottom sx={{ color: '#2b579a', fontWeight: 600 }}>
                  Microsoft Word Document (Legacy)
                </Typography>
                <Typography variant="h6" color="text.primary" gutterBottom>
                  {fileName}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: '500px', mx: 'auto' }}>
                  This is an older DOC format file. Preview is not supported for this format.
                </Typography>
                
                {onDownload && (
                  <Button
                    variant="contained"
                    size="large"
                    onClick={onDownload}
                    startIcon={<DownloadIcon />}
                    sx={{ mt: 2 }}
                  >
                    Download Document
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        );

      case 'txt':
      case 'rtf':
        return (
          <Box
            sx={{
              width: '100%',
              minHeight: '400px',
              maxHeight: '600px',
              border: '1px solid #ddd',
              borderRadius: 1,
              p: 2,
              bgcolor: '#fafafa',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {textContent || 'No content available'}
          </Box>
        );

      default:
        return (
          <Alert severity="info">
            <Typography variant="body1" gutterBottom>
              Preview not available for this file type.
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              File: {fileName}
            </Typography>
            <Button
              variant="contained"
              onClick={onDownload}
              startIcon={<DownloadIcon />}
              sx={{ mt: 1 }}
            >
              Download File
            </Button>
          </Alert>
        );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh', maxHeight: '800px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <ViewIcon color="primary" />
            <Typography variant="h6" component="span">
              Document Preview
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {fileName}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 2, overflow: 'hidden' }}>
        {renderPreviewContent()}
      </DialogContent>

      <DialogActions>
        {onDownload && (
          <Button
            onClick={onDownload}
            startIcon={<DownloadIcon />}
            variant="outlined"
          >
            Download
          </Button>
        )}
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentPreviewModal;
