const dnd5e = {
    hp: "system.attributes.hp.value",
    hpmax: "system.attributes.hp.max",
};

const pf2e = {
    hp: "system.attributes.hp.value",
    hpmax: "system.attributes.hp.max",
};

const PATHS = {
    dnd5e,
    pf2e,
};

export function getActorAttribute(actor, attribute) {
    if (!actor)
        return undefined;
    const system = PATHS[game.system.id];
    const path = system?.[attribute] ?? `system.attributes.hp.${attribute === "hpmax" ? "max" : "value"}`;
    try {
        return foundry.utils.getProperty(actor, path);
    }
    catch {
        return undefined;
    }
}
