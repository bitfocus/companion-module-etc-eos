# companion-module-etc-eos

See [HELP.md](./companion/HELP.md) and [LICENSE](./LICENSE)

# ETC Eos Companion Module – Fork with Macro Name Feature

## Macro Name Variable Polling

This module now includes **automatic polling and variable clearing for macro names**. Every 60 seconds, the module:

1. **Clears all macro name variables** (`macro_1_label` to `macro_1500_label`) to ensure outdated names are removed.
2. **Polls the Eos console for all macro names** by sending `/eos/get/macro/{n}` requests for macros 1 through 1500.
3. **Updates the variables** as macro names are received from the console.

### How It Works

- **Variables:**  
  For each macro, a variable named `macro_{n}_label` (e.g., `macro_1_label`, `macro_2_label`, ...) is available.  
  These variables are automatically updated with the macro names as reported by the Eos console.

- **Polling:**  
  Every 60 seconds, all macro name variables are reset to an empty string. Immediately after, the module requests the current names for all macros from the console.

- **Usage in Companion:**  
  You can use these variables in button labels, feedbacks, and actions. For example, display the name of Macro 1 using `$(etc-eos:macro_1_label)`.

### Example: Show Macro Name on a Button

Add a button with the text:
```
Macro 1: $(etc-eos:macro_1_label)
```
This will always show the current name of Macro 1, automatically updated every minute.

### Why This Feature?

- **Keeps macro names up-to-date** even if they are changed on the console.
- **Prevents stale macro names** from being displayed after a macro is deleted or renamed.
- **No manual refresh needed** – the module handles everything in the background.

---

**Note:**  
If you have a large number of macros, the initial update after startup or reconnect may take a few seconds as all names are polled. I use only 20 Macros, so i can't test it with a larger scale of macros.

---

**Enjoy using the new Macro Name feature!**  
For questions or issues, please open an issue on the module’s repository.

