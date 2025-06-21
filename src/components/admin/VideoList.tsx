'use client';

import React, { useState } from 'react';
import {
  List,
  Datagrid,
  TextField,
  BooleanField,
  DateField,
  Filter,
  TextInput,
  BooleanInput,
  SelectInput,
  TopToolbar,
  CreateButton,
  ExportButton,
  FilterButton,
  useListContext,
  useRecordContext,
  ChipField,
  ArrayField,
  SingleFieldList,
  EditButton,
  ShowButton,
  BulkDeleteButton,
  BulkUpdateButton,
  useUpdateMany,
  useNotify,
  useRefresh,
  Button,
  NumberField,
} from 'react-admin';
import {
  Card,
  CardContent,
  Grid,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField as MuiTextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Typography,
  IconButton,
} from '@mui/material';
import { PlayArrow, YouTube, CloudQueue } from '@mui/icons-material';

// Custom filter for videos
const VideoFilter = (props: any) => (
  <Filter {...props}>
    <TextInput source="fileName" label="File Name" />
    <SelectInput
      source="videoType"
      label="Video Type"
      choices={[
        { id: 'storage', name: 'Firebase Storage' },
        { id: 'youtube', name: 'YouTube' },
      ]}
    />
    <SelectInput
      source="tags"
      label="Contains Tag"
      choices={[
        // Cat names from the project
        { id: '개똥이', name: '개똥이' },
        { id: '깡패', name: '깡패' },
        { id: '꽃분이', name: '꽃분이' },
        { id: '누렁이', name: '누렁이' },
        { id: '대장이', name: '대장이' },
        { id: '땅콩이', name: '땅콩이' },
        { id: '뚜껑이', name: '뚜껑이' },
        { id: '마니', name: '마니' },
        { id: '메리', name: '메리' },
        { id: '블타', name: '블타' },
        { id: '삼숙이', name: '삼숙이' },
        { id: '삼순이', name: '삼순이' },
        { id: '송이', name: '송이' },
        { id: '순돌이', name: '순돌이' },
        { id: '아들조로', name: '아들조로' },
        { id: '아롱이', name: '아롱이' },
        { id: '알콩이', name: '알콩이' },
        { id: '엄마조로', name: '엄마조로' },
        { id: '예쁜이', name: '예쁜이' },
        { id: '예쁜이엄마', name: '예쁜이엄마' },
        { id: '점돌이', name: '점돌이' },
        { id: '점순이', name: '점순이' },
        { id: '정상노랑이', name: '정상노랑이' },
        { id: '찰리', name: '찰리' },
        { id: '초롱이', name: '초롱이' },
        { id: '코순이', name: '코순이' },
        { id: '판다', name: '판다' },
        { id: '팔랑이', name: '팔랑이' },
        { id: '팔봉이', name: '팔봉이' },
        { id: '팔봉이친구', name: '팔봉이친구' },
        { id: '하느재노랑이', name: '하느재노랑이' },
        { id: '하얀코', name: '하얀코' },
      ]}
    />
  </Filter>
);

