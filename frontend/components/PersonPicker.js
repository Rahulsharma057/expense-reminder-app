"use client";

import { useEffect, useState } from "react";
import { Box, Stack, ToggleButtonGroup, ToggleButton, Autocomplete, TextField, Typography } from "@mui/material";
import api from "../lib/api";

export default function PersonPicker({ personType, personUser, personName, onChange }) {
  const [people, setPeople] = useState([]);

  useEffect(() => {
    api.get("/mistakes/people").then((res) => setPeople(res.data || [])).catch(() => {});
  }, []);

  return (
    <Box>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.8 }}>
        WHO
      </Typography>
      <Stack spacing={1}>
        <ToggleButtonGroup
          exclusive fullWidth size="small" value={personType}
          onChange={(_e, v) => v && onChange({ personType: v, personUser: null, personName: "" })}
          sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 700 } }}
        >
          <ToggleButton value="Self">Me</ToggleButton>
          <ToggleButton value="TeamMember">Team Member</ToggleButton>
          <ToggleButton value="Other">Other</ToggleButton>
        </ToggleButtonGroup>

        {personType === "TeamMember" && (
          <Autocomplete
            options={people}
            value={people.find((p) => p._id === personUser) || null}
            getOptionLabel={(u) => u.name}
            isOptionEqualToValue={(a, b) => a._id === b._id}
            onChange={(_e, v) => onChange({ personType, personUser: v?._id || null, personName: v?.name || "" })}
            renderInput={(params) => <TextField {...params} size="small" placeholder="Select team member" />}
          />
        )}

        {personType === "Other" && (
          <TextField
            size="small" placeholder="Name" value={personName}
            onChange={(e) => onChange({ personType, personUser: null, personName: e.target.value })}
          />
        )}
      </Stack>
    </Box>
  );
}