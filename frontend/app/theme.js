import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#8B5CF6", dark: "#6D28D9", light: "#A78BFA" },
    secondary: { main: "#EC4899" },
    background: { default: "#0F0D14", paper: "#17141F" },
    text: { primary: "#F2F0F7", secondary: "#A9A3B5" },
    divider: "#2A2635",
    error: { main: "#F87171" },
    success: { main: "#4ADE80" },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: `"Inter", "Roboto", "Helvetica", "Arial", sans-serif`,
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
  },
});

export default theme;