'use client';

import React, { useState } from 'react';
import {
  Edit,
  SimpleForm,
  TextInput,
  BooleanInput,
  ArrayInput,
  SimpleFormIterator,
  SaveButton,
  Toolbar,
  useRecordContext,
  useNotify,
  useRedirect,
  required,
  minLength,
  TopToolbar,
  ListButton,
  ShowButton,
  DeleteButton,
} from 'react-admin';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  TextField,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
} from '@mui/material';
import { Add, Remove, Visibility, Edit as EditIcon } from '@mui/icons-material';

// Available cat tags - in a real app, this would come from Firestore
const AVAILABLE_TAGS = [
  '개똥이', '깡패', '꽃분이', '누렁이', '대장이', '땅콩이', '뚜껑이',
  '마니', '메리', '블타', '삼숙이', '삼순이', '송이', '순돌이',
  '아들조로', '아롱이', '알콩이', '엄마조로', '예쁜이', '예쁜이엄마',
  '점돌이', '점순이', '정상노랑이', '찰리', '초롱이', '코순이',
  '판다', '팔랑이', '팔봉이', '팔봉이친구', '하느재노랑이', '하얀코'
];

// Custom toolbar with enhanced save options
const ImageEditToolbar = () => {
  const notify = useNotify();
  const redirect = useRedirect();

  const handleSaveAndContinue = () => {
    // This would save and redirect to the next untagged image
    notify('Image saved. Redirecting to next untagged image...', { type: 'info' });
  };

  return (
    <Toolbar>
      <SaveButton />
      <Button
        variant="outlined"
        startIcon={<EditIcon />}
        onClick={handleSaveAndContinue}
        sx={{ ml: 1 }}
      >
        Save & Next
      </Button>
    </Toolbar>
  );
};

// Custom actions for the edit form
const ImageEditActions = () => (
  <TopToolbar>
    <ListButton />
    <ShowButton />
    <DeleteButton />
  </TopToolbar>
);

// Main image preview component
const ImagePreview = () => {
  const record = useRecordContext();

  if (!record) return null;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Image Preview
        </Typography>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <img
            src={record.imageUrl}
            alt={record.fileName}
            style={{
              maxWidth: '100%',
              maxHeight: '400px',
              objectFit: 'contain',
              borderRadius: '8px',
              border: '1px solid #ddd',
            }}
          />
        </Box>        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
          <Box>
            <Typography variant="body2" color="textSecondary">
              <strong>File Name:</strong> {record.fileName}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="textSecondary">
              <strong>Upload Date:</strong> {new Date(record.uploadDate).toLocaleDateString()}
            </Typography>
          </Box>
          {record.fileSize && (
            <Box>
              <Typography variant="body2" color="textSecondary">
                <strong>File Size:</strong> {(record.fileSize / 1024 / 1024).toFixed(2)} MB
              </Typography>
            </Box>
          )}
          {record.dimensions && (
            <Box>
              <Typography variant="body2" color="textSecondary">
                <strong>Dimensions:</strong> {record.dimensions}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// Enhanced tag editing component
const TagEditor = () => {
  const record = useRecordContext();
  const [selectedTags, setSelectedTags] = useState<string[]>(record?.tags || []);
  const [customTag, setCustomTag] = useState('');
  const [customTagDialogOpen, setCustomTagDialogOpen] = useState(false);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  // Generate tag suggestions based on filename
  React.useEffect(() => {
    if (record?.fileName) {
      const suggestions = AVAILABLE_TAGS.filter(tag =>
        record.fileName.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(record.fileName.toLowerCase().substring(0, 3))
      );
      setTagSuggestions(suggestions.slice(0, 5)); // Limit to 5 suggestions
    }
  }, [record?.fileName]);

  const handleTagChange = (newTags: string[]) => {
    setSelectedTags(newTags);
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      const newTags = [...selectedTags, customTag.trim()];
      setSelectedTags(newTags);
      setCustomTag('');
      setCustomTagDialogOpen(false);
    }
  };

  const handleApplySuggestion = (suggestion: string) => {
    if (!selectedTags.includes(suggestion)) {
      setSelectedTags([...selectedTags, suggestion]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Tag Management
        </Typography>

        {/* Tag Suggestions */}
        {tagSuggestions.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Suggestions based on filename:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {tagSuggestions.map((suggestion) => (
                <Chip
                  key={suggestion}
                  label={suggestion}
                  variant="outlined"
                  color="primary"
                  clickable
                  onClick={() => handleApplySuggestion(suggestion)}
                  icon={<Add />}
                />
              ))}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Current Tags */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Current Tags:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {selectedTags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => handleRemoveTag(tag)}
                color="secondary"
                deleteIcon={<Remove />}
              />
            ))}
            {selectedTags.length === 0 && (
              <Typography variant="body2" color="textSecondary">
                No tags assigned
              </Typography>
            )}
          </Box>
        </Box>

        {/* Tag Selection */}
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth>
            <Autocomplete
              multiple
              options={AVAILABLE_TAGS}
              value={selectedTags}
              onChange={(event, newValue) => handleTagChange(newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Cat Tags"
                  placeholder="Start typing to search cats..."
                />
              )}
            />
          </FormControl>
        </Box>

        {/* Custom Tag Button */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setCustomTagDialogOpen(true)}
          >
            Add Custom Tag
          </Button>
        </Box>

        {/* Custom Tag Dialog */}
        <Dialog
          open={customTagDialogOpen}
          onClose={() => setCustomTagDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Add Custom Tag</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Only add custom tags if the cat is not in the standard list.
            </Alert>
            <TextField
              autoFocus
              margin="dense"
              label="Custom Tag"
              fullWidth
              variant="outlined"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddCustomTag();
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCustomTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomTag} variant="contained">
              Add Tag
            </Button>
          </DialogActions>
        </Dialog>

        {/* Hidden input for form submission */}
        <input
          type="hidden"
          name="tags"
          value={JSON.stringify(selectedTags)}
        />
      </CardContent>
    </Card>
  );
};

// Main ImageEdit component
const ImageEdit = () => {
  return (
    <Edit
      actions={<ImageEditActions />}
      title="Edit Image Tags"
    >
      <Box sx={{ p: 2 }}>
        {/* Image Preview */}
        <ImagePreview />

        {/* Tag Editor */}
        <TagEditor />

        {/* Standard Form Fields */}
        <SimpleForm toolbar={<ImageEditToolbar />}>
          <TextInput
            source="fileName"
            label="File Name"
            validate={[required(), minLength(1)]}
            fullWidth
          />

          <TextInput
            source="description"
            label="Description"
            multiline
            rows={3}
            fullWidth
          />

          <BooleanInput
            source="needsTagging"
            label="Needs Tagging"
            helperText="Uncheck this after tagging is complete"
          />

          {/* Tags as hidden field - managed by TagEditor */}
          <ArrayInput source="tags" label="Tags (managed above)">
            <SimpleFormIterator disableAdd disableRemove>
              <TextInput source="" disabled />
            </SimpleFormIterator>
          </ArrayInput>

          {/* Metadata fields (read-only) */}
          <TextInput
            source="uploadDate"
            label="Upload Date"
            disabled
            fullWidth
          />

          <TextInput
            source="fileSize"
            label="File Size (bytes)"
            disabled
            fullWidth
          />
        </SimpleForm>
      </Box>
    </Edit>
  );
};

export default ImageEdit;
