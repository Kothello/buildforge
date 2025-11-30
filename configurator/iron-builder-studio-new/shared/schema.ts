import { pgTable, serial, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod";

// Building Designs table - stores saved building configurations
export const buildingDesigns = pgTable("building_designs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  
  // Dimensions
  width: integer("width").notNull().default(30),
  length: integer("length").notNull().default(40),
  height: integer("height").notNull().default(12),
  
  // Colors
  wallColor: varchar("wall_color", { length: 50 }).notNull().default("#8B4513"),
  roofColor: varchar("roof_color", { length: 50 }).notNull().default("#4A4A4A"),
  trimColor: varchar("trim_color", { length: 50 }).notNull().default("#FFFFFF"),
  
  // Roof configuration
  roofStyle: varchar("roof_style", { length: 50 }).notNull().default("gable"),
  roofPitch: integer("roof_pitch").notNull().default(3),
  
  // Lean-to configuration
  hasLeanTo: boolean("has_lean_to").notNull().default(false),
  leanToWidth: integer("lean_to_width").default(10),
  leanToSide: varchar("lean_to_side", { length: 20 }).default("left"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schema for validation
export const insertBuildingDesignSchema = createInsertSchema(buildingDesigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type BuildingDesign = typeof buildingDesigns.$inferSelect;
export type InsertBuildingDesign = z.infer<typeof insertBuildingDesignSchema>;
