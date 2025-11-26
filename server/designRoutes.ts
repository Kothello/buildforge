import { Router } from 'express';
import { db } from './db';
import { buildingDesigns, insertBuildingDesignSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/designs
 * Get all building designs
 */
router.get('/', async (req, res) => {
  try {
    const designs = await db.select().from(buildingDesigns);
    res.json(designs);
  } catch (error) {
    console.error('Failed to fetch designs:', error);
    res.status(500).json({ error: 'Failed to fetch designs' });
  }
});

/**
 * GET /api/designs/:id
 * Get a single building design
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const design = await db
      .select()
      .from(buildingDesigns)
      .where(eq(buildingDesigns.id, id));

    if (design.length === 0) {
      return res.status(404).json({ error: 'Design not found' });
    }

    res.json(design[0]);
  } catch (error) {
    console.error('Failed to fetch design:', error);
    res.status(500).json({ error: 'Failed to fetch design' });
  }
});

/**
 * POST /api/designs
 * Create a new building design
 */
router.post('/', async (req, res) => {
  try {
    const validatedData = insertBuildingDesignSchema.parse(req.body);
    const newDesign = await db
      .insert(buildingDesigns)
      .values(validatedData)
      .returning();

    res.status(201).json(newDesign[0]);
  } catch (error) {
    console.error('Failed to create design:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create design' });
    }
  }
});

/**
 * PATCH /api/designs/:id
 * Update a building design
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = insertBuildingDesignSchema.partial().parse(req.body);

    const updatedDesign = await db
      .update(buildingDesigns)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(buildingDesigns.id, id))
      .returning();

    if (updatedDesign.length === 0) {
      return res.status(404).json({ error: 'Design not found' });
    }

    res.json(updatedDesign[0]);
  } catch (error) {
    console.error('Failed to update design:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update design' });
    }
  }
});

/**
 * DELETE /api/designs/:id
 * Delete a building design
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db
      .delete(buildingDesigns)
      .where(eq(buildingDesigns.id, id))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Design not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete design:', error);
    res.status(500).json({ error: 'Failed to delete design' });
  }
});

export default router;
