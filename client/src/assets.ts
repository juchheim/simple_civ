import SettlerImg from "../public/units/Settler.png";

// Unit asset imports
import ScoutImg from "../public/units/Scout.png";
// import SpearGuardImg from "../public/units/SpearGuard.png";
// import WarriorImg from "../public/units/Warrior.png";
// Add additional unit imports above as assets are created.

export const unitImages: Record<string, string> = {
    Settler: SettlerImg,
    Scout: ScoutImg,
    // SpearGuard: SpearGuardImg,
    // Warrior: WarriorImg,
    // Add more unit image mappings above as they come online.
};

// Terrain asset imports
import PlainsImg from "../public/terrain/Plains.png";
import HillsImg from "../public/terrain/Hills.png";
import ForestImg from "../public/terrain/Forest.png";
import MarshImg from "../public/terrain/Marsh.png";
import DesertImg from "../public/terrain/Desert.png";
import MountainImg from "../public/terrain/Mountain.png";
import CoastImg from "../public/terrain/Coast.png";
import DeepSeaImg from "../public/terrain/DeepSea.png";
import FogImg from "../public/terrain/Fog.png";

export const terrainImages: Record<string, string> = {
    Plains: PlainsImg,
    Hills: HillsImg,
    Forest: ForestImg,
    Marsh: MarshImg,
    Desert: DesertImg,
    Mountain: MountainImg,
    Coast: CoastImg,
    DeepSea: DeepSeaImg,
    Fog: FogImg,
};

// City asset imports
// City asset imports
import City1Img from "../public/cities/city_1.png";
import City2Img from "../public/cities/city_2.png";
import City3Img from "../public/cities/city_3.png";
import City4Img from "../public/cities/city_4.png";
import City5Img from "../public/cities/city_5.png";
import City6Img from "../public/cities/city_6.png";
import City7Img from "../public/cities/city_7.png";

export const cityImages: Record<number, string> = {
    1: City1Img,
    2: City2Img,
    3: City3Img,
    4: City4Img,
    5: City5Img,
    6: City6Img,
    7: City7Img,
};