// Custom list actions with bulk tagging for videos
const VideoListActions = () => {
  const [bulkTagDialogOpen, setBulkTagDialogOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { selectedIds } = useListContext();
  const [updateMany] = useUpdateMany();
  const notify = useNotify();
  const refresh = useRefresh();

  const availableTags = [
    '개똥이', '깡패', '꽃분이', '누렁이', '대장이', '땅콩이', '뚜껑이',
    '마니', '메리', '블타', '삼숙이', '삼순이', '송이', '순돌이',
    '아들조로', '아롱이', '알콩이', '엄마조로', '예쁜이', '예쁜이엄마',
    '점돌이', '점순이', '정상노랑이', '찰리', '초롱이', '코순이',
    '판다', '팔랑이', '팔봉이', '팔봉이친구', '하느재노랑이', '하얀코'
  ];

  const handleBulkTag = async () => {
    if (selectedIds.length === 0) {
      notify('Please select videos to tag', { type: 'warning' });
      return;
    }    try {
      await updateMany('videos', {
        ids: selectedIds,
        data: {
          tags: selectedTags,
          lastTaggedAt: new Date(),
        },
      });

      notify(`Tagged ${selectedIds.length} videos`, { type: 'success' });
      setBulkTagDialogOpen(false);
      setSelectedTags([]);
      refresh();
    } catch (error) {
      notify('Error tagging videos', { type: 'error' });
    }
  };

  return (
    <TopToolbar>
      <FilterButton />
      <CreateButton />
      <ExportButton />
      <Button
        label="Bulk Tag Selected"
        onClick={() => setBulkTagDialogOpen(true)}
        disabled={selectedIds.length === 0}
      />

      {/* Bulk Tag Dialog */}
      <Dialog
        open={bulkTagDialogOpen}
        onClose={() => setBulkTagDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Tag {selectedIds.length} Selected Videos
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Cat Tags</InputLabel>
            <Select
              multiple
              value={selectedTags}
              onChange={(e) => setSelectedTags(e.target.value as string[])}
              input={<OutlinedInput label="Select Cat Tags" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              {availableTags.map((tag) => (
                <MenuItem key={tag} value={tag}>
                  {tag}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkTagDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleBulkTag} variant="contained">
            Tag Videos
          </Button>
        </DialogActions>
      </Dialog>
    </TopToolbar>
  );
};

// Helper function to format duration
const formatDuration = (seconds: number): string => {
  if (!seconds) return 'Unknown';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Custom video card component for better visualization
const VideoCard = ({ record }: { record: any }) => {
  const [showVideo, setShowVideo] = useState(false);

  if (!record) return null;

  const getVideoTypeIcon = () => {
    if (record.videoType === 'youtube') {
      return <YouTube color="error" />;
    }
    return <CloudQueue color="primary" />;
  };

  const getThumbnailUrl = () => {
    if (record.videoType === 'youtube' && record.videoUrl) {
      // Extract YouTube video ID and create thumbnail URL
      const videoId = record.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      if (videoId && videoId[1]) {
        return `https://img.youtube.com/vi/${videoId[1]}/maxresdefault.jpg`;
      }
    }
    return record.thumbnailUrl || '/images/tux_cat_favicon_1.png';
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Video Thumbnail */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '200px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            overflow: 'hidden',
            mb: 2,
            cursor: 'pointer',
          }}
          onClick={() => setShowVideo(!showVideo)}
        >
          {showVideo && record.videoType !== 'youtube' ? (
            <video
              src={record.videoUrl}
              controls
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <>
              <img
                src={getThumbnailUrl()}
                alt={record.fileName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/tux_cat_favicon_1.png';
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  borderRadius: '50%',
                  p: 1,
                }}
              >
                <PlayArrow sx={{ color: 'white', fontSize: '2rem' }} />
              </Box>
              {/* Video type indicator */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '4px',
                  p: 0.5,
                }}
              >
                {getVideoTypeIcon()}
              </Box>
              {/* Duration indicator */}
              {record.duration && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    px: 1,
                    py: 0.5,
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                >
                  {formatDuration(record.duration)}
                </Box>
              )}
            </>
          )}
        </Box>

        {/* Video Info */}
        <Typography variant="h6" component="h3" sx={{ fontSize: '16px', mb: 1 }}>
          {record.fileName}
        </Typography>

        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
          Uploaded: {new Date(record.uploadDate).toLocaleDateString()}
        </Typography>        <Box sx={{ mb: 2 }}>
          {(!record.tags || record.tags.length === 0) ? (
            <Chip label="Needs Tagging" color="warning" size="small" />
          ) : (
            <Chip label="Tagged" color="success" size="small" />
          )}
          <Chip
            label={record.videoType === 'youtube' ? 'YouTube' : 'Storage'}
            size="small"
            variant="outlined"
            sx={{ ml: 1 }}
          />
        </Box>

        {/* File size and duration info */}
        <Box sx={{ mb: 2, fontSize: '12px', color: 'text.secondary' }}>
          {record.duration && (
            <Typography variant="caption" display="block">
              Duration: {formatDuration(record.duration)}
            </Typography>
          )}
          {record.fileSize && (
            <Typography variant="caption" display="block">
              Size: {(record.fileSize / 1024 / 1024).toFixed(1)} MB
            </Typography>
          )}
        </Box>

        {/* Tags */}
        <Box sx={{ mb: 2 }}>
          {record.tags && record.tags.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {record.tags.map((tag: string, index: number) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '10px' }}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No tags
            </Typography>
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
          <EditButton record={record} />
          {record.videoType === 'youtube' && (
            <IconButton
              size="small"
              onClick={() => window.open(record.videoUrl, '_blank')}
              title="Open in YouTube"
            >
              <YouTube />
            </IconButton>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// Custom grid component to display videos
const VideoGrid = () => {
  const { data, isLoading } = useListContext();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Loading videos...</Typography>
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography color="textSecondary">No videos found</Typography>
      </Box>
    );
  }

  return (    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
      {data.map((record: any) => (
        <Box key={record.id}>
          <VideoCard record={record} />
        </Box>
      ))}
    </Box>
  );
};

// Main VideoList component
const VideoList = () => (
  <List
    filters={<VideoFilter />}
    actions={<VideoListActions />}
    perPage={20}
    sort={{ field: 'uploadDate', order: 'DESC' }}
  >
    <Box sx={{ p: 3 }}>
      <VideoGrid />
    </Box>
  </List>
);

export default VideoList;
