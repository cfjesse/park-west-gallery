const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const VALID_MEDIA = ['acrylic', 'oils', 'pastel', 'charcoal', 'pencil', 'mixed_media', 'watercolor', 'gouache', 'ink', 'digital'];
const VALID_STYLES = ['abstract', 'realism', 'impressionism', 'surrealism', 'art_deco', 'expressionism', 'cubism', 'minimalism', 'pop_art', 'baroque'];
const VALID_STATUSES = ['sold', 'pending', 'ready_for_sale'];

function validateInventoryBody(body, requireAll = true) {
  const errors = [];
  const { artist_name, title, media, style, width_in, height_in, status, price, discount_percent } = body;

  if (requireAll || artist_name !== undefined) {
    if (!artist_name || typeof artist_name !== 'string' || artist_name.trim().length === 0) {
      errors.push('artist_name is required and must be a non-empty string.');
    }
  }
  if (requireAll || title !== undefined) {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      errors.push('title is required and must be a non-empty string.');
    }
  }
  if (requireAll || media !== undefined) {
    if (!VALID_MEDIA.includes(media)) {
      errors.push(`media must be one of: ${VALID_MEDIA.join(', ')}.`);
    }
  }
  if (requireAll || style !== undefined) {
    if (!VALID_STYLES.includes(style)) {
      errors.push(`style must be one of: ${VALID_STYLES.join(', ')}.`);
    }
  }
  if (requireAll || width_in !== undefined) {
    if (typeof width_in !== 'number' || width_in <= 0) {
      errors.push('width_in must be a positive number.');
    }
  }
  if (requireAll || height_in !== undefined) {
    if (typeof height_in !== 'number' || height_in <= 0) {
      errors.push('height_in must be a positive number.');
    }
  }
  if (requireAll || status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}.`);
    }
  }
  if (requireAll || price !== undefined) {
    if (typeof price !== 'number' || price < 1000 || price > 20000) {
      errors.push('price must be a number between 1000 and 20000.');
    }
  }
  if (discount_percent !== undefined && discount_percent !== null) {
    if (!Number.isInteger(discount_percent) || discount_percent < 0 || discount_percent > 30) {
      errors.push('discount_percent must be null or an integer between 0 and 30.');
    }
  }

  return errors;
}

router.get('/', authenticateToken, async (req, res) => {
  const { page = 1, limit = 50, status, media, style, artist_name } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
    return res.status(400).json({ error: 'page must be >= 1 and limit must be between 1 and 200.' });
  }

  const offset = (pageNum - 1) * limitNum;
  const conditions = [];
  const params = [];

  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status filter must be one of: ${VALID_STATUSES.join(', ')}.` });
    }
    conditions.push('status = ?');
    params.push(status);
  }
  if (media) {
    if (!VALID_MEDIA.includes(media)) {
      return res.status(400).json({ error: `media filter must be one of: ${VALID_MEDIA.join(', ')}.` });
    }
    conditions.push('media = ?');
    params.push(media);
  }
  if (style) {
    if (!VALID_STYLES.includes(style)) {
      return res.status(400).json({ error: `style filter must be one of: ${VALID_STYLES.join(', ')}.` });
    }
    conditions.push('style = ?');
    params.push(style);
  }
  if (artist_name) {
    conditions.push('artist_name LIKE ?');
    params.push(`%${artist_name}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows: countRows } = await db.execute({ sql: `SELECT COUNT(*) as count FROM inventory ${where}`, args: params });
  const total = Number(countRows[0].count);

  const { rows: items } = await db.execute({
    sql: `SELECT * FROM inventory ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    args: [...params, limitNum, offset],
  });

  return res.status(200).json({
    data: items,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      total_pages: Math.ceil(total / limitNum),
    },
  });
});

router.get('/:id', authenticateToken, async (req, res) => {
  const { rows } = await db.execute({ sql: 'SELECT * FROM inventory WHERE id = ?', args: [req.params.id] });
  if (!rows[0]) {
    return res.status(404).json({ error: 'Item not found.' });
  }
  return res.status(200).json({ data: rows[0] });
});

router.post(
  '/',
  authenticateToken,
  requireRole('accountant', 'inventory_specialist'),
  async (req, res) => {
    const errors = validateInventoryBody(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const { artist_name, title, media, style, width_in, height_in, status, price, discount_percent } = req.body;
    const id = uuidv4();

    await db.execute({
      sql: `INSERT INTO inventory (id, artist_name, title, media, style, width_in, height_in, status, price, discount_percent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, artist_name.trim(), title.trim(), media, style, width_in, height_in, status, price, discount_percent ?? null],
    });

    const { rows } = await db.execute({ sql: 'SELECT * FROM inventory WHERE id = ?', args: [id] });
    return res.status(201).json({ message: 'Item created.', data: rows[0] });
  }
);

router.put(
  '/:id',
  authenticateToken,
  requireRole('accountant', 'inventory_specialist'),
  async (req, res) => {
    const { rows: existingRows } = await db.execute({ sql: 'SELECT * FROM inventory WHERE id = ?', args: [req.params.id] });
    if (!existingRows[0]) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    const errors = validateInventoryBody(req.body, false);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const fields = ['artist_name', 'title', 'media', 'style', 'width_in', 'height_in', 'status', 'price', 'discount_percent'];
    const updates = [];
    const params = [];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === 'artist_name' || field === 'title') {
          params.push(req.body[field].trim());
        } else {
          params.push(req.body[field]);
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    updates.push(`updated_at = datetime('now')`);
    params.push(req.params.id);

    await db.execute({ sql: `UPDATE inventory SET ${updates.join(', ')} WHERE id = ?`, args: params });

    const { rows: updatedRows } = await db.execute({ sql: 'SELECT * FROM inventory WHERE id = ?', args: [req.params.id] });
    return res.status(200).json({ message: 'Item updated.', data: updatedRows[0] });
  }
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('accountant'),
  async (req, res) => {
    const { rows: existingRows } = await db.execute({ sql: 'SELECT * FROM inventory WHERE id = ?', args: [req.params.id] });
    if (!existingRows[0]) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    await db.execute({ sql: 'DELETE FROM inventory WHERE id = ?', args: [req.params.id] });
    return res.status(200).json({ message: 'Item deleted.', data: existingRows[0] });
  }
);

module.exports = router;
