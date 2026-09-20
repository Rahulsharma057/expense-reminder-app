"use client";

import { useState } from "react";
import { TableRow, TableCell, Checkbox, TextField, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../lib/api";

export default function ShoppingItemRow({ listId, item, onUpdated, onDeleted }) {
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [estimatedPrice, setEstimatedPrice] = useState(item.estimatedPrice);
  const [actualPrice, setActualPrice] = useState(item.actualPrice);

  const patch = async (fields) => {
    try {
      const res = await api.patch(`/shopping/${listId}/items/${item._id}`, fields);
      onUpdated?.(res.data);
    } catch { /* ignore */ }
  };

  const togglePurchased = () => patch({ purchased: !item.purchased });
  const remove = async () => {
    const res = await api.delete(`/shopping/${listId}/items/${item._id}`);
    onDeleted?.(res.data);
  };

  return (
    <TableRow sx={{ opacity: item.purchased ? 0.55 : 1 }}>
      <TableCell padding="checkbox"><Checkbox checked={item.purchased} onChange={togglePurchased} size="small" /></TableCell>
      <TableCell>
        <TextField variant="standard" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => patch({ name })} InputProps={{ disableUnderline: true, sx: { fontSize: 13.5, textDecoration: item.purchased ? "line-through" : "none" } }} fullWidth />
      </TableCell>
      <TableCell sx={{ width: 90 }}>
        <TextField variant="standard" value={quantity} onChange={(e) => setQuantity(e.target.value)} onBlur={() => patch({ quantity })} InputProps={{ disableUnderline: true, sx: { fontSize: 13 } }} fullWidth />
      </TableCell>
      <TableCell sx={{ width: 100 }}>
        <TextField variant="standard" type="number" value={estimatedPrice} onChange={(e) => setEstimatedPrice(e.target.value)} onBlur={() => patch({ estimatedPrice })} InputProps={{ disableUnderline: true, sx: { fontSize: 13 } }} fullWidth />
      </TableCell>
      <TableCell sx={{ width: 100 }}>
        <TextField variant="standard" type="number" value={actualPrice} onChange={(e) => setActualPrice(e.target.value)} onBlur={() => patch({ actualPrice })} InputProps={{ disableUnderline: true, sx: { fontSize: 13, color: "#F87171" } }} fullWidth />
      </TableCell>
      <TableCell padding="checkbox"><IconButton size="small" onClick={remove}><DeleteIcon fontSize="small" /></IconButton></TableCell>
    </TableRow>
  );
}