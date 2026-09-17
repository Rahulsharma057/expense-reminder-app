"use client";

import { useEffect, useState } from "react";
import { Autocomplete, TextField, Chip, Box, Typography } from "@mui/material";
import api from "../lib/api";

export default function AssigneePicker({ selectedIds, onChange }) {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    api.get("/checklists/assignable-users").then((res) => setOptions(res.data || [])).catch(() => {});
  }, []);

  const selectedUsers = options.filter((u) => selectedIds.includes(u._id));

  return (
    <Box>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.8 }}>
        ASSIGN TO
      </Typography>
      <Autocomplete
        multiple
        options={options}
        value={selectedUsers}
        getOptionLabel={(u) => u.name}
        isOptionEqualToValue={(a, b) => a._id === b._id}
        onChange={(_e, value) => onChange(value.map((u) => u._id))}
        renderTags={(value, getTagProps) =>
          value.map((u, index) => <Chip label={u.name} size="small" {...getTagProps({ index })} key={u._id} />)
        }
        renderInput={(params) => <TextField {...params} placeholder="Select people to assign" />}
      />
    </Box>
  );
}