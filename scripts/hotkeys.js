import { MODULE_ID } from "./configuration.js";

export function registerHotkey() {
    game.keybindings.register(MODULE_ID, "toggleDisplay", {
        name: "Toggle Announcements",
        hint: "Turns floating announcements on or off without changing any other setting.",
        onDown: () => {
            const active = !game.settings.get(MODULE_ID, "display-toggle");
            game.settings.set(MODULE_ID, "display-toggle", active);
            ui.notifications?.notify(active ? "Announcements are now active." : "Announcements are turned off.");
        },
        restricted: true,
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
    });
}
