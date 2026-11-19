/**
 * Every visual encoding in one place: an icon, a canvas shape and a colour for each kind of entity,
 * a family for each mood, and the line style that goes with it. Keyed by the same strings the data uses.
 * Shape and colour always travel together, and the text label always goes with them, so colour never works alone.
 */
import {
  Box,
  CircleCheck,
  CircleHelp,
  CircleSlash,
  Cloud,
  Dot,
  Gem,
  MapPin,
  MessageSquareQuote,
  SearchX,
  Sun,
  Target,
  TriangleAlert,
  User,
  Users,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import type { Mood } from "./types";

export const CLASS_ORDER = ["Person", "Group", "Deity", "Place", "Object", "Material", "Food", "Other"] as const;
export type Shape = "circle" | "square" | "hexagon" | "triangle" | "diamond" | "pentagon" | "down" | "dot";

// Light and dark values, each at least 3:1 against its own background. They differ in lightness as well as hue
// (light mode, L* from 30 for Person to 60 for Deity; dark mode the reverse), so the classes still part in greyscale.
export const CLASS_STYLE: Record<string, { icon: LucideIcon; shape: Shape; light: string; dark: string }> = {
  Person: { icon: User, shape: "circle", light: "#154C60", dark: "#BADDEA" },
  Group: { icon: Users, shape: "square", light: "#5F9838", dark: "#689941" },
  // A plain radiant disc: the epics are Jain and Buddhist works with Hindu gods in them, so no one tradition's symbol.
  Deity: { icon: Sun, shape: "hexagon", light: "#B58800", dark: "#9A7B1A" },
  Place: { icon: MapPin, shape: "triangle", light: "#65468A", dark: "#D1BFE8" },
  Object: { icon: Box, shape: "diamond", light: "#AA3C5E", dark: "#EAA2B8" },
  Material: { icon: Gem, shape: "pentagon", light: "#65747E", dark: "#9BA8B1" },
  Food: { icon: Wheat, shape: "down", light: "#AD7136", dark: "#C88B51" },
  Other: { icon: Dot, shape: "dot", light: "#7A756D", dark: "#A39D93" },
};
export const classStyle = (cls: string) => CLASS_STYLE[cls] ?? CLASS_STYLE.Other;
export const classColour = (cls: string, dark: boolean) => classStyle(cls)[dark ? "dark" : "light"];

/** The anklet nodes get their own drawing, since the anklet is the object the first epic turns on. */
export const isAnklet = (id: string) => /^ank_|anklet/.test(id);

export type Family = "happened" | "said" | "wanted" | "imagined";
export const MOOD_FAMILY: Record<Mood, Family> = {
  asserted: "happened",
  claimed: "said",
  predicted: "said",
  address: "said",
  question: "said",
  negated: "said",
  command: "wanted",
  intended: "wanted",
  wish: "wanted",
  metaphor: "imagined",
  dreamed: "imagined",
  conditional: "imagined",
  thought: "imagined",
};
export const familyOf = (mood: string): Family => MOOD_FAMILY[mood as Mood] ?? "said";
export const FAMILY: Record<Family, { icon: LucideIcon; dash: number[]; en: string; ta: string }> = {
  happened: { icon: CircleCheck, dash: [], en: "Happened", ta: "நிகழ்ந்தது" },
  said: { icon: MessageSquareQuote, dash: [6, 4], en: "Said or claimed", ta: "கூறப்பட்டது" },
  wanted: { icon: Target, dash: [9, 3, 2, 3], en: "Wanted or ordered", ta: "விரும்பியது / ஆணையிட்டது" },
  imagined: { icon: Cloud, dash: [1, 4], en: "Imagined or believed", ta: "கற்பனை / நம்பிக்கை" },
};
export const dashArray = (f: Family) => FAMILY[f].dash.join(" ");

export const CautionIcon = TriangleAlert;

export type AnswerKind = "answered" | "not_stated" | "closest" | "none";
export const ANSWER_ICON: Record<AnswerKind, LucideIcon> = {
  answered: CircleCheck,
  not_stated: CircleHelp,
  closest: SearchX,
  none: CircleSlash,
};
