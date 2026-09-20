"use client";

import { Autocomplete, TextField } from "@mui/material";

export default function ReasonPicker({ presets, value, onChange, label = "Reason (optional)" }) {
  return (
    <Autocomplete
      freeSolo
      options={presets || []}
      inputValue={value}
      onInputChange={(_e, v) => onChange(v)}
      renderInput={(params) => <TextField {...params} size="small" label={label} placeholder="e.g. Was too tired, No time, Felt motivated" />}
    />
  );
}