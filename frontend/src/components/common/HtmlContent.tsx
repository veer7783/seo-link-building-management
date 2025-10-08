import React from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { sanitizeHtml, isHtmlEmpty } from '../../utils/htmlSanitizer';

const StyledHtmlContent = styled(Box)(({ theme }) => ({
  '& p': {
    margin: '0 0 8px 0',
    '&:last-child': {
      marginBottom: 0,
    },
  },
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    margin: '16px 0 8px 0',
    fontWeight: 600,
    '&:first-child': {
      marginTop: 0,
    },
  },
  '& h1': { fontSize: '1.5rem' },
  '& h2': { fontSize: '1.25rem' },
  '& h3': { fontSize: '1.1rem' },
  '& h4, & h5, & h6': { fontSize: '1rem' },
  '& ul, & ol': {
    margin: '8px 0',
    paddingLeft: '24px',
  },
  '& li': {
    margin: '4px 0',
  },
  '& a': {
    color: theme.palette.primary.main,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  '& img': {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: theme.shape.borderRadius,
    margin: '8px 0',
  },
  '& blockquote': {
    margin: '16px 0',
    padding: '12px 16px',
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    backgroundColor: theme.palette.grey[50],
    fontStyle: 'italic',
  },
  '& pre': {
    backgroundColor: theme.palette.grey[100],
    padding: '12px',
    borderRadius: theme.shape.borderRadius,
    overflow: 'auto',
    fontSize: '0.875rem',
    fontFamily: 'monospace',
  },
  '& code': {
    backgroundColor: theme.palette.grey[100],
    padding: '2px 4px',
    borderRadius: '3px',
    fontSize: '0.875rem',
    fontFamily: 'monospace',
  },
  '& strong, & b': {
    fontWeight: 600,
  },
  '& em, & i': {
    fontStyle: 'italic',
  },
  '& u': {
    textDecoration: 'underline',
  },
  '& s, & strike': {
    textDecoration: 'line-through',
  },
}));

interface HtmlContentProps {
  content: string | undefined | null;
  maxHeight?: number;
  showEmpty?: boolean;
  emptyText?: string;
  sx?: any;
}

const HtmlContent: React.FC<HtmlContentProps> = ({
  content,
  maxHeight,
  showEmpty = true,
  emptyText = 'No content available',
  sx = {},
}) => {
  // Check if content is empty
  if (isHtmlEmpty(content)) {
    if (!showEmpty) return null;
    
    return (
      <Typography 
        variant="body2" 
        color="text.secondary" 
        fontStyle="italic"
        sx={sx}
      >
        {emptyText}
      </Typography>
    );
  }

  // Sanitize the HTML content
  const sanitizedContent = sanitizeHtml(content);

  return (
    <StyledHtmlContent
      sx={{
        maxHeight: maxHeight ? `${maxHeight}px` : 'none',
        overflow: maxHeight ? 'auto' : 'visible',
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};

export default HtmlContent;
