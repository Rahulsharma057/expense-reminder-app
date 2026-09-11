
import { toast } from "react-toastify";

export function showSuccessSequence() {
  toast.success("Expense added successfully");

  setTimeout(() => {
    toast.success("Your expense has been saved");
  }, 2500);

  setTimeout(() => {
    toast.success("Great! Everything is up to date");
  }, 5000);

  setTimeout(() => {
    toast.success("I love you Bhumiii ❤️");
  }, 7500);
}
