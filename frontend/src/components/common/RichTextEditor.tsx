import React, { useMemo, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled wrapper for the Quill editor
const StyledQuillWrapper = styled(Box)(({ theme }) => ({
  '& .ql-toolbar': {
    borderTop: `1px solid ${theme.palette.divider}`,
    borderLeft: `1px solid ${theme.palette.divider}`,
    borderRight: `1px solid ${theme.palette.divider}`,
    borderBottom: 'none',
    borderTopLeftRadius: theme.shape.borderRadius,
    borderTopRightRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.grey[50],
  },
  '& .ql-container': {
    borderBottom: `1px solid ${theme.palette.divider}`,
    borderLeft: `1px solid ${theme.palette.divider}`,
    borderRight: `1px solid ${theme.palette.divider}`,
    borderTop: 'none',
    borderBottomLeftRadius: theme.shape.borderRadius,
    borderBottomRightRadius: theme.shape.borderRadius,
    fontSize: '14px',
    fontFamily: theme.typography.fontFamily,
  },
  '& .ql-editor': {
    minHeight: '120px',
    fontSize: '14px',
    lineHeight: 1.5,
    '&.ql-blank::before': {
      color: theme.palette.text.secondary,
      fontStyle: 'normal',
    },
  },
  '& .ql-toolbar .ql-stroke': {
    stroke: theme.palette.text.secondary,
  },
  '& .ql-toolbar .ql-fill': {
    fill: theme.palette.text.secondary,
  },
  '& .ql-toolbar button:hover .ql-stroke': {
    stroke: theme.palette.primary.main,
  },
  '& .ql-toolbar button:hover .ql-fill': {
    fill: theme.palette.primary.main,
  },
  '& .ql-toolbar button.ql-active .ql-stroke': {
    stroke: theme.palette.primary.main,
  },
  '& .ql-toolbar button.ql-active .ql-fill': {
    fill: theme.palette.primary.main,
  },
}));

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter content...',
  disabled = false,
  label,
  required = false,
  error = false,
  helperText,
}) => {
  const quillRef = useRef<ReactQuill>(null);

  // Set up global reference for image handler
  useEffect(() => {
    if (quillRef.current) {
      (window as any).quillInstance = quillRef.current.getEditor();
    }
  }, []);

  // Image resize handler to compress images
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        // Check file size (limit to 1MB)
        if (file.size > 1024 * 1024) {
          alert('Image size should be less than 1MB. Please compress your image or use a smaller one.');
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Resize image if too large
            let { width, height } = img;
            const maxWidth = 800;
            const maxHeight = 600;
            
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width *= ratio;
              height *= ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Convert to base64 with compression
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            
            // Insert the compressed image
            const quill = (window as any).quillInstance;
            if (quill) {
              const range = quill.getSelection();
              quill.insertEmbed(range?.index || 0, 'image', compressedDataUrl);
            }
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      }
    };
  };

  // Quill modules configuration
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        ['link', 'image'],
        [{ 'align': [] }],
        [{ 'color': [] }, { 'background': [] }],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    },
    clipboard: {
      matchVisual: false,
    }
  }), []);

  // Quill formats configuration
  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image',
    'align', 'color', 'background'
  ];

  return (
    <Box>
      {label && (
        <Typography 
          variant="body2" 
          component="label" 
          sx={{ 
            display: 'block', 
            mb: 1, 
            fontWeight: 500,
            color: error ? 'error.main' : 'text.primary'
          }}
        >
          {label}
          {required && (
            <Typography component="span" color="error.main" sx={{ ml: 0.5 }}>
              *
            </Typography>
          )}
        </Typography>
      )}
      
      <StyledQuillWrapper>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          readOnly={disabled}
          style={{
            opacity: disabled ? 0.6 : 1,
            pointerEvents: disabled ? 'none' : 'auto',
          }}
        />
      </StyledQuillWrapper>
      
      {helperText && (
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block', 
            mt: 0.5, 
            ml: 1,
            color: error ? 'error.main' : 'text.secondary'
          }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export default RichTextEditor;
