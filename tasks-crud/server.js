require('dotenv').config(); //ability to read from .env
const express = require('express');
const cors = require('cors');   //middleman to allow frontend and backend connection
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());    //ability to read from json

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

pool.connect()
  .then(() => console.log('✅ DB connected'))
  .catch(err => {
    console.error('❌ DB connection error:', err.stack);
    process.exit(1);
  });

  process.on('uncaughtException', err => {
    console.error('Uncaught Exception:', err);
  });
  process.on('unhandledRejection', err => {
    console.error('Unhandled Rejection:', err);
  });

//Routes

app.get('/tasks', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });
  
  // GET /tasks/:id  -> single task
  app.get('/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
      const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'task not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch task' });
    }
  });
  
  // POST /tasks  -> create a task
  app.post('/tasks', async (req, res) => {
    const { title, content } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
  
    try {
      const { rows } = await pool.query(
        'INSERT INTO tasks (title, content) VALUES ($1, $2) RETURNING *',
        [title, content || null]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });
  
  // PUT /tasks/:id  -> update a task
  app.put('/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { title, content } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
  
    try {
      const { rows } = await pool.query(
        'UPDATE tasks SET title = $1, content = $2 WHERE id = $3 RETURNING *',
        [title, content || null, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'task not found' });
      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });
  
  // DELETE /tasks/:id
  app.delete('/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
      const { rows } = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'task not found' });
      res.json({ message: 'Deleted', task: rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });
  
  // health
  app.get('/', (req, res) => res.send('Task Master API running'));
  
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server listening on ${port}`));