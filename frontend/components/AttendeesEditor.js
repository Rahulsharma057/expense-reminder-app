"use client";

import { useEffect, useState } from "react";
import { Box, Stack, TextField, Autocomplete, Chip, Typography, Button, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import api from "../lib/api";

export default function AttendeesEditor({ attendees, onChange }) {
  const [internalOptions, setInternalOptions] = useState([]);
  const [extName, setExtName] = useState("");
  const [extPhone, setExtPhone] = useState("");
  const [extEmail, setExtEmail] = useState("");

  useEffect(() => {
    api.get("/checklists/assignable-users").then((res) => setInternalOptions(res.data || [])).catch(() => {});
  }, []);

  const internalSelected = attendees.filter((a) => !a.isExternal);
  const externalSelected = attendees.filter((a) => a.isExternal);

  const handleInternalChange = (_e, values) => {
    const newInternal = values.map((v) => ({ name: v.name, email: "", phone: "", isExternal: false, user: v._id }));
    onChange([...newInternal, ...externalSelected]);
  };

  const addExternal = () => {
    if (!extName.trim()) return;
    onChange([...attendees, { name: extName.trim(), phone: extPhone.trim(), email: extEmail.trim(), isExternal: true, user: null }]);
    setExtName(""); setExtPhone(""); setExtEmail("");
  };

  const removeAttendee = (index) => onChange(attendees.filter((_, i) => i !== index));

  return (
    <Box>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.8 }}>
        WITH WHOM (ATTENDEES)
      </Typography>

      <Autocomplete
        multiple
        options={internalOptions}
        value={internalOptions.filter((o) => internalSelected.some((s) => s.user === o._id))}
        getOptionLabel={(u) => u.name}
        isOptionEqualToValue={(a, b) => a._id === b._id}
        onChange={handleInternalChange}
        renderTags={(value, getTagProps) => value.map((u, i) => <Chip label={u.name} size="small" {...getTagProps({ index: i })} key={u._id} />)}
        renderInput={(params) => <TextField {...params} size="small" placeholder="Select from your team" />}
      />

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.2, mb: 0.6 }}>
        Bahar se koi aaya hai? Yahan add karo:
      </Typography>
      <Stack direction="row" spacing={1}>
        <TextField size="small" placeholder="Name" value={extName} onChange={(e) => setExtName(e.target.value)} sx={{ flex: 1.2 }} />
        <TextField size="small" placeholder="Phone" value={extPhone} onChange={(e) => setExtPhone(e.target.value)} sx={{ flex: 1 }} />
        <TextField size="small" placeholder="Email" value={extEmail} onChange={(e) => setExtEmail(e.target.value)} sx={{ flex: 1 }} />
        <IconButton size="small" onClick={addExternal} disabled={!extName.trim()} sx={{ border: "1px solid", borderColor: "divider" }}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>

      {externalSelected.length > 0 && (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {attendees.map((a, index) =>
            a.isExternal ? (
              <Chip
                key={index}
                label={`${a.name} (Guest)`}
                size="small"
                onDelete={() => removeAttendee(index)}
                sx={{ bgcolor: "rgba(251,146,60,0.15)", color: "#FB923C", fontWeight: 650 }}
              />
            ) : null
          )}
        </Stack>
      )}
    </Box>
  );
}