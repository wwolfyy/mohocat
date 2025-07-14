"use client";

import React, { useState } from "react";
import {
  List,
  Datagrid,
  TextField,
  ImageField,
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
} from "react-admin";
import {
  Card,
  CardContent,
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
} from "@mui/material";

// Custom filter for images
const ImageFilter = (props: any) => (
  <Filter {...props}>
    <TextInput source="fileName" label="File Name" />
    <SelectInput
      source="tags"
      label="Contains Tag"
      choices={[
        // We'll populate this with actual cat names from Firestore
        { id: "개똥이", name: "개똥이" },
        { id: "깡패", name: "깡패" },
        { id: "꽃분이", name: "꽃분이" },
        { id: "누렁이", name: "누렁이" },
        // Add more cats as needed
      ]}
    />
  </Filter>
);

// Custom list actions with bulk tagging
const ImageListActions = () => {
  const [bulkTagDialogOpen, setBulkTagDialogOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { selectedIds } = useListContext();
  const [updateMany] = useUpdateMany();
  const notify = useNotify();
  const refresh = useRefresh();

  const availableTags = [
    "개똥이",
    "깡패",
    "꽃분이",
    "누렁이",
    "대장이",
    "땅콩이",
    "뚜껑이",
    "마니",
    "메리",
    "블타",
    "삼숙이",
    "삼순이",
    "송이",
    "순돌이",
    "아들조로",
    "아롱이",
    "알콩이",
    "엄마조로",
    "예쁜이",
    "예쁜이엄마",
    "점돌이",
    "점순이",
    "정상노랑이",
    "찰리",
    "초롱이",
    "코순이",
    "판다",
    "팔랑이",
    "팔봉이",
    "팔봉이친구",
    "하느재노랑이",
    "하얀코",
  ];

  const handleBulkTag = async () => {
    if (selectedIds.length === 0) {
      notify("Please select images to tag", { type: "warning" });
      return;
    }
    try {
      await updateMany("images", {
        ids: selectedIds,
        data: {
          tags: selectedTags,
          lastTaggedAt: new Date(),
        },
      });

      notify(`Tagged ${selectedIds.length} images`, { type: "success" });
      setBulkTagDialogOpen(false);
      setSelectedTags([]);
      refresh();
    } catch (error) {
      notify("Error tagging images", { type: "error" });
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
        <DialogTitle>Tag {selectedIds.length} Selected Images</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Cat Tags</InputLabel>
            <Select
              multiple
              value={selectedTags}
              onChange={(e) => setSelectedTags(e.target.value as string[])}
              input={<OutlinedInput label="Select Cat Tags" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
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
          <Button onClick={() => setBulkTagDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBulkTag} variant="contained">
            Tag Images
          </Button>
        </DialogActions>
      </Dialog>
    </TopToolbar>
  );
};

// Custom image row component for better visualization
const ImageRow = () => {
  const record = useRecordContext();

  if (!record) return null;

  return (
    <Card sx={{ margin: 1 }}>
      <CardContent>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 33.33%', minWidth: '200px' }}>
            <img
              src={record.imageUrl}
              alt={record.fileName}
              style={{
                width: "100%",
                height: "200px",
                objectFit: "cover",
                borderRadius: "8px",
              }}
            />
          </div>
          <div style={{ flex: '1', minWidth: '300px' }}>
            <Box>
              <h3 style={{ margin: "0 0 8px 0" }}>{record.fileName}</h3>{" "}
              <p style={{ margin: "4px 0", fontSize: "14px", color: "#666" }}>
                Uploaded: {new Date(record.uploadDate).toLocaleDateString()}
              </p>
              {!record.tags || record.tags.length === 0 ? (
                <Chip label="Needs Tagging" color="warning" size="small" />
              ) : (
                <Chip label="Tagged" color="success" size="small" />
              )}
              <Box sx={{ mt: 1 }}>
                {record.tags && record.tags.length > 0 ? (
                  record.tags.map((tag: string, index: number) => (
                    <Chip
                      key={index}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))
                ) : (
                  <span style={{ fontSize: "14px", color: "#999" }}>
                    No tags
                  </span>
                )}
              </Box>
              <Box sx={{ mt: 2 }}>
                <EditButton />
                <ShowButton />
              </Box>
            </Box>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main ImageList component
const ImageList = () => (
  <List
    filters={<ImageFilter />}
    actions={<ImageListActions />}
    perPage={25}
    sort={{ field: "uploadDate", order: "DESC" }}
  >
    <Box sx={{ padding: 2 }}>
      {/* Grid view for better image visualization */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {/* We'll use a custom iterator here */}
        <ImageGrid />
      </div>
    </Box>
  </List>
);

// Custom grid component to display images
const ImageGrid = () => {
  const { data, isLoading } = useListContext();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
      {data?.map((record: any) => (
        <Card key={record.id}>
          <CardContent>
            <img
              src={record.imageUrl}
              alt={record.fileName}
              style={{
                width: "100%",
                height: "200px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  marginBottom: "8px",
                }}
              />
              <h4 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>
                {record.fileName}
              </h4>{" "}
              <p style={{ margin: "4px 0", fontSize: "12px", color: "#666" }}>
                {new Date(record.uploadDate).toLocaleDateString()}
              </p>
              {!record.tags || record.tags.length === 0 ? (
                <Chip label="Needs Tagging" color="warning" size="small" />
              ) : (
                <Chip label="Tagged" color="success" size="small" />
              )}
              <Box sx={{ mt: 1 }}>
                {record.tags && record.tags.length > 0 ? (
                  record.tags.map((tag: string, index: number) => (
                    <Chip
                      key={index}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5, fontSize: "10px" }}
                    />
                  ))
                ) : (
                  <span style={{ fontSize: "12px", color: "#999" }}>
                    No tags
                  </span>
                )}
              </Box>
              <Box sx={{ mt: 1 }}>
                <EditButton record={record} />
              </Box>
            </CardContent>
          </Card>
      ))}
    </div>
  );
};

export default ImageList;
