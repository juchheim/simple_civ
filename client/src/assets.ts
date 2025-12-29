

export const unitImages: Record<string, string> = {
    Settler: "/units/Settler.png",
    Scout: "/units/Scout.png",
    SpearGuard: "/units/SpearGuard.png",
    BowGuard: "/units/BowGuard.png",
    Riders: "/units/Riders.png",
    Skiff: "/units/Skiff.png",
    ArmyScout: "/units/ArmyScout.png",
    ArmySpearGuard: "/units/ArmySpearGuard.png",
    ArmyBowGuard: "/units/ArmyBowGuard.png",
    ArmyRiders: "/units/ArmyRiders.png",
    Titan: "/units/Titan.png",
    Landship: "/units/Landship.png",
    Airship: "/units/Airship.png",
    // Native units
    NativeChampion: "/units/NativeChampion.png",
    NativeArcher: "/units/NativeArcher.png",
    // Defensive civ units
    Lorekeeper: "/units/Lorekeeper.png",
    // Siege units
    Trebuchet: "/units/Trebuchet.png",
};

/** Maps internal unit type IDs to user-friendly display names */
export const unitDisplayNames: Record<string, string> = {
    Settler: "Settler",
    Scout: "Scout",
    SpearGuard: "Spear Guard",
    BowGuard: "Bow Guard",
    Riders: "Riders",
    Skiff: "Skiff",
    ArmyScout: "Scout Army",
    ArmySpearGuard: "Spear Guard Army",
    ArmyBowGuard: "Bow Guard Army",
    ArmyRiders: "Riders Army",
    Titan: "Titan",
    Landship: "Landship",
    Airship: "Airship",
    // Native units
    NativeChampion: "Native Champion",
    NativeArcher: "Native Archer",
    // Defensive civ units
    Lorekeeper: "Lorekeeper",
    // Siege units
    Trebuchet: "Trebuchet",
};

/** Get the display name for a unit type, with fallback to the raw type */
export function getUnitDisplayName(unitType: string): string {
    return unitDisplayNames[unitType] || unitType;
}

export const terrainImages: Record<string, string> = {
    Plains: "/terrain/Plains.png",
    Hills: "/terrain/Hills.png",
    Forest: "/terrain/Forest.png",
    Marsh: "/terrain/Marsh.png",
    Desert: "/terrain/Desert.png",
    Mountain: "/terrain/Mountain.png",
    Coast: "/terrain/Coast.png",
    DeepSea: "/terrain/DeepSea.png",
    Fog: "/terrain/Fog.png",
    RiverEdge: "/terrain/RiverEdge.png",
    RiverMouth: "/terrain/RiverMouth.png",
    GoodieHut: "/terrain/GoodieHut.png",
    // Native camp overlays
    NativeCamp: "/terrain/NativeCamp.png",
    ClearedSettlement: "/terrain/ClearedSettlement.png",
};

export const overlayImages: Record<string, string> = {
    Bulwark: "/overlays/Bulwark.png",
};

export const cityImages: Record<number, string> = {
    1: "/cities/city_1.png",
    2: "/cities/city_2.png",
    3: "/cities/city_3.png",
    4: "/cities/city_4.png",
    5: "/cities/city_5.png",
    6: "/cities/city_6.png",
    7: "/cities/city_7.png",
    8: "/cities/city_8.png",
    9: "/cities/city_9.png",
    10: "/cities/city_10.png",
};
